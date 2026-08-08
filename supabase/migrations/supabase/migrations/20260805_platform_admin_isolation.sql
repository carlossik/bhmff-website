-- TournamentHQ platform administrator isolation
-- Separates platform-wide access from organisation-scoped super_admin access.

begin;

create table if not exists public.platform_admins (
                                                      user_id uuid primary key references auth.users(id) on delete cascade,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
    );

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin(
    candidate_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = candidate_user_id
      and pa.active = true
);
$$;

create or replace function public.is_organisation_super_admin(
    target_organisation_id uuid,
    candidate_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
select exists (
    select 1
    from public.organisation_memberships om
    where om.organisation_id = target_organisation_id
      and om.user_id = candidate_user_id
      and om.role = 'super_admin'
      and om.active = true
);
$$;

create or replace function public.can_manage_organisation_user(
    target_user_id uuid,
    candidate_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
select
    target_user_id = candidate_user_id
        or public.is_platform_admin(candidate_user_id)
        or exists (
        select 1
        from public.organisation_memberships administrator_membership
                 join public.organisation_memberships target_membership
                      on target_membership.organisation_id =
                         administrator_membership.organisation_id
        where administrator_membership.user_id = candidate_user_id
          and administrator_membership.role = 'super_admin'
          and administrator_membership.active = true
          and target_membership.user_id = target_user_id
    );
$$;

drop policy if exists
    "Platform admins can view platform administrators"
on public.platform_admins;

create policy
    "Platform admins can view platform administrators"
on public.platform_admins
for select
                    to authenticated
                    using (
                    public.is_platform_admin()
                    );

drop policy if exists
    "Platform admins can manage platform administrators"
on public.platform_admins;

create policy
    "Platform admins can manage platform administrators"
on public.platform_admins
for all
to authenticated
using (
    public.is_platform_admin()
)
with check (
    public.is_platform_admin()
);

-- Organisations -------------------------------------------------------------

drop policy if exists
    "Super admins can view organisations"
on public.organisations;

drop policy if exists
    "Super admins can create organisations"
on public.organisations;

drop policy if exists
    "Super admins can update organisations"
on public.organisations;

drop policy if exists
    "Super admins can delete organisations"
on public.organisations;

drop policy if exists
    "Platform admins can view all organisations"
on public.organisations;

create policy
    "Platform admins can view all organisations"
on public.organisations
for select
                                                    to authenticated
                                                    using (
                                                    public.is_platform_admin()
                                                    );

drop policy if exists
    "Platform admins can create organisations"
on public.organisations;

create policy
    "Platform admins can create organisations"
on public.organisations
for insert
to authenticated
with check (
    public.is_platform_admin()
);

drop policy if exists
    "Platform admins can update organisations"
on public.organisations;

create policy
    "Platform admins can update organisations"
on public.organisations
for update
                                to authenticated
                                using (
                                public.is_platform_admin()
                                )
    with check (
                                public.is_platform_admin()
                                );

drop policy if exists
    "Organisation super admins can update their organisation"
on public.organisations;

create policy
    "Organisation super admins can update their organisation"
on public.organisations
for update
                    to authenticated
                    using (
                    public.is_organisation_super_admin(id)
                    )
    with check (
                    public.is_organisation_super_admin(id)
                    );

drop policy if exists
    "Platform admins can delete organisations"
on public.organisations;

create policy
    "Platform admins can delete organisations"
on public.organisations
for delete
to authenticated
using (
    public.is_platform_admin()
);

-- Organisation memberships --------------------------------------------------

drop policy if exists
    "Super admins can create organisation memberships"
on public.organisation_memberships;

drop policy if exists
    "Organisation super admins can create memberships"
on public.organisation_memberships;

create policy
    "Organisation super admins can create memberships"
on public.organisation_memberships
for insert
to authenticated
with check (
    public.is_platform_admin()
    or public.is_organisation_super_admin(organisation_id)
);

drop policy if exists
    "Organisation super admins can update memberships"
on public.organisation_memberships;

create policy
    "Organisation super admins can update memberships"
on public.organisation_memberships
for update
                                     to authenticated
                                     using (
                                     public.is_platform_admin()
                                     or public.is_organisation_super_admin(organisation_id)
                                     )
    with check (
                                     public.is_platform_admin()
                                     or public.is_organisation_super_admin(organisation_id)
                                     );

drop policy if exists
    "Organisation super admins can delete memberships"
on public.organisation_memberships;

create policy
    "Organisation super admins can delete memberships"
on public.organisation_memberships
for delete
to authenticated
using (
    public.is_platform_admin()
    or public.is_organisation_super_admin(organisation_id)
);

drop policy if exists
    "Platform admins can view all organisation memberships"
on public.organisation_memberships;

create policy
    "Platform admins can view all organisation memberships"
on public.organisation_memberships
for select
                    to authenticated
                    using (
                    public.is_platform_admin()
                    );

-- Profiles ------------------------------------------------------------------

drop policy if exists
    "Super admins can insert profiles"
on public.profiles;

drop policy if exists
    "Super admins can update profiles"
on public.profiles;

drop policy if exists
    "Users can read own profile"
on public.profiles;

drop policy if exists
    "Authorised users can read profiles"
on public.profiles;

create policy
    "Authorised users can read profiles"
on public.profiles
for select
                                   to authenticated
                                   using (
                                   public.can_manage_organisation_user(id)
                                   );

drop policy if exists
    "Authorised users can update profiles"
on public.profiles;

create policy
    "Authorised users can update profiles"
on public.profiles
for update
                    to authenticated
                    using (
                    public.can_manage_organisation_user(id)
                    )
    with check (
                    public.can_manage_organisation_user(id)
                    );

drop policy if exists
    "Users can insert own profile"
on public.profiles;

create policy
    "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (
    id = auth.uid()
    or public.is_platform_admin()
);

commit;