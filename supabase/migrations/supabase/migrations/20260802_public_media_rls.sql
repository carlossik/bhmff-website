-- ============================================================================
-- Migration: 20260802_public_media_rls.sql
--
-- Purpose:
-- Allow anonymous visitors to read published media belonging to an active,
-- published competition and an active organisation with its public site enabled.
-- ============================================================================

DROP POLICY IF EXISTS
    "Public can read published media"
ON public.media;

CREATE POLICY
    "Public can read published media"
ON public.media
FOR SELECT
                    TO anon, authenticated
                    USING (
                    status = 'published'
                    AND organisation_id IS NOT NULL
                    AND competition_id IS NOT NULL
                    AND EXISTS (
                    SELECT 1
                    FROM public.organisations o
                    WHERE o.id = media.organisation_id
                    AND o.status = 'active'
                    AND o.public_site_enabled = true
                    )
                    AND EXISTS (
                    SELECT 1
                    FROM public.competitions c
                    WHERE c.id = media.competition_id
                    AND c.organisation_id = media.organisation_id
                    AND c.published = true
                    AND c.status = 'ACTIVE'
                    )
                    );