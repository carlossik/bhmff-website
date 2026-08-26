-- TournamentHQ public Media regression verification (READ ONLY)
-- Run AFTER 20260826_restore_public_media_visibility.sql.

-- 1. Media RLS must remain enabled.
select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'media';

-- Expected: rls_enabled = true.

-- 2. Audit the exact public policy. It MUST include anon + authenticated and
-- both organisation journeys (club and competition_organiser).
select
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
from pg_policies
where schemaname = 'public'
  and tablename = 'media'
  and policyname = 'Public can read published media';

-- 3. Check the affected customer and its published Media as database owner.
select
    o.id as organisation_id,
    o.name,
    o.slug,
    o.organisation_type,
    o.status as organisation_status,
    o.public_site_enabled,
    m.id as media_id,
    m.title,
    m.status as media_status,
    m.competition_id,
    m.youtube_url,
    m.embed_url,
    m.published_at
from public.organisations o
left join public.media m
  on m.organisation_id = o.id
 and m.status = 'published'
where o.slug = 'pettswood-vets1'
   or lower(o.name) in ('pettswood vets', 'petts wood vets')
order by m.published_at desc nulls last, m.created_at desc;

-- 4. Simulate a completely anonymous browser. Published PettsWood media should
-- be returned here just as it is on the public website.
begin;
set local role anon;
select
    o.slug,
    m.id,
    m.title,
    m.status,
    m.competition_id,
    m.youtube_url,
    m.embed_url
from public.media m
join public.organisations o
  on o.id = m.organisation_id
where (o.slug = 'pettswood-vets1'
       or lower(o.name) in ('pettswood vets', 'petts wood vets'))
  and m.status = 'published'
order by m.published_at desc nulls last, m.created_at desc;
rollback;

-- 5. Simulate an authenticated browser WITHOUT relying on club membership.
-- The public rows should match check 4.
begin;
set local role authenticated;
select
    o.slug,
    m.id,
    m.title,
    m.status,
    m.competition_id,
    m.youtube_url,
    m.embed_url
from public.media m
join public.organisations o
  on o.id = m.organisation_id
where (o.slug = 'pettswood-vets1'
       or lower(o.name) in ('pettswood vets', 'petts wood vets'))
  and m.status = 'published'
order by m.published_at desc nulls last, m.created_at desc;
rollback;

-- 6. Security regression: anonymous users must NEVER see draft/archived Media.
begin;
set local role anon;
select count(*) as non_published_media_visible_to_anon
from public.media
where status <> 'published';
rollback;

-- Expected: 0.

-- 7. Cross-journey smoke audit. This shows public published Media visible to
-- anon across BOTH club and competition organiser accounts.
begin;
set local role anon;
select
    o.organisation_type,
    o.slug,
    count(m.id) as visible_published_media
from public.organisations o
join public.media m on m.organisation_id = o.id
where o.status = 'active'
  and o.public_site_enabled = true
  and m.status = 'published'
group by o.organisation_type, o.slug
order by o.organisation_type, o.slug;
rollback;
