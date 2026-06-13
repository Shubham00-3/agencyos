-- Demo seed for AgencyOS. Creates one auth user per role (password: password123),
-- plus realistic clients / projects / tasks so every dashboard has data.
-- The demo role-switcher signs in as these accounts to preview each view.

-- ---------------------------------------------------------------------------
-- Users (the on_auth_user_created trigger creates the matching profile rows)
-- ---------------------------------------------------------------------------
create or replace function seed_user(uid uuid, em text, nm text, rl text, color text)
returns void language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em,
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', nm, 'role', rl, 'avatar_color', color),
    '', '', '', ''
  ) on conflict (id) do nothing;

  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    uid::text, uid,
    jsonb_build_object('sub', uid::text, 'email', em),
    'email', now(), now(), now()
  ) on conflict do nothing;
end;
$$;

select seed_user('11111111-1111-1111-1111-111111111111', 'ceo@agencyos.test',        'David Okafor',  'ceo',        '#8b5cf6');
select seed_user('22222222-2222-2222-2222-222222222222', 'pa@agencyos.test',         'Sarah Ahmed',   'pa',         '#6366f1');
select seed_user('33333333-3333-3333-3333-333333333333', 'designer@agencyos.test',   'James Malik',   'designer',   '#ec4899');
select seed_user('44444444-4444-4444-4444-444444444444', 'developer@agencyos.test',  'Priya Nair',    'developer',  '#0ea5e9');
select seed_user('55555555-5555-5555-5555-555555555555', 'copywriter@agencyos.test', 'Omar Siddiq',   'copywriter', '#10b981');
select seed_user('66666666-6666-6666-6666-666666666666', 'admin@agencyos.test',      'Lena Cruz',     'admin',      '#f59e0b');

drop function seed_user(uuid, text, text, text, text);

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
insert into clients (id, business_name, city, province, country, client_kind, web_archive_links, last_website_notes, contact_name, phone, email, existing_website_url, status, notes, created_by) values
  ('c1111111-1111-1111-1111-111111111111', 'Greenleaf Plumbing',  'Toronto',     'Ontario', 'Canada', 'old', array['https://web.archive.org/web/2016/https://greenleafplumbing.ca'], 'Old WordPress site, very dated theme. Keep the leaf logo, drop everything else.', 'Mike Torrence',   '+1 416-555-0148', 'mike@greenleafplumbing.ca',  'https://greenleafplumbing.ca',  'active', 'Wants a modern revamp, keep the green branding. Service-area pages are the priority.', '22222222-2222-2222-2222-222222222222'),
  ('c2222222-2222-2222-2222-222222222222', 'Bright Smiles Dental','Toronto',     'Ontario', 'Canada', 'new', '{}', null, 'Dr. Anika Sharma','+1 647-555-0192', 'hello@brightsmilesdental.ca','https://brightsmilesdental.ca', 'active', 'Brand new site. Needs online booking embed and a friendly, clean look.', '22222222-2222-2222-2222-222222222222'),
  ('c3333333-3333-3333-3333-333333333333', 'Peak Roofing Co.',    'Mississauga', 'Ontario', 'Canada', 'new', '{}', null, 'Dan Kowalski',    '+1 905-555-0177', 'dan@peakroofing.ca',         'https://peakroofing.ca',        'active', 'Full launch from scratch. Strong before/after gallery requested.', '22222222-2222-2222-2222-222222222222');

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
insert into projects (id, client_id, name, project_type, project_kind, description, status, brief, created_by) values
  ('a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Greenleaf — Website Revamp', 'Redesigning', 'old', 'Rebuild the existing WordPress site with a modern look and service-area landing pages.', 'in_progress',
   '{"competitors":"reliableplumbingto.ca, gta-plumbers.com","seo_keywords":"emergency plumber toronto, drain cleaning, water heater install","color_preferences":"Greens (#1f8a4c), white, charcoal text","desired_pages":"Home, Services, Service Areas, About, Reviews, Contact","reference_sites":"https://www.mrrooter.ca","extra_notes":"Keep the existing logo, refresh everything else."}'::jsonb,
   '22222222-2222-2222-2222-222222222222'),
  ('a2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Bright Smiles — New Website', 'New Website', 'new', 'Brand new dental practice site with online booking.', 'in_progress',
   '{"competitors":"yorkvilledental.ca","seo_keywords":"dentist toronto, teeth whitening, invisalign","color_preferences":"Soft blue + white, lots of whitespace","desired_pages":"Home, About, Services, Booking, Contact","reference_sites":"https://www.smilesatyonge.com","extra_notes":"Needs Cliniko booking embed."}'::jsonb,
   '22222222-2222-2222-2222-222222222222'),
  ('a3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'Peak Roofing — Full Launch', 'New Website', 'new', 'Full site build from scratch, gallery-heavy.', 'not_started',
   '{"competitors":"gtaroofing.com","seo_keywords":"roof replacement, roofing contractor, shingle repair","color_preferences":"Dark slate + orange accent","desired_pages":"Home, Services, Gallery, Financing, Contact","reference_sites":"","extra_notes":"Awaiting branding assets from client."}'::jsonb,
   '22222222-2222-2222-2222-222222222222');

