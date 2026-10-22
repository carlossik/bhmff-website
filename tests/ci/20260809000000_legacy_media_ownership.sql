-- CI ONLY: reconstruct media ownership fields that predate the
-- 20260810_fix_media_multitenant_uniqueness.sql migration.
-- Do not deploy to the hosted Supabase project.
-- This patch preserves the existing migration and adds only its prerequisites.

alter table public.media
    add column if not exists organisation_id uuid
        references public.organisations(id) on delete cascade,
    add column if not exists competition_id uuid
        references public.competitions(id) on delete set null;
