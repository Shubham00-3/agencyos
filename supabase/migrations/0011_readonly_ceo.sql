-- Read-only CEO: the CEO can SEE everything (kept in is_staff(), which gates
-- all SELECT policies) but can CHANGE nothing. "Write" authority moves from
-- staff (ceo/pa/admin) to managers (pa/admin) only.

-- 1. Management authority excludes the CEO.
create or replace function can_manage_work()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('pa','admin'), false);
$$;

-- 2. Working on a task (upload / comment / move status) excludes the CEO too.
create or replace function can_work_on_task(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    auth_role() in ('pa','admin')          -- managers can act on any task
    or auth_role() = 'developer'           -- developers work on every task
    or exists (
      select 1 from tasks t
      where t.id = tid and t.assignee_id = auth.uid()
    ),
    false
  );
$$;

-- 3. Approval / review decisions are manager-only (CEO removed from the list).
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

-- 4. Credentials: CEO may VIEW (can_view_credentials) but not write.
--    Split the old single "for all" policy into read + write.
drop policy if exists creds_all on client_credentials;
drop policy if exists creds_select on client_credentials;
drop policy if exists creds_write on client_credentials;
create policy creds_select on client_credentials for select to authenticated
  using (can_view_credentials());
create policy creds_write on client_credentials for all to authenticated
  using (can_manage_work())
  with check (can_manage_work());
