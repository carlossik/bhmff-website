-- TournamentHQ club public-profile fields
-- Run once in Supabase before deploying the matching frontend files.

alter table public.organisations
    add column if not exists description text,
    add column if not exists sport text,
    add column if not exists country text,
    add column if not exists currency text,
    add column if not exists founded_year integer,
    add column if not exists home_ground text,
    add column if not exists website_url text,
    add column if not exists contact_email text,
    add column if not exists facebook_url text,
    add column if not exists instagram_url text,
    add column if not exists twitter_url text,
    add column if not exists youtube_url text;

alter table public.organisations
    drop constraint if exists organisations_founded_year_check;

alter table public.organisations
    add constraint organisations_founded_year_check
    check (
        founded_year is null
        or founded_year between 1800 and 2200
    );

update public.organisations
set currency = 'GBP'
where organisation_type = 'club'
  and (currency is null or btrim(currency) = '');
