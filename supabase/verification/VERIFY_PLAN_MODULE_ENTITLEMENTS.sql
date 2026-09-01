-- Read-only check: find workspaces whose enabled_modules do not match
-- the plan and journey they are currently on.

with plan_modules as (
    select
        'starter'::text as plan,
        'competition_organiser'::text as organisation_type,
        array[
            'Dashboard',
            'Competitions',
            'Clubs',
            'Teams',
            'Competition Teams',
            'Groups',
            'Venues',
            'Fixtures',
            'Results',
            'User Access'
        ]::text[] as expected_modules
    union all
    select
        'starter',
        'club',
        array[
            'Dashboard',
            'Club Profile & Website',
            'Seasons',
            'Teams',
            'Opponents',
            'Squad',
            'Fixtures',
            'Results',
            'User Access'
        ]::text[]
    union all
    select
        'professional',
        'competition_organiser',
        array[
            'Dashboard',
            'Competitions',
            'Clubs',
            'Teams',
            'Competition Teams',
            'Groups',
            'Venues',
            'Fixtures',
            'Results',
            'User Access',
            'Sports Officials',
            'Match Centre',
            'Goals',
            'Statistics',
            'Sponsors',
            'Articles',
            'Media',
            'Enquiries',
            'Communications',
            'AI Tournament Director',
            'Auto Fixture Generator'
        ]::text[]
    union all
    select
        'professional',
        'club',
        array[
            'Dashboard',
            'Club Profile & Website',
            'Seasons',
            'Teams',
            'Opponents',
            'Squad',
            'Fixtures',
            'Results',
            'User Access',
            'Sports Officials',
            'Trial Centre',
            'Match Centre',
            'Goals',
            'Statistics',
            'Club Finance',
            'Communications',
            'Sponsors',
            'Articles',
            'Media',
            'Enquiries'
        ]::text[]
), normalised as (
    select
        o.id,
        o.name,
        o.slug,
        o.organisation_type,
        o.subscription_plan,
        o.subscription_status,
        coalesce(o.enabled_modules, array[]::text[]) as actual_modules,
        pm.expected_modules
    from public.organisations o
    join plan_modules pm
      on pm.plan = o.subscription_plan
     and pm.organisation_type = o.organisation_type
    where o.subscription_plan in ('starter', 'professional')
), compared as (
    select
        n.*,
        array(
            select module
            from unnest(n.expected_modules) as module
            where not module = any(n.actual_modules)
        ) as missing_modules,
        array(
            select module
            from unnest(n.actual_modules) as module
            where not module = any(n.expected_modules)
        ) as extra_modules
    from normalised n
)
select
    id,
    name,
    slug,
    organisation_type,
    subscription_plan,
    subscription_status,
    cardinality(actual_modules) as actual_module_count,
    cardinality(expected_modules) as expected_module_count,
    missing_modules,
    extra_modules
from compared
where cardinality(missing_modules) > 0
   or cardinality(extra_modules) > 0
order by subscription_status, subscription_plan, name;
