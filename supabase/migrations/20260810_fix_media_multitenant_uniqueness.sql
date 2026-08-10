begin;

-- TournamentHQ is multi-tenant. Media uniqueness must never leak across organisations.
-- This migration removes legacy GLOBAL unique constraints/indexes involving media
-- slug / youtube_url / embed_url, then recreates uniqueness inside the owning
-- organisation + competition only.

do $$
declare
    constraint_row record;
begin
    for constraint_row in
        select
            constraint_name
        from information_schema.table_constraints
        where table_schema = 'public'
          and table_name = 'media'
          and constraint_type = 'UNIQUE'
          and constraint_name in (
              select
                  tc.constraint_name
              from information_schema.table_constraints tc
              join information_schema.constraint_column_usage ccu
                on ccu.constraint_schema = tc.constraint_schema
               and ccu.constraint_name = tc.constraint_name
              where tc.table_schema = 'public'
                and tc.table_name = 'media'
                and tc.constraint_type = 'UNIQUE'
              group by tc.constraint_name
              having bool_or(
                  ccu.column_name in (
                      'slug',
                      'youtube_url',
                      'embed_url'
                  )
              )
              and not bool_or(
                  ccu.column_name = 'organisation_id'
              )
        )
    loop
        execute format(
            'alter table public.media drop constraint if exists %I',
            constraint_row.constraint_name
        );
    end loop;
end
$$;

do $$
declare
    index_row record;
begin
    for index_row in
        select
            indexname
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'media'
          and indexdef ilike '%unique%'
          and (
              indexdef ilike '%slug%' or
              indexdef ilike '%youtube_url%' or
              indexdef ilike '%embed_url%'
          )
          and indexdef not ilike '%organisation_id%'
    loop
        execute format(
            'drop index if exists public.%I',
            index_row.indexname
        );
    end loop;
end
$$;

-- Slugs are reusable by another organisation/competition.
create unique index if not exists media_org_comp_slug_uq
    on public.media (
        organisation_id,
        competition_id,
        slug
    );

-- Prevent accidental duplicate videos within the SAME competition,
-- while allowing the same source URL to be used by a different tenant/competition.
create unique index if not exists media_org_comp_youtube_url_uq
    on public.media (
        organisation_id,
        competition_id,
        youtube_url
    )
    where youtube_url is not null
      and btrim(youtube_url) <> '';

create unique index if not exists media_org_comp_embed_url_uq
    on public.media (
        organisation_id,
        competition_id,
        embed_url
    )
    where embed_url is not null
      and btrim(embed_url) <> '';

commit;
