-- ============================================================================
-- Add competition ownership to media
-- ============================================================================

ALTER TABLE public.media
    ADD COLUMN IF NOT EXISTS competition_id uuid;

-- Media linked to a fixture can inherit the fixture's competition.
UPDATE public.media AS m
SET competition_id = f.competition_id
    FROM public.fixtures AS f
WHERE m.fixture_id = f.id
  AND m.competition_id IS NULL;

-- For organisations that currently have exactly one competition,
-- safely associate existing organisation media with that competition.
WITH single_competition_organisations AS (
    SELECT
        organisation_id,
        MIN(id::text)::uuid AS competition_id
    FROM public.competitions
    GROUP BY organisation_id
    HAVING COUNT(*) = 1
)
UPDATE public.media AS m
SET competition_id = single_org.competition_id
    FROM single_competition_organisations AS single_org
WHERE m.organisation_id = single_org.organisation_id
  AND m.competition_id IS NULL;

ALTER TABLE public.media
DROP CONSTRAINT IF EXISTS media_competition_id_fkey;

ALTER TABLE public.media
    ADD CONSTRAINT media_competition_id_fkey
        FOREIGN KEY (competition_id)
            REFERENCES public.competitions(id)
            ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS
    media_organisation_competition_idx
    ON public.media (
    organisation_id,
    competition_id
    );

CREATE INDEX IF NOT EXISTS
    media_competition_status_idx
    ON public.media (
    competition_id,
    status
    );