-- TournamentHQ Enterprise
-- Phase 4.1: TournamentHQ Communications foundation
-- Date: 2026-08-21
--
-- Goals:
--   * one organisation-scoped communication domain for clubs and competition organisers
--   * email / SMS / WhatsApp provider-independent delivery records
--   * reusable templates and safe provider-specific template references
--   * finance reminders are the first consumer, not a finance-only implementation
--   * provider secrets remain in Supabase Edge Function environment variables, never in tables
--   * no anonymous access to communications data

begin;

-- ---------------------------------------------------------------------------
-- 1. Organisation communication preferences (safe, non-secret configuration)
-- ---------------------------------------------------------------------------

create table if not exists public.communication_settings (
    organisation_id uuid primary key
        references public.organisations(id) on delete cascade,

    email_enabled boolean not null default true,
    sms_enabled boolean not null default true,
    whatsapp_enabled boolean not null default true,

    default_channels text[] not null default array['email']::text[],
    default_country_code text not null default '44',
    sender_name text,
    reply_to_email text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint communication_settings_channels_check
        check (
            default_channels <@ array['email','sms','whatsapp']::text[]
            and cardinality(default_channels) > 0
        ),
    constraint communication_settings_country_code_check
        check (default_country_code ~ '^[0-9]{1,4}$')
);

-- ---------------------------------------------------------------------------
-- 2. Optional organisation contact book / recipient overrides
-- ---------------------------------------------------------------------------
-- Existing club_players / competition data remain authoritative. These rows are
-- optional overrides/additional recipients (e.g. parent/guardian, secretary).

create table if not exists public.communication_contacts (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,

    subject_type text not null default 'other',
    subject_id uuid,
    team_id uuid,

    display_name text not null,
    relationship_label text,
    email text,
    phone_e164 text,
    whatsapp_e164 text,
    is_primary boolean not null default false,
    active boolean not null default true,

    operational_email_enabled boolean not null default true,
    operational_sms_enabled boolean not null default true,
    operational_whatsapp_enabled boolean not null default true,
    marketing_email_enabled boolean not null default false,
    marketing_sms_enabled boolean not null default false,
    marketing_whatsapp_enabled boolean not null default false,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint communication_contacts_subject_type_check
        check (subject_type in (
            'player',
            'guardian',
            'team_secretary',
            'club_contact',
            'official',
            'administrator',
            'other'
        )),
    constraint communication_contacts_email_or_phone_check
        check (
            email is not null
            or phone_e164 is not null
            or whatsapp_e164 is not null
        )
);

create index if not exists idx_communication_contacts_org_active
    on public.communication_contacts (organisation_id, active, display_name);

create index if not exists idx_communication_contacts_subject
    on public.communication_contacts (organisation_id, subject_type, subject_id)
    where subject_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Reusable message templates
-- ---------------------------------------------------------------------------
-- organisation_id NULL = TournamentHQ system template.
-- provider_template_refs examples:
-- {
--   "twilio": {"whatsapp": "HX..."},
--   "sent": {"sms": "tmpl_...", "whatsapp": "tmpl_..."}
-- }

create table if not exists public.communication_templates (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid
        references public.organisations(id) on delete cascade,

    code text not null,
    name text not null,
    category text not null default 'general',
    message_class text not null default 'service',

    subject_template text,
    body_template text not null,
    variables jsonb not null default '[]'::jsonb,
    provider_template_refs jsonb not null default '{}'::jsonb,

    system_defined boolean not null default false,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint communication_templates_code_check
        check (code ~ '^[a-z0-9_]+$'),
    constraint communication_templates_class_check
        check (message_class in ('service', 'marketing')),
    constraint communication_templates_category_check
        check (category in (
            'finance',
            'fixture',
            'squad',
            'competition',
            'announcement',
            'general'
        ))
);

create unique index if not exists uq_communication_templates_global_code
    on public.communication_templates (code)
    where organisation_id is null;

create unique index if not exists uq_communication_templates_org_code
    on public.communication_templates (organisation_id, code)
    where organisation_id is not null;

create index if not exists idx_communication_templates_org_active
    on public.communication_templates (organisation_id, active, category, name);

