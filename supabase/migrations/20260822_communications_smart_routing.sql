-- TournamentHQ Enterprise
-- Communications Phase 4.3: automatic route preference
-- Date: 2026-08-22
--
-- The UI no longer asks administrators to choose Email / WhatsApp / SMS
-- for every message. TournamentHQ selects the best live route automatically.
-- This migration makes WhatsApp the preferred route once a real provider is
-- configured, with Email then SMS as automatic fallbacks.
--
-- Safe / re-runnable. No communication history is changed or deleted.

begin;

alter table public.communication_settings
    alter column default_channels
    set default array['whatsapp','email','sms']::text[];

-- Phase 4.1 seeded/defaulted organisations to Email only. Move only that
-- untouched default to the smart-routing order. Any organisation that already
-- has a deliberate custom ordering is preserved.
update public.communication_settings
set
    default_channels = array['whatsapp','email','sms']::text[],
    updated_at = now()
where default_channels = array['email']::text[];

commit;
