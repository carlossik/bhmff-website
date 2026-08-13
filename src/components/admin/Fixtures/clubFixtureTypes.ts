export type ClubSeasonStatus =
    | 'draft'
    | 'active'
    | 'completed'
    | 'archived'

export type ClubFixtureSlotStatus =
    | 'available'
    | 'proposed'
    | 'confirmed'
    | 'played'
    | 'cancelled'
    | 'unavailable'

export type ClubFixtureStatus =
    | 'proposed'
    | 'scheduled'
    | 'confirmed'
    | 'played'
    | 'cancelled'
    | 'postponed'
    | 'abandoned'

export type ClubFixtureType =
    | 'friendly'
    | 'league'
    | 'cup'
    | 'tournament'
    | 'other'

export type ClubHomeAway =
    | 'home'
    | 'away'
    | 'neutral'

export interface ClubSeason {
    id: string
    organisation_id: string
    name: string
    season_label: string
    start_date: string | null
    end_date: string | null
    status: ClubSeasonStatus
    created_at: string
    updated_at: string
}

export interface ClubOpponent {
    id: string
    organisation_id: string
    name: string
    contact_name: string | null
    contact_phone: string | null
    contact_email: string | null
    notes: string | null
    active: boolean
    created_at: string
    updated_at: string
}

export interface ClubFixtureSlot {
    id: string
    organisation_id: string
    season_id: string
    fixture_date: string
    slot_status: ClubFixtureSlotStatus
    slot_label: string | null
    reason: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface ClubFixture {
    id: string
    organisation_id: string
    season_id: string
    slot_id: string | null
    opponent_id: string | null
    fixture_date: string
    kickoff_time: string | null
    home_away: ClubHomeAway
    fixture_type: ClubFixtureType
    venue_name: string | null
    venue_address: string | null
    status: ClubFixtureStatus
    opponent_contact_name: string | null
    opponent_contact_phone: string | null
    opponent_contact_email: string | null
    referee_name: string | null
    notes: string | null
    published: boolean
    cancellation_reason: string | null
    replaced_fixture_id: string | null
    created_at: string
    updated_at: string
}

export interface ClubSeasonFormValues {
    name: string
    season_label: string
    start_date: string
    end_date: string
    status: ClubSeasonStatus
}

export interface ClubOpponentFormValues {
    name: string
    contact_name: string
    contact_phone: string
    contact_email: string
    notes: string
    active: boolean
}

export interface ClubFixtureSlotFormValues {
    fixture_date: string
    slot_status: ClubFixtureSlotStatus
    slot_label: string
    reason: string
    notes: string
}

export interface ClubFixtureFormValues {
    slot_id: string
    opponent_id: string
    fixture_date: string
    kickoff_time: string
    home_away: ClubHomeAway
    fixture_type: ClubFixtureType
    venue_name: string
    venue_address: string
    status: ClubFixtureStatus
    opponent_contact_name: string
    opponent_contact_phone: string
    opponent_contact_email: string
    referee_name: string
    notes: string
    published: boolean
    cancellation_reason: string
    replaced_fixture_id: string
}
