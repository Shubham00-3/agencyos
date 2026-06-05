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
