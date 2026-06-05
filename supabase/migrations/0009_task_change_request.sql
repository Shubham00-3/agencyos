-- Reviewers can send a task back with a note describing what needs to change.
-- The note is shown to whoever is working the task and cleared once they
-- resubmit for review.
alter table tasks add column if not exists change_request text;
