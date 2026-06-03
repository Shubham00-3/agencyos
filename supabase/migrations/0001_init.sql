-- AgencyOS schema: profiles, clients, credentials, projects, tasks, files,
-- comments, activity log + Row-Level Security. The DB is the real access
-- guard; the UI permission helpers only mirror these rules.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('ceo','pa','designer','developer','copywriter','admin');
create type client_status as enum ('active','completed');
create type project_status as enum ('not_started','in_progress','in_review','completed','live');
create type task_status as enum ('todo','in_progress','in_review','done');
create type task_category as enum ('design','dev','content','general');
create type credential_kind as enum ('wordpress','hosting','other');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'New member',
  role user_role not null default 'designer',
  avatar_color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  phone text,
  email text,
  existing_website_url text,
  status client_status not null default 'active',
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table client_credentials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  kind credential_kind not null default 'other',
  label text not null,
  url text,
  username text,
  password text,
  notes text,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  description text,
  status project_status not null default 'not_started',
  brief jsonb,
  created_by uuid references profiles(id) on delete set null,
  live_at timestamptz,
  created_at timestamptz not null default now()
);

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  category task_category not null default 'general',
  assignee_id uuid references profiles(id) on delete set null,
  status task_status not null default 'todo',
  due_date date,
  created_by uuid references profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size bigint,
  mime_type text,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index on projects (client_id);
create index on tasks (project_id);
create index on tasks (assignee_id);
create index on project_members (user_id);
create index on task_attachments (task_id);
create index on task_comments (task_id);
create index on activity_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they bypass RLS and avoid recursion)
-- ---------------------------------------------------------------------------
create or replace function auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('ceo','pa','admin'), false);
$$;

create or replace function is_project_member(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from project_members
    where project_id = pid and user_id = auth.uid()
  );
$$;

create or replace function is_task_member(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_staff() or exists (
    select 1 from tasks t
    join project_members m on m.project_id = t.project_id
    where t.id = tid and m.user_id = auth.uid()
  );
$$;

-- Create a profile automatically when an auth user is created.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New member'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'designer'),
    coalesce(new.raw_user_meta_data->>'avatar_color', '#6366f1')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Stamp completed_at and log task status changes for the accountability feed.
create or replace function on_task_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    if new.status = 'done' then
      new.completed_at := now();
    elsif old.status = 'done' then
      new.completed_at := null;
    end if;
    insert into activity_log (actor_id, entity_type, entity_id, action, meta)
    values (auth.uid(), 'task', new.id, 'status_changed',
            jsonb_build_object('from', old.status, 'to', new.status, 'title', new.title));
  end if;
  return new;
end;
$$;

create trigger trg_task_change
  before update on tasks
  for each row execute function on_task_change();

create or replace function on_project_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    if new.status = 'live' then
      new.live_at := coalesce(new.live_at, now());
    end if;
    insert into activity_log (actor_id, entity_type, entity_id, action, meta)
    values (auth.uid(), 'project', new.id, 'status_changed',
            jsonb_build_object('from', old.status, 'to', new.status, 'name', new.name));
  end if;
  return new;
end;
$$;

create trigger trg_project_change
  before update on projects
  for each row execute function on_project_change();

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table clients enable row level security;
alter table client_credentials enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table tasks enable row level security;
alter table task_attachments enable row level security;
alter table task_comments enable row level security;
alter table activity_log enable row level security;

-- profiles: everyone signed in can read the team; edit self or staff.
create policy profiles_select on profiles for select to authenticated using (true);
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid() or is_staff()) with check (id = auth.uid() or is_staff());
create policy profiles_insert on profiles for insert to authenticated
  with check (is_staff());

-- clients: staff full access; contributors can read clients tied to a project
-- they belong to (so the project page can show the business name).
create policy clients_select on clients for select to authenticated using (
  is_staff() or exists (
    select 1 from projects p
    join project_members m on m.project_id = p.id
    where p.client_id = clients.id and m.user_id = auth.uid()
  )
);
create policy clients_write on clients for all to authenticated
  using (is_staff()) with check (is_staff());

-- credentials: staff only.
create policy creds_all on client_credentials for all to authenticated
  using (is_staff()) with check (is_staff());

-- projects: staff full; members read.
create policy projects_select on projects for select to authenticated
  using (is_staff() or is_project_member(id));
create policy projects_write on projects for all to authenticated
  using (is_staff()) with check (is_staff());

-- project_members: staff manage; members can see who else is on their project.
create policy pm_select on project_members for select to authenticated
  using (is_staff() or is_project_member(project_id) or user_id = auth.uid());
create policy pm_write on project_members for all to authenticated
  using (is_staff()) with check (is_staff());

-- tasks: staff full; members read all tasks on their project; assignees can
-- update their own task (e.g. move the status). Only staff create/delete.
create policy tasks_select on tasks for select to authenticated
  using (is_staff() or is_project_member(project_id) or assignee_id = auth.uid());
create policy tasks_insert on tasks for insert to authenticated
  with check (is_staff());
create policy tasks_update on tasks for update to authenticated
  using (is_staff() or assignee_id = auth.uid())
  with check (is_staff() or assignee_id = auth.uid());
create policy tasks_delete on tasks for delete to authenticated
  using (is_staff());

-- attachments: visible to staff + project members; uploader is the actor.
create policy att_select on task_attachments for select to authenticated
  using (is_task_member(task_id));
create policy att_insert on task_attachments for insert to authenticated
  with check (is_task_member(task_id) and uploaded_by = auth.uid());
create policy att_delete on task_attachments for delete to authenticated
  using (is_staff() or uploaded_by = auth.uid());

-- comments: same visibility, author writes their own.
create policy cmt_select on task_comments for select to authenticated
  using (is_task_member(task_id));
create policy cmt_insert on task_comments for insert to authenticated
  with check (is_task_member(task_id) and user_id = auth.uid());
create policy cmt_delete on task_comments for delete to authenticated
  using (is_staff() or user_id = auth.uid());

-- activity log: staff (CEO/PA/admin) monitor everything.
create policy act_select on activity_log for select to authenticated
  using (is_staff());

-- ---------------------------------------------------------------------------
-- Storage: private bucket for uploaded assets. Bucket is private; access to
-- file metadata is gated by task_attachments RLS above, and downloads use
-- short-lived signed URLs generated server-side after that check.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy att_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'attachments');
create policy att_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments');
create policy att_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments');
