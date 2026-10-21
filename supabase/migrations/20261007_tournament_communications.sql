begin;
alter table public.communication_messages add column if not exists competition_id uuid references public.competitions(id) on delete set null;
create index if not exists communication_messages_competition_idx on public.communication_messages(organisation_id, competition_id, created_at desc);
alter table public.communication_recipients add column if not exists official_user_id uuid references auth.users(id) on delete set null;
create table if not exists public.competition_communication_contacts (
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    competition_id uuid not null references public.competitions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
    whatsapp_opt_in boolean not null default false,
    consent_recorded_by uuid not null references auth.users(id),
    consent_recorded_at timestamptz not null default now(),
    primary key (competition_id, user_id)
);
alter table public.competition_communication_contacts enable row level security;
alter table public.competition_communication_contacts force row level security;
revoke all on public.competition_communication_contacts from public, anon, authenticated;
grant select, insert, update, delete on public.competition_communication_contacts to service_role;
-- Competition contacts and official addresses are only exposed by the authenticated
-- communications function after active membership and competition ownership checks.
create or replace function public.validate_competition_communication_scope()
returns trigger language plpgsql set search_path = public as $$
begin
    if not exists (select 1 from public.competitions c where c.id = new.competition_id and c.organisation_id = new.organisation_id) then
        raise exception 'Competition does not belong to the message organisation';
    end if;
    return new;
end;
$$;
drop trigger if exists communication_message_competition_scope on public.communication_messages;
create trigger communication_message_competition_scope before insert or update of competition_id, organisation_id on public.communication_messages
for each row when (new.competition_id is not null) execute function public.validate_competition_communication_scope();
drop trigger if exists communication_contact_competition_scope on public.competition_communication_contacts;
create trigger communication_contact_competition_scope before insert or update of competition_id, organisation_id on public.competition_communication_contacts
for each row execute function public.validate_competition_communication_scope();
commit;
