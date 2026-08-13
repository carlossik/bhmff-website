-- TournamentHQ
-- Add organisation operating model
-- Safe migration: preserves all existing organisations and RLS behaviour.

do $$
begin
    if not exists (
        select 1
        from pg_type
        where typname = 'organisation_type'
    ) then
create type organisation_type as enum (
            'competition_organiser',
            'club'
        );
end if;
end
$$;

alter table public.organisations
    add column if not exists organisation_type organisation_type;

update public.organisations
set organisation_type = 'competition_organiser'
where organisation_type is null;

alter table public.organisations
    alter column organisation_type
        set default 'competition_organiser';

alter table public.organisations
    alter column organisation_type
        set not null;

comment on column public.organisations.organisation_type is
'Defines the organisation operating model. competition_organiser manages competitions; club manages its own fixture programme, results, squad, officials, media and public site.';