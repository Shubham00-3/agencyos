-- Move legacy task review states to the explicit Uploaded state.
-- Project-level in_review status is not changed.

update tasks
set status = 'uploaded'
where status = 'in_review';