-- ---------------------------------------------------------------------------
-- 4. Message, recipient and channel delivery audit trail
-- ---------------------------------------------------------------------------

create table if not exists public.communication_messages (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,

    template_id uuid
        references public.communication_templates(id) on delete set null,
    template_code text,
    message_class text not null default 'service',

    source_type text,
    source_id uuid,
    subject_template text,
    body_template text not null,

    status text not null default 'queued',
    created_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint communication_messages_class_check
        check (message_class in ('service', 'marketing')),
    constraint communication_messages_status_check
        check (status in (
            'draft',
            'queued',
            'processing',
            'part_sent',
            'sent',
            'failed'
        ))
);

create index if not exists idx_communication_messages_org_created
    on public.communication_messages (organisation_id, created_at desc);

create index if not exists idx_communication_messages_source
    on public.communication_messages (organisation_id, source_type, source_id)
    where source_type is not null;

create table if not exists public.communication_recipients (
    id uuid primary key default uuid_generate_v4(),
    message_id uuid not null
        references public.communication_messages(id) on delete cascade,
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,

    contact_id uuid
        references public.communication_contacts(id) on delete set null,
    player_id uuid,
    team_id uuid,

    recipient_name text not null,
    email text,
    phone_e164 text,
    whatsapp_e164 text,
    variables jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now()
);

create index if not exists idx_communication_recipients_message
    on public.communication_recipients (message_id);

create index if not exists idx_communication_recipients_player
    on public.communication_recipients (organisation_id, player_id)
    where player_id is not null;

create table if not exists public.communication_deliveries (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    message_id uuid not null
        references public.communication_messages(id) on delete cascade,
    recipient_id uuid not null
        references public.communication_recipients(id) on delete cascade,

    channel text not null,
    provider text not null,
    status text not null default 'queued',

    provider_message_id text,
    provider_request_id text,
    error_code text,
    error_message text,

    provider_cost_amount numeric(12,6),
    provider_cost_currency text,

    queued_at timestamptz not null default now(),
    sent_at timestamptz,
    delivered_at timestamptz,
    read_at timestamptz,
    failed_at timestamptz,
    updated_at timestamptz not null default now(),

    constraint communication_deliveries_channel_check
        check (channel in ('email', 'sms', 'whatsapp')),
    constraint communication_deliveries_status_check
        check (status in (
            'queued',
            'accepted',
            'sent',
            'delivered',
            'read',
            'failed',
            'skipped'
        ))
);

create index if not exists idx_communication_deliveries_org_created
    on public.communication_deliveries (organisation_id, queued_at desc);

create index if not exists idx_communication_deliveries_provider_message
    on public.communication_deliveries (provider, provider_message_id)
    where provider_message_id is not null;

create index if not exists idx_communication_deliveries_status
    on public.communication_deliveries (organisation_id, status, queued_at desc);

-- ---------------------------------------------------------------------------
-- 5. Seed TournamentHQ service templates
-- ---------------------------------------------------------------------------

insert into public.communication_templates (
    organisation_id,
    code,
    name,
    category,
    message_class,
    subject_template,
    body_template,
    variables,
    provider_template_refs,
    system_defined,
    active
)
select
    null,
    seed.code,
    seed.name,
    seed.category,
    'service',
    seed.subject_template,
    seed.body_template,
    seed.variables::jsonb,
    '{}'::jsonb,
    true,
    true
