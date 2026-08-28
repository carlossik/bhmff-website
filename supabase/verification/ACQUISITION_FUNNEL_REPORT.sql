-- TournamentHQ acquisition funnel report
-- Read-only. Run in the Supabase SQL Editor whenever you want a quick campaign
-- conversion view before the in-product acquisition dashboard is added.

select
    coalesce(utm_source, '(direct / untagged)') as source,
    coalesce(utm_medium, '(none)') as medium,
    coalesce(utm_campaign, '(none)') as campaign,
    count(*) as organisations_created,
    count(*) filter (
        where onboarding_completed_at is not null
    ) as onboarding_completed,
    count(*) filter (
        where trial_started_at is not null
    ) as trials_started,
    count(*) filter (
        where paid_conversion_at is not null
    ) as paid_customers,
    round(
        100.0 * count(*) filter (
            where trial_started_at is not null
        ) / nullif(count(*), 0),
        1
    ) as organisation_to_trial_percent,
    round(
        100.0 * count(*) filter (
            where paid_conversion_at is not null
        ) / nullif(count(*) filter (
            where trial_started_at is not null
        ), 0),
        1
    ) as trial_to_paid_percent
from public.organisation_acquisition
group by
    coalesce(utm_source, '(direct / untagged)'),
    coalesce(utm_medium, '(none)'),
    coalesce(utm_campaign, '(none)')
order by
    paid_customers desc,
    trials_started desc,
    organisations_created desc;
