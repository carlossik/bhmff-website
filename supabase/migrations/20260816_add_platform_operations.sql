begin;

-- ---------------------------------------------------------------------------
-- TournamentHQ Platform Operations telemetry
-- ---------------------------------------------------------------------------
-- This table is intentionally private. Application clients do not read or
-- write it directly. Platform Operations Edge Functions use the service role
-- and expose only the safe operational summary required by platform admins.
create table if not exists public.platform_operations_events (
    id uuid primary key default gen_random_uuid(),
    source text not null,
    category text not null,
    event_type text not null,
    severity text not null default 'info',
    processing_status text not null default 'processed',
    organisation_id uuid null
        references public.organisations(id)
        on delete set null,
    user_id uuid null
        references auth.users(id)
        on delete set null,
    external_id text null,
    correlation_id text null,
    message text not null,
    details jsonb not null default '{}'::jsonb,
    duration_ms integer null,
    occurred_at timestamptz not null default now(),
    resolved_at timestamptz null,
    resolved_by uuid null
        references auth.users(id)
        on delete set null,
    created_at timestamptz not null default now(),
    constraint platform_operations_events_source_check
        check (
            source in (
                'stripe_webhook',
                'client',
                'edge_function',
                'system'
            )
        ),
    constraint platform_operations_events_severity_check
        check (
            severity in (
                'info',
                'warning',
                'error',
                'critical'
            )
        ),
    constraint platform_operations_events_processing_status_check
        check (
            processing_status in (
                'received',
                'processed',
                'failed',
                'recovered'
            )
        ),
    constraint platform_operations_events_duration_check
        check (
            duration_ms is null
            or duration_ms >= 0
        )
);

alter table public.platform_operations_events
    enable row level security;

revoke all on table public.platform_operations_events
    from anon, authenticated;

create index if not exists
    platform_operations_events_occurred_at_idx
on public.platform_operations_events (
    occurred_at desc
);

create index if not exists
    platform_operations_events_org_occurred_idx
on public.platform_operations_events (
    organisation_id,
    occurred_at desc
);

create index if not exists
    platform_operations_events_severity_occurred_idx
on public.platform_operations_events (
    severity,
    occurred_at desc
);

create index if not exists
    platform_operations_events_source_occurred_idx
on public.platform_operations_events (
    source,
    occurred_at desc
);

create index if not exists
    platform_operations_events_external_id_idx
on public.platform_operations_events (
    external_id
)
where external_id is not null;

-- Production billing diagnostics. These fields let the internal dashboard
-- distinguish live Stripe activity from legacy sandbox records and show the
-- last event that reconciled each subscription.
alter table public.organisation_billing
    add column if not exists
        stripe_livemode boolean null,
    add column if not exists
        last_stripe_event_id text null,
    add column if not exists
        last_stripe_event_at timestamptz null;

create index if not exists
    organisation_billing_livemode_status_idx
on public.organisation_billing (
    stripe_livemode,
    stripe_status
);

create index if not exists
    organisation_billing_last_event_idx
on public.organisation_billing (
    last_stripe_event_at desc
);

comment on table public.platform_operations_events is
    'Private TournamentHQ production telemetry for platform administration, support diagnostics, billing/webhook health and customer issue investigation.';

comment on column public.platform_operations_events.details is
    'Sanitised operational metadata only. Do not store secrets, payment card data or request bodies.';

commit;