from (
    values
    (
        'finance_payment_reminder',
        'Payment reminder',
        'finance',
        'Payment reminder from {{organisation_name}}',
        E'Hi {{recipient_first_name}},\n\nThis is a reminder that {{amount_outstanding}} remains outstanding for {{fee_description}}.{{due_line}}\n\nIf you have already paid, please ignore this message or contact {{organisation_name}}.\n\nThank you,\n{{organisation_name}}',
        '["organisation_name","recipient_first_name","amount_outstanding","fee_description","due_line"]'
    ),
    (
        'finance_overdue_reminder',
        'Overdue payment reminder',
        'finance',
        'Outstanding payment reminder from {{organisation_name}}',
        E'Hi {{recipient_first_name}},\n\nOur records show that {{amount_outstanding}} is currently overdue for {{fee_description}}.{{due_line}}\n\nPlease arrange payment when possible. If you have already paid, please ignore this reminder or contact {{organisation_name}}.\n\nThank you,\n{{organisation_name}}',
        '["organisation_name","recipient_first_name","amount_outstanding","fee_description","due_line"]'
    ),
    (
        'fixture_update',
        'Fixture update',
        'fixture',
        'Fixture update from {{organisation_name}}',
        E'Hi {{recipient_first_name}},\n\nThere is an update for {{team_name}}: {{fixture_summary}}.\n\n{{fixture_details}}\n\nThank you,\n{{organisation_name}}',
        '["organisation_name","recipient_first_name","team_name","fixture_summary","fixture_details"]'
    ),
    (
        'general_operational_message',
        'General operational message',
        'general',
        '{{organisation_name}} update',
        E'Hi {{recipient_first_name}},\n\n{{message_body}}\n\nThank you,\n{{organisation_name}}',
        '["organisation_name","recipient_first_name","message_body"]'
    )
) as seed(code, name, category, subject_template, body_template, variables)
where not exists (
    select 1
    from public.communication_templates existing
    where existing.organisation_id is null
      and existing.code = seed.code
);

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.communication_settings enable row level security;
alter table public.communication_contacts enable row level security;
alter table public.communication_templates enable row level security;
alter table public.communication_messages enable row level security;
alter table public.communication_recipients enable row level security;
alter table public.communication_deliveries enable row level security;

-- Settings ---------------------------------------------------------------
drop policy if exists communication_settings_member_select
    on public.communication_settings;
create policy communication_settings_member_select
on public.communication_settings
for select
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = communication_settings.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);

drop policy if exists communication_settings_manager_write
    on public.communication_settings;
create policy communication_settings_manager_write
on public.communication_settings
for all
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = communication_settings.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
)
with check (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = communication_settings.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);

-- Contacts ---------------------------------------------------------------
drop policy if exists communication_contacts_member_select
    on public.communication_contacts;
create policy communication_contacts_member_select
on public.communication_contacts
for select
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = communication_contacts.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);

drop policy if exists communication_contacts_manager_write
    on public.communication_contacts;
create policy communication_contacts_manager_write
on public.communication_contacts
for all
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = communication_contacts.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
)
with check (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = communication_contacts.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);

-- Templates --------------------------------------------------------------
drop policy if exists communication_templates_member_select
    on public.communication_templates;
create policy communication_templates_member_select
on public.communication_templates
for select
to authenticated
using (
    organisation_id is null
    or exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = communication_templates.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);

drop policy if exists communication_templates_manager_write
    on public.communication_templates;
create policy communication_templates_manager_write
on public.communication_templates
for all
to authenticated
using (
    organisation_id is not null
    and (
        exists (
            select 1
            from public.organisation_memberships om
            where om.organisation_id = communication_templates.organisation_id
              and om.user_id = auth.uid()
              and om.active = true
              and om.role in ('competition_manager', 'super_admin')
        )
        or exists (
            select 1
            from public.platform_admins pa
            where pa.user_id = auth.uid()
              and pa.active = true
        )
    )
)
with check (
    organisation_id is not null
    and (
        exists (
            select 1
            from public.organisation_memberships om
            where om.organisation_id = communication_templates.organisation_id
              and om.user_id = auth.uid()
              and om.active = true
              and om.role in ('competition_manager', 'super_admin')
        )
        or exists (
            select 1
            from public.platform_admins pa
            where pa.user_id = auth.uid()
              and pa.active = true
        )
    )
);

-- Audit tables are written by the authenticated Edge Function using the
-- service-role client. Organisation members may read their organisation's log.

drop policy if exists communication_messages_member_select
    on public.communication_messages;
create policy communication_messages_member_select
on public.communication_messages
for select
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = communication_messages.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);

drop policy if exists communication_recipients_member_select
    on public.communication_recipients;
create policy communication_recipients_member_select
on public.communication_recipients
for select
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = communication_recipients.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);

drop policy if exists communication_deliveries_member_select
    on public.communication_deliveries;
create policy communication_deliveries_member_select
on public.communication_deliveries
for select
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = communication_deliveries.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);

commit;
