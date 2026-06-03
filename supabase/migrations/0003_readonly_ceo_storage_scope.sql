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
