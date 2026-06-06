-- =====================================================================
-- reconcile.sql  --  ONE-TIME drift fix for the cloud database.
--
-- The cloud DB only ever had 0001 + 0002 applied (no migration history),
-- so 0003-0012 never ran there. This script replays the missing migrations
-- in dependency order. It is fully idempotent (create-or-replace /
-- drop-if-exists / add-if-not-exists), so it is safe to run as many times
-- as you like. 0004/0005 are intentionally omitted -- they add the retired
-- "uploaded" task stage, which the app no longer uses.
--
-- Run once in the Supabase SQL editor. After it succeeds the live schema
-- matches migrations 0001-0012.
-- =====================================================================

-- -------------------------------------------------------------------
-- 0003_readonly_ceo_storage_scope.sql
-- -------------------------------------------------------------------
-- Tighten production storage permissions:
-- - Staff (CEO / PA / Admin) keep full operational access.
-- - Storage object access is scoped to the task/project the file belongs to.

create or replace function can_manage_work()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('ceo','pa','admin'), false);
$$;

create or replace function can_view_credentials()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('ceo','pa','admin'), false);
$$;

create or replace function can_contribute_to_task(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    can_manage_work()
    or exists (
      select 1
      from tasks t
      left join project_members m
        on m.project_id = t.project_id and m.user_id = auth.uid()
      where t.id = tid
        and (t.assignee_id = auth.uid() or m.user_id = auth.uid())
    ),
    false
  );
$$;

drop policy if exists profiles_update on profiles;
drop policy if exists profiles_insert on profiles;
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid() or can_manage_work())
  with check (id = auth.uid() or can_manage_work());
create policy profiles_insert on profiles for insert to authenticated
  with check (can_manage_work());

drop policy if exists clients_write on clients;
create policy clients_write on clients for all to authenticated
  using (can_manage_work())
  with check (can_manage_work());

drop policy if exists projects_write on projects;
create policy projects_write on projects for all to authenticated
  using (can_manage_work())
  with check (can_manage_work());

drop policy if exists pm_write on project_members;
create policy pm_write on project_members for all to authenticated
  using (can_manage_work())
  with check (can_manage_work());

drop policy if exists tasks_insert on tasks;
drop policy if exists tasks_update on tasks;
drop policy if exists tasks_delete on tasks;
create policy tasks_insert on tasks for insert to authenticated
  with check (can_manage_work());
create policy tasks_update on tasks for update to authenticated
  using (can_manage_work() or assignee_id = auth.uid())
  with check (can_manage_work() or assignee_id = auth.uid());
create policy tasks_delete on tasks for delete to authenticated
  using (can_manage_work());

drop policy if exists att_insert on task_attachments;
drop policy if exists att_delete on task_attachments;
create policy att_insert on task_attachments for insert to authenticated
  with check (can_contribute_to_task(task_id) and uploaded_by = auth.uid());
create policy att_delete on task_attachments for delete to authenticated
  using (can_manage_work() or uploaded_by = auth.uid());

drop policy if exists cmt_insert on task_comments;
drop policy if exists cmt_delete on task_comments;
create policy cmt_insert on task_comments for insert to authenticated
  with check (can_contribute_to_task(task_id) and user_id = auth.uid());
create policy cmt_delete on task_comments for delete to authenticated
  using (can_manage_work() or user_id = auth.uid());

drop policy if exists act_select on activity_log;
create policy act_select on activity_log for select to authenticated
  using (is_staff());

drop policy if exists att_storage_select on storage.objects;
drop policy if exists att_storage_insert on storage.objects;
drop policy if exists att_storage_delete on storage.objects;

create policy att_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from task_attachments ta
      where ta.storage_path = storage.objects.name
        and is_task_member(ta.task_id)
    )
  );

create policy att_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and can_contribute_to_task(((storage.foldername(name))[2])::uuid)
  );

create policy att_storage_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from task_attachments ta
      where ta.storage_path = storage.objects.name
        and (can_manage_work() or ta.uploaded_by = auth.uid())
    )
  );

-- -------------------------------------------------------------------
-- 0006_task_worker_permissions.sql
-- -------------------------------------------------------------------
-- Worker permissions:
-- - Developers can work on every task.
-- - Otherwise only the assigned user can work on a task.
-- - Staff still manage task metadata, projects, clients, and assignments.

