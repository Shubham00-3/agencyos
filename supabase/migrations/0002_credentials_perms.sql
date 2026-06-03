-- Tighten credential access: PA + System Admin only (exclude CEO).
-- Least-privilege for stored WordPress / hosting secrets.

create or replace function can_view_credentials()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('pa','admin'), false);
$$;

drop policy if exists creds_all on client_credentials;
create policy creds_all on client_credentials for all to authenticated
  using (can_view_credentials())
  with check (can_view_credentials());
