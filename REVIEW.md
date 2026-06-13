# AgencyOS — change review brief

A handoff for reviewing the client-meeting feature work. Covers what changed, where,
the design decisions, what's already verified, and what to scrutinize.

## Context
Next.js (App Router, React 19) + cloud Supabase (Postgres + RLS + Storage).
Migrations are applied **manually via the Supabase SQL editor** (no automated runner),
so each is idempotent and ends with `notify pgrst, 'reload schema';`. Work was driven
by a client meeting and implemented in phases.

## Migrations added (`supabase/migrations/`)
| File | Purpose |
|---|---|
| `0012_project_credentials.sql` | `client_credentials.project_id` (FK) + backfill — credentials move client → project |
| `0013_client_city.sql` | `clients.city` NOT NULL (backfilled `'Unknown'`) |
| `0014_project_type.sql` | `projects.project_type text` |
| `0015_client_project_fields.sql` | enum `lifecycle_kind('new','old')`; clients: `province`, `country`, `client_kind`, `web_archive_links text[]`, `last_website_notes`; projects: `project_kind` |
| `0016_client_attachments.sql` | `client_attachments` table + RLS + storage policies (`clients/` prefix) |
| `0017_task_workflow.sql` | `tasks.stage`, `tasks.step_order` |
| `0018_project_communications.sql` | `communications` table + RLS + storage policies (`communications/` prefix). **Overwrote a pre-existing privacy-first 0018** (manual summary, no ASR) per an explicit user decision to use Sarvam |
| `0019_communication_job_id.sql` | `communications.transcript_job_id` (for serverless start-then-poll) |

**Apply status:** 0012–0018 applied to cloud; **0019 pending** at time of writing.

## Phase 1 — client/project fields
- **Credentials → project level.** `CredentialsVault` now renders on the project page
  (`project-detail-view.tsx`), removed from the client page; `add-client-dialog` lost the
  WP/hosting fields; `new-project-dialog` gained optional WP creds; `addCredentialAction`
  takes `project_id`.
- **Mandatory City + Province/Country.** `formatLocation()` in `lib/constants.ts` →
  "City, Province, Country"; shown on client cards, detail header/Details, and search.
  Enforced required in both client dialogs + server actions.
- **New/Old flags** (clients + projects) via `LifecycleToggle`
  (`components/clients/client-fields.tsx`).
- **Web-archive links (≤5)** via `WebArchiveLinksInput`; **last-website notes** textarea;
  both shown in a "Previous website" panel.
- **Project type dropdown + "Other"** (custom text) in `new/edit-project-dialog.tsx`;
  `PROJECT_TYPES` constant.
- Touched: `lib/types.ts`, `lib/constants.ts`, both `actions.ts`, the dialogs,
  `clients-view.tsx`, `projects-view.tsx`, both `[id]/page.tsx`, `lib/projects.ts`,
  `seed.sql`, `icon.tsx` (added `pin`).

## Phase 2 — client attachments
- `client_attachments` table; actions `createClientUploadUrlAction` /
  `recordClientAttachmentAction` / `deleteClientAttachmentAction` (signed-upload-URL
  pattern, files under `clients/{id}/`); `components/clients/client-attachments.tsx`;
  rendered on client detail with signed download URLs.

## Phase 3 — standard website task pipeline
- `WEBSITE_WORKFLOW` (8 ordered stages, each with a default category) in
  `lib/constants.ts`.
- `generateWorkflowAction` (`projects/actions.ts`) — creates one `todo` task per stage;
  **idempotent per stage** (filters stages already present).
- "Generate workflow" button (managers only, hidden once a workflow exists) in
  `project-detail-view.tsx`; "Step N" pill on `kanban-card.tsx`; tasks ordered by
  `step_order`.

## Phase 4 — communications (recorded calls + Sarvam transcription)
- `communications` table; record via `lib/audio/wav-recorder.ts` (mic → 16 kHz mono
  **WAV**, chosen to avoid webm/opus codec issues for both playback and ASR) **or**
  upload an audio file; playback via signed URL.
- **Sarvam adapter** `lib/transcription/sarvam.ts` (server-only): `saaras:v3` batch job;
  language hint maps to `languageCode` + `mode` (incl. **`codemix`** for
  Punjabi/Hindi/English); summary via `sarvam-m`. Vendor chosen for **Punjabi accuracy**.
- **Serverless-safe (Vercel): start-then-poll**, not awaited, not a webhook.
  `startTranscriptionJob` returns a job id; `fetchTranscriptionResult` checks `job_state`
  and downloads the transcript when `Completed`. Actions:
  `startCommunicationTranscriptionAction` / `pollCommunicationTranscriptionAction` /
  `updateCommunicationAction` (editable transcript+summary) / `deleteCommunicationAction`.
  UI polls every 8s while `processing`; reopening the page resumes polling.
- `components/projects/communications-panel.tsx`; added `sarvamai` dependency;
  `SARVAM_API_KEY` (server-only, in `.env.local`, gitignored).

## Verification already done (live, in-browser)
- **Phases 1–3:** fully verified (location renders "Toronto, Ontario, Canada"; New/Old
  badges; archive links; client attachment upload→download(200)→delete; workflow
  generates 8 ordered tasks; idempotent button gating).
- **Phase 4:** verified with the **awaited** version against the real key — upload →
  Sarvam batch ran → status reached **Transcribed**; signed playback worked; **editable
  transcript saved Gurmukhi text** and flagged "(edited)"; delete worked. **The start-poll
  refactor (0019) is typecheck/lint-clean but not yet runtime-verified** (needs 0019
  applied).

## Please scrutinize (highest-value review targets)
1. **RLS + storage policies** on `client_attachments` and `communications`: the
   `(storage.foldername(name))[1]` prefix checks and `[2]::uuid` project-id extraction;
   that the new permissive storage policies correctly OR with the existing task ones
   without widening access elsewhere. Confirm `is_staff()` / `can_manage_work()`
   (managers = pa/admin; CEO read-only) usage is consistent.
2. **Serverless timing** of `startCommunicationTranscriptionAction`: it downloads audio
   from Supabase **and** uploads it to Sarvam within one request. Large/long WAVs
   (~115 MB/hr) could approach Vercel's function limit on the *start* step. Worth a
   load/size sanity check; consider streaming or a size cap.
3. **Poll loop** in `communications-panel.tsx`: dependency on `processingKey`, interval
   cleanup, and the "reopen resumes polling" path. Check for duplicate intervals / race
   on `router.refresh()`.
4. **Migration-gap fragility:** queries select new columns before a migration is applied
   (e.g. `getProjectsMeta` selects `project_kind`; tasks order by `step_order`) — these
   break the page until the matching migration runs. Only `web_archive_links` got a
   defensive guard. Decide if more guards or a migrate-before-deploy gate is wanted.
5. **`generateWorkflowAction` idempotency** under concurrency (two clicks).
6. **Temp-file usage** in the Sarvam adapter (`/tmp` on serverless) — cleanup in
   `finally`, and `downloadOutputs` dir handling.
7. **Security:** `SARVAM_API_KEY` was shared in plaintext and must be **rotated**;
   `.env.local` also holds an `sb_secret_…` service key (pre-existing). Confirm
   `lib/transcription/sarvam.ts` is `server-only` and never bundled client-side.

## Outstanding
- Run **0019**, then runtime-verify the start-poll loop.
- Deferred by decision: **speaker diarization** (Sarvam supports `withDiarization`) and
  **email↔project linking**.
- Real-voice smoke test (Punjabi/Hindi accuracy + summary quality) — only a live mic
  recording shows this; automation used a tone.
