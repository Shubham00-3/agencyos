-- City is now a required client field: it distinguishes clients that share a
-- business name in different locations (e.g. "Bright Smiles Dental" in Toronto
-- vs. Ottawa). Add the column, backfill any existing rows, then enforce NOT NULL.

alter table clients
  add column if not exists city text;

update clients set city = 'Unknown' where city is null or btrim(city) = '';

alter table clients
  alter column city set not null;

notify pgrst, 'reload schema';
