-- Make venues organisation-aware.

alter table public.venues
    add column if not exists organisation_id uuid;

update public.venues
set organisation_id = organisations.id
from public.organisations
where public.venues.organisation_id is null
  and organisations.slug = 'bhmff';

do $$
begin
    if exists (
        select 1
        from public.venues
        where organisation_id is null
    ) then
        raise exception
            'Unable to backfill venues.organisation_id because one or more venues remain without an organisation.';
    end if;
end
$$;

alter table public.venues
    alter column organisation_id set not null;

alter table public.venues
    drop constraint if exists venues_organisation_id_fkey;

alter table public.venues
    add constraint venues_organisation_id_fkey
    foreign key (organisation_id)
    references public.organisations(id)
    on update cascade
    on delete restrict;

create index if not exists venues_organisation_id_idx
    on public.venues (organisation_id);

alter table public.venues enable row level security;

drop policy if exists "Organisation members can view venues"
    on public.venues;

drop policy if exists "Organisation members can create venues"
    on public.venues;

drop policy if exists "Organisation members can update venues"
    on public.venues;

drop policy if exists "Organisation members can delete venues"
    on public.venues;

create policy "Organisation members can view venues"
on public.venues
for select
to authenticated
using (
    public.is_active_organisation_member(
        organisation_id
    )
);

create policy "Organisation members can create venues"
on public.venues
for insert
to authenticated
with check (
    public.is_active_organisation_member(
        organisation_id
    )
);

create policy "Organisation members can update venues"
on public.venues
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

create policy "Organisation members can delete venues"
on public.venues
for delete
to authenticated
using (
    public.is_active_organisation_member(
        organisation_id
    )
);