create or replace function can_work_on_task(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    auth_role() = 'developer'
    or exists (
      select 1
      from tasks t
      where t.id = tid
        and t.assignee_id = auth.uid()
    ),
    false
  );
$$;

create or replace function enforce_task_worker_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and not can_work_on_task(old.id) then
    raise exception 'Only the assignee or a developer can update task status.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_task_worker_status on tasks;
create trigger trg_task_worker_status
  before update on tasks
  for each row execute function enforce_task_worker_status();

drop policy if exists tasks_select on tasks;
create policy tasks_select on tasks for select to authenticated
  using (is_staff() or auth_role() = 'developer' or is_project_member(project_id) or assignee_id = auth.uid());

drop policy if exists tasks_update on tasks;
create policy tasks_update on tasks for update to authenticated
  using (can_manage_work() or can_work_on_task(id))
  with check (can_manage_work() or can_work_on_task(id));

drop policy if exists projects_select on projects;
create policy projects_select on projects for select to authenticated
  using (is_staff() or auth_role() = 'developer' or is_project_member(id));

drop policy if exists clients_select on clients;
create policy clients_select on clients for select to authenticated using (
  is_staff()
  or auth_role() = 'developer'
  or exists (
    select 1 from projects p
    join project_members m on m.project_id = p.id
    where p.client_id = clients.id and m.user_id = auth.uid()
  )
);

create or replace function can_contribute_to_task(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select can_work_on_task(tid);
$$;

drop policy if exists att_insert on task_attachments;
drop policy if exists att_delete on task_attachments;
create policy att_insert on task_attachments for insert to authenticated
  with check (can_work_on_task(task_id) and uploaded_by = auth.uid());
create policy att_delete on task_attachments for delete to authenticated
  using (can_work_on_task(task_id) and (auth_role() = 'developer' or uploaded_by = auth.uid()));

drop policy if exists cmt_insert on task_comments;
drop policy if exists cmt_delete on task_comments;
create policy cmt_insert on task_comments for insert to authenticated
  with check (can_work_on_task(task_id) and user_id = auth.uid());
create policy cmt_delete on task_comments for delete to authenticated
  using (can_work_on_task(task_id) and (auth_role() = 'developer' or user_id = auth.uid()));

drop policy if exists att_storage_insert on storage.objects;
drop policy if exists att_storage_delete on storage.objects;
create policy att_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and can_work_on_task(((storage.foldername(name))[2])::uuid)
  );
create policy att_storage_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from task_attachments ta
      where ta.storage_path = storage.objects.name
        and can_work_on_task(ta.task_id)
        and (auth_role() = 'developer' or ta.uploaded_by = auth.uid())
    )
  );

-- -------------------------------------------------------------------
-- 0007_task_visibility_scope.sql
-- -------------------------------------------------------------------
-- Task visibility:
-- - CEO, PA, and System Admin can monitor every task.
-- - Developers can see and work on every task.
-- - Other contributors only see tasks assigned to them.

create or replace function is_task_member(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    is_staff()
    or auth_role() = 'developer'
    or exists (
      select 1
      from tasks t
      where t.id = tid
        and t.assignee_id = auth.uid()
    ),
    false
  );
$$;

drop policy if exists tasks_select on tasks;
create policy tasks_select on tasks for select to authenticated
  using (is_staff() or auth_role() = 'developer' or assignee_id = auth.uid());

drop policy if exists att_select on task_attachments;
create policy att_select on task_attachments for select to authenticated
  using (is_task_member(task_id));

drop policy if exists cmt_select on task_comments;
create policy cmt_select on task_comments for select to authenticated
  using (is_task_member(task_id));

drop policy if exists att_storage_select on storage.objects;
create policy att_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from task_attachments ta
      where ta.storage_path = storage.objects.name
        and is_task_member(ta.task_id)
    )
  );

-- -------------------------------------------------------------------
-- 0008_staff_work_and_retire_uploaded.sql
-- -------------------------------------------------------------------
-- 1. Let staff (ceo/pa/admin) work on any task, not just developers and the
--    assignee. This cascades to the status-change trigger and every
--    attachment / comment / storage policy that calls can_work_on_task().
create or replace function can_work_on_task(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    auth_role() in ('ceo', 'pa', 'admin')  -- staff can act on any task
    or auth_role() = 'developer'           -- developers work on every task
    or exists (
      select 1
      from tasks t
      where t.id = tid
        and t.assignee_id = auth.uid()
    ),
    false
  );
