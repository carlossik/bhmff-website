-- TournamentHQ Acquisition Phase 2 verification
-- Safe read-only checks to run in the Supabase SQL Editor after applying
-- 20260827_add_acquisition_conversion_tracking.sql.

select
    to_regclass('public.organisation_acquisition') as acquisition_table,
    to_regprocedure('public.mark_onboarding_complete(uuid)') as onboarding_rpc,
    to_regprocedure('public.capture_self_service_acquisition()') as capture_trigger_function,
    to_regprocedure('public.sync_acquisition_subscription_lifecycle()') as lifecycle_trigger_function,
    to_regprocedure('public.sync_acquisition_billing_interval()') as billing_interval_trigger_function;

select
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
from information_schema.triggers
where trigger_name in (
    'capture_self_service_acquisition_trigger',
    'sync_acquisition_subscription_lifecycle_trigger',
    'sync_acquisition_billing_interval_trigger'
)
order by trigger_name, event_manipulation;

select
    organisation_id,
    requested_organisation_type,
    requested_plan,
    requested_billing_interval,
    utm_source,
    utm_medium,
    utm_campaign,
    signup_completed_at,
    organisation_created_at,
    onboarding_completed_at,
    trial_started_at,
    paid_conversion_at,
    current_subscription_plan,
    current_subscription_status,
    current_billing_interval
from public.organisation_acquisition
order by created_at desc
limit 20;
