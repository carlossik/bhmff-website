-- TournamentHQ competition rules: public visibility and public-site access.
-- Existing acceptance/version tables from 20260911 are preserved.

alter table public.competition_rules
    add column if not exists public_visible boolean not null default false;

create index if not exists competition_rules_public_active_idx
    on public.competition_rules (organisation_id, competition_id)
    where active = true and public_visible = true;

DROP POLICY IF EXISTS competition_rules_public_select ON public.competition_rules;
CREATE POLICY competition_rules_public_select
ON public.competition_rules
FOR SELECT
TO anon, authenticated
USING (
    active = true
    AND public_visible = true
    AND EXISTS (
        SELECT 1
        FROM public.competitions c
        JOIN public.organisations o
          ON o.id = c.organisation_id
        WHERE c.id = competition_rules.competition_id
          AND c.organisation_id = competition_rules.organisation_id
          AND c.published = true
          AND c.status = 'ACTIVE'
          AND o.status = 'active'
          AND o.public_site_enabled = true
    )
);
