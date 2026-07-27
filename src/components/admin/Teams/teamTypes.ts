export type TeamParticipationStatus =
    | 'interested'
    | 'invited'
    | 'confirmed'
    | 'withdrawn'

export type DbTeam = {
    id: string
    organisation_id: string
    club_id: string | null
    name: string
    age_group: string | null
    year_group: number | null
    gender: string | null
    division: string | null
    home_kit_colour: string | null
    away_kit_colour: string | null
    logo_url: string | null
    notes: string | null
    published: boolean
    participation_status: TeamParticipationStatus
    primary_home_venue_id: string | null
    created_at?: string
}

export type ClubOption = {
    id: string
    name: string
}

export type TeamVenueOption = {
    id: string
    name: string
}

export type NewTeamVenueDraft = {
    groundName: string
    pitchName: string
}