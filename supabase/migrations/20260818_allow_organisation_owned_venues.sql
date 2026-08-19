-- TournamentHQ
-- Allow organisation-owned venues that are not tied to a competition.
-- Club/team home grounds are persistent organisation resources and must be
-- reusable across seasons and fixtures.

begin;

-- Existing competition venues keep their competition_id values. This only
-- widens the model so a venue may also be organisation-wide.
do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'venues'
          and column_name = 'competition_id'
    ) then
        alter table public.venues
            alter column competition_id drop not null;
    end if;
end
$$;

-- The original organisation-aware venue policies pre-date platform-admin
-- isolation. Preserve organisation-member access and explicitly allow active
-- TournamentHQ platform administrators to administer venues in any workspace.
alter table public.venues enable row level security;

drop policy if exists "Organisation members can view venues"
on public.venues;
create policy "Organisation members can view venues"
on public.venues
for select
to authenticated
using (
    public.is_platform_admin()
    or public.is_active_organisation_member(organisation_id)
);

drop policy if exists "Organisation members can create venues"
on public.venues;
create policy "Organisation members can create venues"
on public.venues
for insert
to authenticated
with check (
    public.is_platform_admin()
    or public.is_active_organisation_member(organisation_id)
);

drop policy if exists "Organisation members can update venues"
on public.venues;
create policy "Organisation members can update venues"
on public.venues
for update
to authenticated
using (
    public.is_platform_admin()
    or public.is_active_organisation_member(organisation_id)
)
with check (
    public.is_platform_admin()
    or public.is_active_organisation_member(organisation_id)
);

drop policy if exists "Organisation members can delete venues"
on public.venues;
create policy "Organisation members can delete venues"
on public.venues
for delete
to authenticated
using (
    public.is_platform_admin()
    or public.is_active_organisation_member(organisation_id)
);

commit;
