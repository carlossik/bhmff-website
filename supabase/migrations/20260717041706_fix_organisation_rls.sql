begin;

create or replace function public.is_active_organisation_member(
    target_organisation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
select exists (
    select 1
    from public.organisation_memberships
    where organisation_id = target_organisation_id
      and user_id = auth.uid()
      and active = true
);
$$;

revoke all
    on function public.is_active_organisation_member(uuid)
    from public;

grant execute
on function public.is_active_organisation_member(uuid)
to authenticated;

drop policy if exists
    "Authenticated users can view their organisations"
on public.organisations;

create policy
    "Authenticated users can view their organisations"
on public.organisations
for select
                                                                    to authenticated
                                                                    using (
                                                                    public.is_active_organisation_member(id)
                                                                    );

drop policy if exists
    "Members can view organisation memberships"
on public.organisation_memberships;

create policy
    "Members can view organisation memberships"
on public.organisation_memberships
for select
                    to authenticated
                    using (
                    public.is_active_organisation_member(
                    organisation_id
                    )
                    );

commit;