-- Stored credentials (staff-only via RLS). Now scoped to the individual project
-- a login belongs to, not the client as a whole.
insert into client_credentials (client_id, project_id, kind, label, url, username, password, notes) values
  ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'wordpress', 'WordPress Admin', 'https://greenleafplumbing.ca/wp-admin', 'gl_admin',   'Gr33nLeaf!2025', 'Elementor Pro active'),
  ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'hosting',   'SiteGround',      'https://siteground.com',                 'greenleaf',  'Hosting#9921',   'GoGeek plan'),
  ('c2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'hosting',   'Cloudways',       'https://platform.cloudways.com',         'brightsmiles','Cl0ud!ways44',  'New server, staging only');

-- Project members (drives contributor visibility)
insert into project_members (project_id, user_id) values
  ('a1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333'),
  ('a1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444'),
  ('a1111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555'),
  ('a2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'),
  ('a2222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555'),
  ('a3333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');

-- ---------------------------------------------------------------------------
-- Tasks (mix of overdue + this week so dashboards have signal)
-- ---------------------------------------------------------------------------
insert into tasks (id, project_id, title, description, category, assignee_id, status, due_date, created_by, completed_at) values
  ('d0000001-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'Design homepage mockup',       'Full-width hero, services grid, reviews strip.',           'design',  '33333333-3333-3333-3333-333333333333', 'in_progress', '2026-06-03', '22222222-2222-2222-2222-222222222222', null),
  ('d0000002-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111111', 'Set up hosting environment',   'Provision SiteGround, install WP + Elementor.',            'dev',     '44444444-4444-4444-4444-444444444444', 'done',        '2026-05-28', '22222222-2222-2222-2222-222222222222', now() - interval '3 days'),
  ('d0000003-0000-0000-0000-000000000003', 'a1111111-1111-1111-1111-111111111111', 'Design logo refresh options',  '3 directions keeping the existing leaf mark.',             'design',  '33333333-3333-3333-3333-333333333333', 'todo',        '2026-06-06', '22222222-2222-2222-2222-222222222222', null),
  ('d0000004-0000-0000-0000-000000000004', 'a1111111-1111-1111-1111-111111111111', 'Write service pages copy',     'SEO-optimised copy for each core service.',                'content', '55555555-5555-5555-5555-555555555555', 'in_review',   '2026-06-02', '22222222-2222-2222-2222-222222222222', null),
  ('d0000005-0000-0000-0000-000000000005', 'a2222222-2222-2222-2222-222222222222', 'Build WordPress theme',        'Develop the approved Bright Smiles design in Elementor.',  'dev',     '44444444-4444-4444-4444-444444444444', 'todo',        '2026-06-10', '22222222-2222-2222-2222-222222222222', null),
  ('d0000006-0000-0000-0000-000000000006', 'a2222222-2222-2222-2222-222222222222', 'Collect client branding assets','Logo, photos, brand colours from Dr. Sharma.',            'design',  '33333333-3333-3333-3333-333333333333', 'in_progress', '2026-05-30', '22222222-2222-2222-2222-222222222222', null),
  ('d0000007-0000-0000-0000-000000000007', 'a2222222-2222-2222-2222-222222222222', 'Write homepage copy',          'Warm, trust-building homepage messaging.',                 'content', '55555555-5555-5555-5555-555555555555', 'todo',        '2026-06-09', '22222222-2222-2222-2222-222222222222', null),
  ('d0000008-0000-0000-0000-000000000008', 'a3333333-3333-3333-3333-333333333333', 'Kickoff & technical requirements','Confirm hosting, gather access, scope the build.',       'dev',     '44444444-4444-4444-4444-444444444444', 'todo',        '2026-06-12', '22222222-2222-2222-2222-222222222222', null);

-- ---------------------------------------------------------------------------
-- A couple of comments + activity entries for the collaboration feel
-- ---------------------------------------------------------------------------
insert into task_comments (task_id, user_id, body) values
  ('d0000004-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 'First draft uploaded — ready for PA review.'),
  ('d0000004-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'Looks great, tighten the Drain Cleaning section and resubmit.'),
  ('d0000001-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Hero direction shared, working on the services grid next.');

insert into activity_log (actor_id, entity_type, entity_id, action, meta, created_at) values
  ('44444444-4444-4444-4444-444444444444', 'task', 'd0000002-0000-0000-0000-000000000002', 'status_changed', '{"from":"in_progress","to":"done","title":"Set up hosting environment"}', now() - interval '3 days'),
  ('55555555-5555-5555-5555-555555555555', 'task', 'd0000004-0000-0000-0000-000000000004', 'status_changed', '{"from":"in_progress","to":"in_review","title":"Write service pages copy"}', now() - interval '1 day'),
  ('33333333-3333-3333-3333-333333333333', 'task', 'd0000001-0000-0000-0000-000000000001', 'status_changed', '{"from":"todo","to":"in_progress","title":"Design homepage mockup"}', now() - interval '6 hours');
