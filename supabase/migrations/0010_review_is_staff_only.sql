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
