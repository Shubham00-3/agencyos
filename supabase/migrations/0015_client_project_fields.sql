-- Phase 1 field additions from the client meeting:
--   clients : province / country (location breakdown), new-vs-old flag,
--             up to 5 web-archive links for the old site, last-website notes.
--   projects: new-vs-old flag.
-- City already exists (0013). Location now renders as "City, Province, Country".

-- new vs old, shared by clients and projects
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lifecycle_kind') then
    create type lifecycle_kind as enum ('new', 'old');
  end if;
end $$;

alter table clients
  add column if not exists province text,
  add column if not exists country text,
  add column if not exists client_kind lifecycle_kind not null default 'new',
  add column if not exists web_archive_links text[] not null default '{}',
  add column if not exists last_website_notes text;

alter table projects
  add column if not exists project_kind lifecycle_kind not null default 'new';

notify pgrst, 'reload schema';
