export type FixtureStatus = 'scheduled' | 'postponed' | 'completed' | 'cancelled'

export type Fixture = {
    id: string
    festival_id: string | null
    home_team_id: string | null
    away_team_id: string | null
    venue_id: string | null
    stage: string
    kickoff_time: string | null
    status: FixtureStatus
    created_at: string | null
}

export type FixtureTeam = {
    id: string
    name: string
}

export type FixtureVenue = {
    id: string
    name: string
    address: string | null
    postcode: string | null
}

export type Festival = {
    id: string
    name: string
    year: number
}

export type FixtureFormValues = {
    stage: string
    home_team_id: string
    away_team_id: string
    venue_id: string
    kickoff_time: string
    status: FixtureStatus
}