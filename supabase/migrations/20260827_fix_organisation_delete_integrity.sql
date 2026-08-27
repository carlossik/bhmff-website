-- TournamentHQ: organisation / club cleanup integrity fix
-- Date: 2026-08-27
--
-- Root cause addressed:
-- 1. Organisation deletion cascades into Club Finance rows.
-- 2. Finance DELETE audit triggers try to insert a new audit row after the
--    organisation row has already been removed, violating the audit log FK.
-- 3. Several tenant-ownership FKs still use ON DELETE RESTRICT even though the
--    Platform Admin UI explicitly offers permanent organisation deletion with
--    associated data.
--
-- This migration keeps normal finance auditing intact, skips only audit writes
-- caused by a parent organisation already being deleted, and makes tenant-owned
-- relationships cascade consistently for permanent tenant cleanup.

begin;

-- ---------------------------------------------------------------------------
-- 1. Make Club Finance auditing safe during organisation-level cascades.
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    org_id uuid;
    row_id uuid;
    before_json jsonb;
    after_json jsonb;
begin
    if tg_op = 'INSERT' then
        after_json := to_jsonb(new);
        org_id := (after_json ->> 'organisation_id')::uuid;
        row_id := (after_json ->> 'id')::uuid;
    elsif tg_op = 'DELETE' then
        before_json := to_jsonb(old);
        org_id := (before_json ->> 'organisation_id')::uuid;
        row_id := (before_json ->> 'id')::uuid;
    else
        before_json := to_jsonb(old);
        after_json := to_jsonb(new);
        org_id := coalesce(
            (after_json ->> 'organisation_id')::uuid,
            (before_json ->> 'organisation_id')::uuid
        );
        row_id := coalesce(
            (after_json ->> 'id')::uuid,
            (before_json ->> 'id')::uuid
        );
    end if;

    -- During an organisation DELETE, PostgreSQL can cascade-delete finance rows
    -- after the parent organisation row is no longer visible. In that case a
    -- new audit row cannot legally reference the deleted organisation. Existing
    -- audit rows are themselves tenant-owned and are removed by ON DELETE CASCADE.
    -- Skip only this cascade-delete audit write; normal row deletes still audit.
    if tg_op = 'DELETE'
       and org_id is not null
       and not exists (
           select 1
           from public.organisations organisation
           where organisation.id = org_id
       ) then
        return old;
    end if;

    insert into public.club_finance_audit_log (
        organisation_id,
        user_id,
        action,
        entity_type,
        entity_id,
        before_state,
        after_state
    )
    values (
        org_id,
        auth.uid(),
        lower(tg_op),
        tg_argv[0],
        row_id,
        before_json,
        after_json
    );

    if tg_op = 'DELETE' then
        return old;
    end if;

    return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Tenant root ownership must cascade when Platform Admin permanently deletes
--    an organisation and all associated data.
-- ---------------------------------------------------------------------------

alter table public.competitions
    drop constraint if exists competitions_organisation_id_fkey;
alter table public.competitions
    add constraint competitions_organisation_id_fkey
        foreign key (organisation_id)
        references public.organisations(id)
        on delete cascade;

alter table public.teams
    drop constraint if exists teams_organisation_id_fkey;
alter table public.teams
    add constraint teams_organisation_id_fkey
        foreign key (organisation_id)
        references public.organisations(id)
        on update cascade
        on delete cascade;

alter table public.venues
    drop constraint if exists venues_organisation_id_fkey;
alter table public.venues
    add constraint venues_organisation_id_fkey
        foreign key (organisation_id)
        references public.organisations(id)
        on update cascade
        on delete cascade;

-- A club owns the teams linked to it. This also removes the blocker currently
-- preventing a dummy club with linked teams from being deleted.
alter table public.teams
    drop constraint if exists teams_club_id_fkey;
alter table public.teams
    add constraint teams_club_id_fkey
        foreign key (club_id)
        references public.clubs(id)
        on delete cascade;

-- ---------------------------------------------------------------------------
-- 3. Team / season owned rows must not RESTRICT deletion of their owning team.
-- ---------------------------------------------------------------------------

alter table public.club_team_seasons
    drop constraint if exists club_team_seasons_team_id_fkey;
alter table public.club_team_seasons
    add constraint club_team_seasons_team_id_fkey
        foreign key (team_id)
        references public.teams(id)
        on delete cascade;

-- These constraints exist on databases created from the restored club fixture
-- foundation. Guard the changes because older databases may have team_id columns
-- without an FK created by the earlier fixture migration.
do $$
begin
    if to_regclass('public.club_fixture_slots') is not null
       and exists (
           select 1
           from pg_constraint
           where conrelid = 'public.club_fixture_slots'::regclass
             and conname = 'club_fixture_slots_team_id_fkey'
       ) then
        alter table public.club_fixture_slots
            drop constraint club_fixture_slots_team_id_fkey;
        alter table public.club_fixture_slots
            add constraint club_fixture_slots_team_id_fkey
                foreign key (team_id)
                references public.teams(id)
                on delete cascade;
    end if;

    if to_regclass('public.club_fixtures') is not null
       and exists (
           select 1
           from pg_constraint
           where conrelid = 'public.club_fixtures'::regclass
             and conname = 'club_fixtures_team_id_fkey'
       ) then
        alter table public.club_fixtures
            drop constraint club_fixtures_team_id_fkey;
        alter table public.club_fixtures
            add constraint club_fixtures_team_id_fkey
                foreign key (team_id)
                references public.teams(id)
                on delete cascade;
    end if;
end
$$;

-- Trial Centre records belong to the selected team-season.
alter table public.club_trialists
    drop constraint if exists club_trialists_team_season_fkey;
alter table public.club_trialists
    add constraint club_trialists_team_season_fkey
        foreign key (organisation_id, season_id, team_id)
        references public.club_team_seasons(
            organisation_id,
            season_id,
            team_id
        )
        on delete cascade;

-- Finance fee rules belong to their team-season and charge type. Removing the
-- parent scope during tenant cleanup must remove the rules rather than block it.
alter table public.club_finance_fee_rules
    drop constraint if exists club_finance_fee_rules_team_season_fkey;
alter table public.club_finance_fee_rules
    add constraint club_finance_fee_rules_team_season_fkey
        foreign key (organisation_id, season_id, team_id)
        references public.club_team_seasons(
            organisation_id,
            season_id,
            team_id
        )
        on delete cascade;

alter table public.club_finance_fee_rules
    drop constraint if exists club_finance_fee_rules_charge_type_id_fkey;
alter table public.club_finance_fee_rules
    add constraint club_finance_fee_rules_charge_type_id_fkey
        foreign key (charge_type_id)
        references public.club_finance_charge_types(id)
        on delete cascade;

commit;
