-- Client-level attachments: files attached directly to a client (contracts,
-- brand assets, references) rather than to a task. Stored in the same private
-- 'attachments' bucket under a clients/{clientId}/ prefix. Staff can view
-- (CEO read-only); managers (PA/Admin) and the uploader can add/remove.

create table if not exists client_attachments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size bigint,
  mime_type text,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists client_attachments_client_id_idx
  on client_attachments (client_id);

alter table client_attachments enable row level security;

drop policy if exists client_att_select on client_attachments;
drop policy if exists client_att_insert on client_attachments;
drop policy if exists client_att_delete on client_attachments;

create policy client_att_select on client_attachments for select to authenticated
  using (is_staff());
create policy client_att_insert on client_attachments for insert to authenticated
  with check (can_manage_work() and uploaded_by = auth.uid());
create policy client_att_delete on client_attachments for delete to authenticated
  using (can_manage_work() or uploaded_by = auth.uid());

-- Storage policies are permissive and OR together with the existing task ones,
-- so these only widen access for objects under the clients/ prefix.
drop policy if exists client_att_storage_select on storage.objects;
drop policy if exists client_att_storage_insert on storage.objects;
drop policy if exists client_att_storage_delete on storage.objects;

create policy client_att_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = 'clients'
    and is_staff()
  );

create policy client_att_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = 'clients'
    and can_manage_work()
  );

create policy client_att_storage_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1 from client_attachments ca
      where ca.storage_path = storage.objects.name
        and (can_manage_work() or ca.uploaded_by = auth.uid())
    )
  );

notify pgrst, 'reload schema';
