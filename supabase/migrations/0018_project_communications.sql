-- Communication log per project: client calls / meetings captured as an audio
-- recording (or uploaded audio file). Audio lives in the private 'attachments'
-- bucket under a communications/{projectId}/ prefix. Each recording is
-- transcribed + summarised via Sarvam (Indian-language ASR, strong on Punjabi /
-- Hindi / code-mixed speech); `transcript_status` tracks that async pipeline and
-- `transcript_edited` flags a human-corrected transcript.

create table if not exists communications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null default 'call',
  title text,
  audio_path text,
  duration_seconds int,
  language_hint text not null default 'unknown',
  transcript text,
  transcript_edited boolean not null default false,
  transcript_status text not null default 'none',
  summary text,
  occurred_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Additive upgrade path: if an earlier shape of this table already exists,
-- bring it up to the full column set (keeps the migration safe to re-run).
alter table communications add column if not exists duration_seconds int;
alter table communications add column if not exists language_hint text not null default 'unknown';
alter table communications add column if not exists transcript text;
alter table communications add column if not exists transcript_edited boolean not null default false;
alter table communications add column if not exists transcript_status text not null default 'none';
alter table communications add column if not exists summary text;
alter table communications alter column title drop not null;

create index if not exists communications_project_id_idx
  on communications (project_id, occurred_at desc);

alter table communications enable row level security;

drop policy if exists comm_select on communications;
drop policy if exists comm_insert on communications;
drop policy if exists comm_update on communications;
drop policy if exists comm_delete on communications;

-- View: staff or anyone on the project. Add: managers or project members
-- (acting as themselves). Edit/delete: managers or the original author.
create policy comm_select on communications for select to authenticated
  using (is_staff() or is_project_member(project_id));
create policy comm_insert on communications for insert to authenticated
  with check (
    (can_manage_work() or is_project_member(project_id))
    and created_by = auth.uid()
  );
create policy comm_update on communications for update to authenticated
  using (can_manage_work() or created_by = auth.uid())
  with check (can_manage_work() or created_by = auth.uid());
create policy comm_delete on communications for delete to authenticated
  using (can_manage_work() or created_by = auth.uid());

-- Storage policies (permissive, OR together with the existing task/client ones)
-- scoped to the communications/ prefix. The project id is the 2nd path segment.
drop policy if exists comm_storage_select on storage.objects;
drop policy if exists comm_storage_insert on storage.objects;
drop policy if exists comm_storage_delete on storage.objects;

create policy comm_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = 'communications'
    and (
      is_staff()
      or is_project_member(((storage.foldername(name))[2])::uuid)
    )
  );

create policy comm_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = 'communications'
    and (
      can_manage_work()
      or is_project_member(((storage.foldername(name))[2])::uuid)
    )
  );

create policy comm_storage_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = 'communications'
    and exists (
      select 1 from communications c
      where c.audio_path = storage.objects.name
        and (can_manage_work() or c.created_by = auth.uid())
    )
  );

notify pgrst, 'reload schema';
