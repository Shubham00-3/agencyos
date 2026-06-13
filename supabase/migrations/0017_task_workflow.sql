-- Standard website workflow: a project's build runs through a fixed sequence of
-- stages (Requirement Gathering → Design → Content → QA → SEO → Review → Go
-- Live → Post-Live Check). Each stage is a normal, assignable task; `stage`
-- tags which step it is and `step_order` keeps them in pipeline order.

alter table tasks
  add column if not exists stage text,
  add column if not exists step_order int;

create index if not exists tasks_stage_idx on tasks (project_id, step_order);

notify pgrst, 'reload schema';
