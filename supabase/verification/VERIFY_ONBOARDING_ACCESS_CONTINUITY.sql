-- TournamentHQ — Onboarding access continuity verification
-- Purpose: identify verified self-service signups that have not completed onboarding
-- and would previously have been at risk of seeing "Access unavailable".
-- Run in Supabase SQL Editor. Read-only.

with auth_signup_users as (
    select
        au.id as auth_user_id,
        au.email,
        au.created_at as auth_created_at,
        au.email_confirmed_at,
        au.last_sign_in_at,
        au.raw_user_meta_data ->> 'signup_organisation_type' as signup_organisation_type,
        au.raw_user_meta_data ->> 'signup_plan' as signup_plan,
        au.raw_user_meta_data ->> 'signup_billing_interval' as signup_billing_interval
    from auth.users au
    where au.email_confirmed_at is not null
      and au.created_at >= now() - interval '60 days'
      and (
          au.raw_user_meta_data ? 'signup_organisation_type'
          or au.raw_user_meta_data ? 'signup_plan'
      )
), access_state as (
    select
        auth_signup_users.*,
        p.id as profile_id,
        p.full_name,
        p.role as profile_role,
        p.active as profile_active,
        count(om.id) filter (where om.active = true) as active_memberships,
        count(om.id) as total_memberships,
        string_agg(distinct o.name, ', ') as organisations,
        string_agg(distinct o.status, ', ') as organisation_statuses,
        string_agg(distinct coalesce(o.subscription_status, 'none'), ', ') as subscription_statuses
    from auth_signup_users
    left join public.profiles p
        on p.id = auth_signup_users.auth_user_id
    left join public.organisation_memberships om
        on om.user_id = auth_signup_users.auth_user_id
    left join public.organisations o
        on o.id = om.organisation_id
    group by
        auth_signup_users.auth_user_id,
        auth_signup_users.email,
        auth_signup_users.auth_created_at,
        auth_signup_users.email_confirmed_at,
        auth_signup_users.last_sign_in_at,
        auth_signup_users.signup_organisation_type,
        auth_signup_users.signup_plan,
        auth_signup_users.signup_billing_interval,
        p.id,
        p.full_name,
        p.role,
        p.active
)
select
    *,
    case
        when profile_id is null then 'verified_signup_without_profile'
        when profile_active is false and active_memberships = 0 then 'inactive_signup_without_membership'
        when active_memberships = 0 then 'verified_signup_without_workspace'
        else 'looks_ok'
    end as access_continuity_status
from access_state
where
    profile_id is null
    or profile_active is false
    or active_memberships = 0
order by auth_created_at desc;

-- Optional one-user rescue, only if needed after reviewing the result above:
-- update public.profiles
-- set active = true,
--     updated_at = now()
-- where id = 'AUTH_USER_ID_HERE';
