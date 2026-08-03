-- ============================================================================
-- Migration: 20260802_public_competition_rls.sql
--
-- Purpose:
-- Allow anonymous visitors to read published competitions for organisations
-- that have their public site enabled.
--
-- This fixes public websites such as:
--   - bhmff.co.uk
--   - /o/bhmff
--   - future TournamentHQ organisation public sites
--
-- ============================================================================
-- Remove any previous version
-- ============================================================================

DROP POLICY IF EXISTS
    "Public can read published competitions"
ON public.competitions;

-- ============================================================================
-- Public SELECT policy
-- ============================================================================

CREATE POLICY
    "Public can read published competitions"
ON public.competitions
FOR SELECT
                    TO anon, authenticated
                    USING (
                    published = true
                    AND status = 'ACTIVE'
                    AND EXISTS (
                    SELECT 1
                    FROM public.organisations o
                    WHERE o.id = competitions.organisation_id
                    AND o.status = 'active'
                    AND o.public_site_enabled = true
                    )
                    );

-- ============================================================================
-- Documentation
--
-- Anonymous users can now read only:
--   • Published competitions
--   • ACTIVE competitions
--   • Competitions belonging to organisations whose public site is enabled
--
-- This policy is intentionally narrow and supports both the legacy public
-- websites and the new /o/:organisationSlug multi-tenant architecture.
-- ============================================================================