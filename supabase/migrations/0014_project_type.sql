-- Projects get a type chosen from a predefined list (New Website, Redesigning,
-- SEO, E-commerce, Facebook Ads, Google Ads, Social Media Marketing). Picking
-- "Other" in the UI stores a free-text value here, so the column is plain text
-- rather than an enum.

alter table projects
  add column if not exists project_type text;

notify pgrst, 'reload schema';
