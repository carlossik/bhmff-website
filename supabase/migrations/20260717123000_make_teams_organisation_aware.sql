-- Make teams organisation-aware.

alter table public.teams
    add column if not exists organisation_id uuid;

update public.teams
set organisation_id = organisations.id
from public.organisations
where public.teams.organisation_id is null
  and organisations.slug = 'bhmff';

do $$
begin
    if exists (
        select 1
        from public.teams
        where organisation_id is null
    ) then
        raise exception
            'Unable to backfill teams.organisation_id because one or more teams remain without an organisation.';
    end if;
end
$$;

alter table public.teams
    alter column organisation_id set not null;

alter table public.teams
    drop constraint if exists teams_organisation_id_fkey;

alter table public.teams
    add constraint teams_organisation_id_fkey
    foreign key (organisation_id)
    references public.organisations(id)
    on update cascade
    on delete restrict;

create index if not exists teams_organisation_id_idx
    on public.teams (organisation_id);

alter table public.teams enable row level security;

drop policy if exists "Organisation members can view teams"
    on public.teams;

drop policy if exists "Organisation members can create teams"
    on public.teams;

drop policy if exists "Organisation members can update teams"
    on public.teams;

drop policy if exists "Organisation members can delete teams"
    on public.teams;

create policy "Organisation members can view teams"
on public.teams
for select
to authenticated
using (
    public.is_active_organisation_member(
        organisation_id
    )
);

create policy "Organisation members can create teams"
on public.teams
for insert
to authenticated
with check (
    public.is_active_organisation_member(
        organisation_id
    )
);

create policy "Organisation members can update teams"
on public.teams
for update
to authenticated
using (
    public.is_active_organisation_member(
        organisation_id
    )
)
with check (
    public.is_active_organisation_member(
        organisation_id
    )
);

create policy "Organisation members can delete teams"
on public.teams
for delete
to authenticated
using (
    public.is_active_organisation_member(
        organisation_id
    )
);
