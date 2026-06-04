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
