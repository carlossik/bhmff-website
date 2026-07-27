export type CompetitionMode =
    | 'group_full'
    | 'group_limited'
    | 'league_single'
    | 'league_double'
    | 'knockout'
    | 'manual'

export type VenueAssignmentMode =
    | 'home_team'
    | 'selected_venue'
    | 'unassigned'

export type GeneratorCompetition = {
    id: string
    name: string
}

export type GeneratorGroup = {
    id: string
    name: string
    sort_order: number
}

export type GeneratorCompetitionTeam = {
    id: string
    team_id: string
    name: string
    club_name: string | null
    published: boolean
    participation_status:
        | 'interested'
        | 'invited'
        | 'confirmed'
        | 'withdrawn'
    primary_home_venue_id: string | null
}

export type GeneratorMembership = {
    group_id: string
    competition_team_id: string
}

export type GeneratorVenue = {
    id: string
    name: string
}

export type ExistingFixture = {
    id: string
    group_id: string | null
    stage: string
    home_competition_team_id: string
    away_competition_team_id: string
}

export type GeneratedFixturePreview = {
    previewId: string

    groupId: string | null
    groupName: string

    stage: string
    roundNumber: number

    homeCompetitionTeamId: string
    awayCompetitionTeamId: string

    homeTeamName: string
    awayTeamName: string

    kickoffTime: string

    venueId: string | null
    venueName: string
}

export type GeneratorConfig = {
    mode: CompetitionMode

    startDateTime: string

    daysBetweenRounds: number

    venueAssignmentMode: VenueAssignmentMode

    venueId: string

    publishImmediately: boolean

    confirmedOnly: boolean

    matchesPerTeam: number

    randomiseCupDraw: boolean
}