export type FixtureStatus =
    | 'scheduled'
    | 'postponed'
    | 'completed'
    | 'cancelled'

export type MatchFormat = '5v5' | '7v7' | '9v9' | '11v11'

export const MATCH_FORMATS: readonly MatchFormat[] = [
    '5v5',
    '7v7',
    '9v9',
    '11v11',
]

export type FixtureOfficialSelections = {
    referee_official_id: string
    assistant_referee_1_official_id: string
    assistant_referee_2_official_id: string
    fourth_official_id: string
}

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
    match_format: MatchFormat
    created_at: string | null
}

export type FixtureTeam = {
    competition_team_id: string
    team_id: string
    primary_home_venue_id: string | null
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

export type FixtureFormValues = FixtureOfficialSelections & {
    stage: string
    group_id: string
    home_competition_team_id: string
    away_competition_team_id: string
    venue_id: string
    kickoff_time: string
    status: FixtureStatus
    match_format?: MatchFormat
}

export type FixtureAuditEntry = {
    id: string
    fixture_id: string
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    source: 'fixture' | 'official_assignment'
    actor_user_id: string | null
    actor_name: string | null
    actor_email: string | null
    changed_fields: string[]
    before_data: Record<string, unknown> | null
    after_data: Record<string, unknown> | null
    changed_at: string
}
