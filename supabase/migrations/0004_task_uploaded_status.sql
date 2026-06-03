-- Add the explicit Uploaded task state requested for contributor deliverables.
-- Existing in-review tasks are migrated in 0005, after this enum value exists.

alter type task_status add value if not exists 'uploaded';
