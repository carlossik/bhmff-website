-- TournamentHQ Phase 1: terminology only. No changes to clubs or team data.
-- Existing organisations remain 'club'. Run through normal migration workflow.
BEGIN;
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS participant_terminology text NOT NULL DEFAULT 'club';
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organisations_participant_terminology_check'
      AND conrelid = 'public.organisations'::regclass
  ) THEN
    ALTER TABLE public.organisations
      ADD CONSTRAINT organisations_participant_terminology_check
      CHECK (participant_terminology IN ('club', 'school', 'university', 'academy', 'participant'));
  END IF;
END $$;
COMMIT;
-- To enable for the existing TeamNigeriaUK organisation AFTER confirming its slug:
-- UPDATE public.organisations SET participant_terminology='school' WHERE slug='<confirmed-slug>';
