-- ===========================================================
-- Migrate existing festivals into competitions
-- TournamentHQ Phase 3
-- ===========================================================

-- Preserve the relationship to the legacy festival while
-- modules are migrated incrementally.
alter table public.competitions
    add column if not exists legacy_festival_id uuid;

alter table public.competitions
drop constraint if exists competitions_legacy_festival_id_fkey;

alter table public.competitions
    add constraint competitions_legacy_festival_id_fkey
        foreign key (legacy_festival_id)
            references public.festivals(id)
            on update cascade
            on delete restrict;

create unique index if not exists
    competitions_legacy_festival_id_unique_idx
    on public.competitions (legacy_festival_id)
    where legacy_festival_id is not null;


-- Create one competition for each existing festival.
insert into public.competitions
(
    organisation_id,
    legacy_festival_id,
    name,
    slug,
    season,
    format,
    status,
    published
)
select
    organisation.id,
    festival.id,
    festival.name,
    trim(
            both '-'
            from regexp_replace(
                    lower(
                            festival.name || '-' ||
                            coalesce(festival.year::text, 'competition')
                    ),
                    '[^a-z0-9]+',
                    '-',
                    'g'
                 )
    ),
    festival.year::text,
    'GROUP_AND_KNOCKOUT',
    case lower(coalesce(festival.status, 'draft'))
        when 'active' then 'ACTIVE'
        when 'completed' then 'COMPLETED'
        when 'archived' then 'ARCHIVED'
        else 'DRAFT'
        end,
    case
        when lower(coalesce(festival.status, 'draft')) = 'active'
            then true
        else false
        end
from public.festivals festival
         cross join lateral
    (
    select id
    from public.organisations
    where slug = 'bhmff'
        limit 1
) organisation
where not exists
    (
    select 1
    from public.competitions competition
    where competition.legacy_festival_id = festival.id
    );


-- Fail safely if festivals exist but no competitions were created.
do $$
declare
festival_count integer;
    migrated_count integer;
begin
select count(*)
into festival_count
from public.festivals;

select count(*)
into migrated_count
from public.competitions
where legacy_festival_id is not null;

if festival_count > 0
       and migrated_count < festival_count then
        raise exception
            'Festival migration incomplete. Festivals: %, migrated competitions: %.',
            festival_count,
            migrated_count;
end if;
end
$$;