-- A task cannot move from Pending (todo) to In progress until the worker has
-- added at least one upload or one comment. This keeps "started" work
-- accountable and prevents empty status movement.

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
