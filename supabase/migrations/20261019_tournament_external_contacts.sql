-- Competition-only contact directory; no TournamentHQ account is required.
begin;
create table if not exists public.competition_external_contacts (
 id uuid primary key default gen_random_uuid(),
 organisation_id uuid not null references public.organisations(id) on delete cascade,
 competition_id uuid not null references public.competitions(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 1 and 120),
 role text not null check (role in ('referee','organiser','match_official','other')),
 email text,
 phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
 whatsapp_opt_in boolean not null default false,
 consent_recorded_by uuid references auth.users(id),
 consent_recorded_at timestamptz,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint competition_external_contact_method check (email is not null or phone_e164 is not null),
 constraint competition_external_consent_proof check (not whatsapp_opt_in or (consent_recorded_by is not null and consent_recorded_at is not null))
);
create index if not exists competition_external_contacts_scope_idx on public.competition_external_contacts(organisation_id,competition_id,active);
alter table public.competition_external_contacts enable row level security;
alter table public.competition_external_contacts force row level security;
revoke all on public.competition_external_contacts from public, anon, authenticated;
grant select,insert,update,delete on public.competition_external_contacts to service_role;
drop trigger if exists competition_external_contacts_scope on public.competition_external_contacts;
create trigger competition_external_contacts_scope before insert or update of competition_id, organisation_id
on public.competition_external_contacts for each row execute function public.validate_competition_communication_scope();
alter table public.communication_recipients add column if not exists tournament_contact_id uuid references public.competition_external_contacts(id) on delete set null;
commit;