$$;

-- 2. Retire the "Uploaded" task stage. Existing uploaded tasks fold into the
--    In review stage. Guarded because some environments (incl. the cloud DB)
--    never had the 'uploaded' enum value; the literal would otherwise error.
do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'task_status' and e.enumlabel = 'uploaded'
  ) then
    update tasks set status = 'in_review' where status = 'uploaded';
  end if;
end $$;

-- -------------------------------------------------------------------
-- 0009_task_change_request.sql
-- -------------------------------------------------------------------
-- Reviewers can send a task back with a note describing what needs to change.
-- The note is shown to whoever is working the task and cleared once they
-- resubmit for review.
alter table tasks add column if not exists change_request text;

-- -------------------------------------------------------------------
-- 0010_review_is_staff_only.sql
-- -------------------------------------------------------------------
-- Reviewing a submitted task is a staff decision. The assignee/worker can move
-- a task forward (todo -> in_progress -> in_review) but cannot approve their own
-- work or send it back from review -- only staff (ceo/pa/admin) can do that.
create or replace function enforce_task_worker_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if not can_work_on_task(old.id) then
      raise exception 'Only the assignee or a developer can update task status.';
    end if;
    -- Approval (reaching "done") and any move out of "in_review" are staff-only.
    if (new.status = 'done' or old.status = 'in_review')
       and not (auth_role() in ('ceo', 'pa', 'admin')) then
      raise exception 'Only staff can approve or return a task that is in review.';
    end if;
  end if;
  return new;
end;
$$;

-- The trigger itself was missing on the cloud DB (migration 0006 never reached
-- it), so the function was never firing. (Re)create it.
drop trigger if exists trg_task_worker_status on tasks;
create trigger trg_task_worker_status
  before update on tasks
  for each row execute function enforce_task_worker_status();

-- -------------------------------------------------------------------
-- 0011_readonly_ceo.sql
-- -------------------------------------------------------------------
-- Read-only CEO: the CEO can SEE everything (kept in is_staff(), which gates
-- all SELECT policies) but can CHANGE nothing. "Write" authority moves from
-- staff (ceo/pa/admin) to managers (pa/admin) only.

create or replace function can_manage_work()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('pa','admin'), false);
$$;

create or replace function can_work_on_task(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    auth_role() in ('pa','admin')
    or auth_role() = 'developer'
    or exists (
      select 1 from tasks t
      where t.id = tid and t.assignee_id = auth.uid()
    ),
    false
  );
$$;

create or replace function enforce_task_worker_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if not can_work_on_task(old.id) then
      raise exception 'Only the assignee or a developer can update task status.';
    end if;
    if (new.status = 'done' or old.status = 'in_review')
       and not (auth_role() in ('pa','admin')) then
      raise exception 'Only staff can approve or return a task that is in review.';
    end if;
  end if;
  return new;
end;
$$;

drop policy if exists creds_all on client_credentials;
drop policy if exists creds_select on client_credentials;
drop policy if exists creds_write on client_credentials;
create policy creds_select on client_credentials for select to authenticated
  using (can_view_credentials());
create policy creds_write on client_credentials for all to authenticated
  using (can_manage_work())
  with check (can_manage_work());

-- -------------------------------------------------------------------
-- 0012_require_task_evidence_to_start.sql
-- -------------------------------------------------------------------
-- A task cannot move from Pending (todo) to In progress until the worker has
-- added at least one upload or one comment.

create or replace function enforce_task_worker_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if not can_work_on_task(old.id) then
      raise exception 'Only the assignee or a developer can update task status.';
    end if;

    if old.status = 'todo' and new.status = 'in_progress'
       and not exists (
         select 1 from task_attachments
         where task_id = old.id
       )
       and not exists (
         select 1 from task_comments
         where task_id = old.id
       ) then
      raise exception 'Add a comment or upload a file before moving this task to in progress.';
    end if;

    if (new.status = 'done' or old.status = 'in_review')
       and not (auth_role() in ('pa','admin')) then
      raise exception 'Only staff can approve or return a task that is in review.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_task_worker_status on tasks;
create trigger trg_task_worker_status
  before update on tasks
  for each row execute function enforce_task_worker_status();
