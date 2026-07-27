export type FixtureStatus =
    | 'scheduled'
    | 'postponed'
    | 'completed'
    | 'cancelled'

export type Fixture = {
    id: string
    competition_id: string | null
    home_competition_team_id: string | null
    away_competition_team_id: string | null
    venue_id: string | null
    group_id: string | null
    stage: string
    kickoff_time: string | null
    status: FixtureStatus
    created_at: string | null
}

export type FixtureTeam = {
    competition_team_id: string
    team_id: string
    team_name: string
    club_name: string | null
    logo_url: string | null
}

export type FixtureVenue = {
    id: string
    name: string
    address: string | null
    postcode: string | null
}

export type FixtureGroup = {
    id: string
    name: string
    sort_order: number
}

export type FixtureGroupMembership = {
    group_id: string
    competition_team_id: string
}

export type Competition = {
    id: string
    name: string
    status: string
}

export type FixtureFormValues = {
    stage: string
    group_id: string
    home_competition_team_id: string
    away_competition_team_id: string
    venue_id: string
    kickoff_time: string
    status: FixtureStatus
}