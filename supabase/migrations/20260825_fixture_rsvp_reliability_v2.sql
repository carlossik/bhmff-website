-- TournamentHQ Fixture RSVP reliability hardening
-- 2026-08-25
-- Add explicit trialist eligibility and retain phone contact alongside email.

begin;

alter table public.club_squad_members
    drop constraint if exists club_squad_members_registration_status_check;

alter table public.club_squad_members
    add constraint club_squad_members_registration_status_check
    check (
        registration_status in (
            'pending',
            'registered',
            'trialist',
            'not_registered',
            'inactive'
        )
    );

alter table public.club_fixture_availability_recipients
    add column if not exists recipient_phone text;

comment on column public.club_fixture_availability_recipients.recipient_phone is
    'Player/parent/guardian phone snapshot for RSVP contact diagnostics and future SMS/WhatsApp delivery.';

commit;
