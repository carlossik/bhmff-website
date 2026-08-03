-- TournamentHQ
-- Add organisation ownership to commercial enquiries.
-- Created: 2026-08-02

begin;

alter table public.sponsor_enquiries
    add column if not exists organisation_id uuid
    references public.organisations(id)
    on delete cascade;

alter table public.demo_requests
    add column if not exists organisation_id uuid
    references public.organisations(id)
    on delete cascade;

-- Backfill sponsorship enquiries that already reference a competition.
update public.sponsor_enquiries as enquiry
set organisation_id = competition.organisation_id
    from public.competitions as competition
where enquiry.competition_id = competition.id
  and enquiry.organisation_id is null;

create index if not exists sponsor_enquiries_organisation_id_idx
    on public.sponsor_enquiries(organisation_id);

create index if not exists sponsor_enquiries_organisation_created_at_idx
    on public.sponsor_enquiries(organisation_id, created_at desc);

create index if not exists demo_requests_organisation_id_idx
    on public.demo_requests(organisation_id);

create index if not exists demo_requests_organisation_created_at_idx
    on public.demo_requests(organisation_id, created_at desc);

alter table public.sponsor_enquiries enable row level security;
alter table public.demo_requests enable row level security;

drop policy if exists "Public can submit sponsor enquiries"
    on public.sponsor_enquiries;

drop policy if exists "Organisation members can view sponsor enquiries"
    on public.sponsor_enquiries;

drop policy if exists "Organisation members can update sponsor enquiries"
    on public.sponsor_enquiries;

drop policy if exists "Organisation members can delete sponsor enquiries"
    on public.sponsor_enquiries;

drop policy if exists "Public can submit demo requests"
    on public.demo_requests;

drop policy if exists "Organisation members can view demo requests"
    on public.demo_requests;

drop policy if exists "Organisation members can update demo requests"
    on public.demo_requests;

drop policy if exists "Organisation members can delete demo requests"
    on public.demo_requests;

create policy "Public can submit sponsor enquiries"
on public.sponsor_enquiries
for insert
to anon, authenticated
with check (
    organisation_id is not null
    and exists (
        select 1
        from public.organisations
        where organisations.id = sponsor_enquiries.organisation_id
    )
);

create policy "Organisation members can view sponsor enquiries"
on public.sponsor_enquiries
for select
                                                              to authenticated
                                                              using (
                                                              exists (
                                                              select 1
                                                              from public.organisation_memberships
                                                              where organisation_memberships.organisation_id =
                                                              sponsor_enquiries.organisation_id
                                                              and organisation_memberships.user_id = auth.uid()
                                                              )
                                                              );

create policy "Organisation members can update sponsor enquiries"
on public.sponsor_enquiries
for update
               to authenticated
               using (
               exists (
               select 1
               from public.organisation_memberships
               where organisation_memberships.organisation_id =
               sponsor_enquiries.organisation_id
               and organisation_memberships.user_id = auth.uid()
               )
               )
    with check (
               exists (
               select 1
               from public.organisation_memberships
               where organisation_memberships.organisation_id =
               sponsor_enquiries.organisation_id
               and organisation_memberships.user_id = auth.uid()
               )
               );

create policy "Organisation members can delete sponsor enquiries"
on public.sponsor_enquiries
for delete
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships
        where organisation_memberships.organisation_id =
              sponsor_enquiries.organisation_id
          and organisation_memberships.user_id = auth.uid()
    )
);

create policy "Public can submit demo requests"
on public.demo_requests
for insert
to anon, authenticated
with check (
    organisation_id is not null
    and exists (
        select 1
        from public.organisations
        where organisations.id = demo_requests.organisation_id
    )
);

create policy "Organisation members can view demo requests"
on public.demo_requests
for select
                      to authenticated
                      using (
                      exists (
                      select 1
                      from public.organisation_memberships
                      where organisation_memberships.organisation_id =
                      demo_requests.organisation_id
                      and organisation_memberships.user_id = auth.uid()
                      )
                      );

create policy "Organisation members can update demo requests"
on public.demo_requests
for update
               to authenticated
               using (
               exists (
               select 1
               from public.organisation_memberships
               where organisation_memberships.organisation_id =
               demo_requests.organisation_id
               and organisation_memberships.user_id = auth.uid()
               )
               )
    with check (
               exists (
               select 1
               from public.organisation_memberships
               where organisation_memberships.organisation_id =
               demo_requests.organisation_id
               and organisation_memberships.user_id = auth.uid()
               )
               );

create policy "Organisation members can delete demo requests"
on public.demo_requests
for delete
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships
        where organisation_memberships.organisation_id =
              demo_requests.organisation_id
          and organisation_memberships.user_id = auth.uid()
    )
);

commit;