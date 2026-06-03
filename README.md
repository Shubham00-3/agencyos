# AgencyOS

Internal project-management & collaboration workspace for a web-development
agency. Replaces scattered communication with one place where the team
coordinates every website build:

- **CEO** — full overview and operational access across the workspace.
- **PA** — adds clients, creates & assigns tasks, stores credentials, monitors everyone.
- **Designer / Developer / Copywriter** — see only their assigned work, upload files, update status.
- **System Admin** — full access incl. credentials; takes finished sites live.

Lead generation lives elsewhere (GoHighLevel) — a client only enters AgencyOS
once their deal has closed.

## Tech stack

- **Next.js 16** (App Router, TypeScript), **Tailwind v4**, **shadcn/ui** (Base UI).
- **Supabase** — Postgres, Auth (email/password), Storage, Row-Level Security.

## Connect a (cloud) Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. **Project Settings → API**, copy the values into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_DEMO_MODE=true
   ```
3. In the Supabase dashboard **SQL editor**, run these files **in order**:
   1. `supabase/migrations/0001_init.sql` — tables, helper functions, RLS, storage bucket.
   2. `supabase/migrations/0002_credentials_perms.sql` — credential policy hardening.
   3. `supabase/migrations/0003_readonly_ceo_storage_scope.sql` — scoped attachment storage.
   4. `supabase/migrations/0004_task_uploaded_status.sql` — adds the Uploaded task state.
   5. `supabase/migrations/0005_move_uploaded_tasks.sql` — migrates legacy task review states.
   6. `supabase/seed.sql` — 6 demo users (one per role) + demo clients/projects/tasks.

   > Run each whole file in the SQL editor (not piecemeal) so the dollar-quoted
   > functions parse correctly.
4. `npm install && npm run dev` → open http://localhost:3000.

### Demo accounts (password: `password123`)

| Role | Email |
| --- | --- |
| CEO | ceo@agencyos.test |
| Personal Assistant | pa@agencyos.test |
| Designer | designer@agencyos.test |
| Developer | developer@agencyos.test |
| Copywriter | copywriter@agencyos.test |
| System Admin | admin@agencyos.test |

With `NEXT_PUBLIC_DEMO_MODE=true` the login screen shows one-click role buttons,
and the sidebar has a **"switch role"** dropdown that re-authenticates as the
matching account — so you can demo every view. Set it to `false` for production.

## Roles & access

Access is enforced by **Postgres Row-Level Security**, not just hidden in the UI:

- Staff (CEO / PA / Admin) — full read/write on clients, projects, tasks, and credentials.
- Contributors — read only the projects they're a member of, update only tasks
  assigned to them, upload files; **no credential access**.
- Only Admin can flip a project to **Live**.

## Project structure

```
app/(app)/        dashboard, clients, projects, tasks, team (+ server actions)
app/login/        auth screen
components/        app shell, projects hub, clients vault, shared UI
lib/              supabase clients, auth, permissions, types, constants
supabase/         migration + seed SQL
```

## Deploy

Push to GitHub and import into **Vercel** (free). Add the same env vars in the
Vercel project settings. Set `NEXT_PUBLIC_DEMO_MODE=false` for the real launch.
