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
