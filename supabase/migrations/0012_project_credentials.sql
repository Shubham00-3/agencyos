-- Credentials move from the client level to the individual project level: one
-- client can have several projects, each with its own WordPress / hosting login.
-- Access stays staff-only (role-based RLS from 0002 is unchanged).

alter table client_credentials
  add column if not exists project_id uuid references projects(id) on delete cascade;

create index if not exists client_credentials_project_id_idx
  on client_credentials (project_id);

-- Backfill existing client-level credentials onto the client's earliest project
-- so nothing is orphaned by the move.
update client_credentials cc
set project_id = p.id
from (
  select distinct on (client_id) id, client_id
  from projects
  order by client_id, created_at
) p
where cc.project_id is null
  and cc.client_id = p.client_id;

notify pgrst, 'reload schema';
