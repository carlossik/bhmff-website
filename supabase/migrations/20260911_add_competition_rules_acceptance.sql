-- TournamentHQ competition rules acceptance gate
-- Run in Supabase SQL Editor before testing the Tournament Rules feature.

create table if not exists public.competition_rules (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    competition_id uuid not null references public.competitions(id) on delete cascade,
    title text not null default 'Tournament Rules',
    rules_text text not null default '',
    rules_url text,
    version integer not null default 1 check (version > 0),
    requires_acceptance boolean not null default false,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists competition_rules_one_active_per_competition_idx
    on public.competition_rules (competition_id)
    where active = true;

create index if not exists competition_rules_organisation_id_idx
    on public.competition_rules (organisation_id);

create table if not exists public.competition_rule_acceptances (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    competition_id uuid not null references public.competitions(id) on delete cascade,
    rule_id uuid not null references public.competition_rules(id) on delete cascade,
    rule_version integer not null check (rule_version > 0),
    user_id uuid not null references auth.users(id) on delete cascade,
    role_at_acceptance text not null,
    accepted_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create unique index if not exists competition_rule_acceptances_unique_user_version_idx
    on public.competition_rule_acceptances (rule_id, rule_version, user_id);

create index if not exists competition_rule_acceptances_competition_id_idx
    on public.competition_rule_acceptances (competition_id);

create index if not exists competition_rule_acceptances_user_id_idx
    on public.competition_rule_acceptances (user_id);

alter table public.competition_rules enable row level security;
alter table public.competition_rule_acceptances enable row level security;

DROP POLICY IF EXISTS competition_rules_member_select ON public.competition_rules;
CREATE POLICY competition_rules_member_select
ON public.competition_rules
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.organisation_memberships om
        WHERE om.organisation_id = competition_rules.organisation_id
          AND om.user_id = auth.uid()
          AND om.active = true
    )
    OR EXISTS (
        SELECT 1
        FROM public.platform_admins pa
        WHERE pa.user_id = auth.uid()
          AND pa.active = true
    )
);

DROP POLICY IF EXISTS competition_rules_manager_insert ON public.competition_rules;
CREATE POLICY competition_rules_manager_insert
ON public.competition_rules
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.organisation_memberships om
        WHERE om.organisation_id = competition_rules.organisation_id
          AND om.user_id = auth.uid()
          AND om.active = true
          AND om.role IN ('super_admin', 'competition_manager')
    )
    OR EXISTS (
        SELECT 1
        FROM public.platform_admins pa
        WHERE pa.user_id = auth.uid()
          AND pa.active = true
    )
);

DROP POLICY IF EXISTS competition_rules_manager_update ON public.competition_rules;
CREATE POLICY competition_rules_manager_update
ON public.competition_rules
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.organisation_memberships om
        WHERE om.organisation_id = competition_rules.organisation_id
          AND om.user_id = auth.uid()
          AND om.active = true
          AND om.role IN ('super_admin', 'competition_manager')
    )
    OR EXISTS (
        SELECT 1
        FROM public.platform_admins pa
        WHERE pa.user_id = auth.uid()
          AND pa.active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.organisation_memberships om
        WHERE om.organisation_id = competition_rules.organisation_id
          AND om.user_id = auth.uid()
          AND om.active = true
          AND om.role IN ('super_admin', 'competition_manager')
    )
    OR EXISTS (
        SELECT 1
        FROM public.platform_admins pa
        WHERE pa.user_id = auth.uid()
          AND pa.active = true
    )
);

DROP POLICY IF EXISTS competition_rule_acceptances_member_select ON public.competition_rule_acceptances;
CREATE POLICY competition_rule_acceptances_member_select
ON public.competition_rule_acceptances
FOR SELECT
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.organisation_memberships om
        WHERE om.organisation_id = competition_rule_acceptances.organisation_id
          AND om.user_id = auth.uid()
          AND om.active = true
          AND om.role IN ('super_admin', 'competition_manager')
    )
    OR EXISTS (
        SELECT 1
        FROM public.platform_admins pa
        WHERE pa.user_id = auth.uid()
          AND pa.active = true
    )
);

DROP POLICY IF EXISTS competition_rule_acceptances_self_insert ON public.competition_rule_acceptances;
CREATE POLICY competition_rule_acceptances_self_insert
ON public.competition_rule_acceptances
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.organisation_memberships om
        WHERE om.organisation_id = competition_rule_acceptances.organisation_id
          AND om.user_id = auth.uid()
          AND om.active = true
    )
);
