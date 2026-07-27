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

export type Weekday =
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday'

export type TournamentPlanSource =
    | 'manual'
    | 'wizard'
    | 'ai'

export type TournamentPlanStatus =
    | 'draft'
    | 'validated'
    | 'generated'
    | 'published'

export type ConstraintPriority =
    | 'required'
    | 'preferred'

export type GeneratorCompetition = {
    id: string
    name: string
}

export type GeneratorGroup = {
    id: string
    name: string
    sort_order: number
    permitted_match_days: Weekday[]
}

export type GeneratorCompetitionTeam = {
    id: string
    team_id: string
    name: string
    published: boolean
    participation_status:
        | 'interested'
        | 'invited'
        | 'confirmed'
        | 'withdrawn'
    primary_home_venue_id: string | null
    available_match_days: Weekday[]
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

export type TournamentCalendarPlan = {
    startDate: string
    endDate: string
    permittedMatchDays: Weekday[]
    kickoffTimes: string[]
    daysBetweenRounds: number
}

export type TournamentVenuePlan = {
    venueId: string
    venueName: string
    enabled: boolean
    availableMatchDays: Weekday[]
    kickoffTimes: string[]
    pitchCount: number
}

export type TournamentTeamPlan = {
    competitionTeamId: string
    teamName: string
    groupId: string | null
    availableMatchDays: Weekday[]
    preferredVenueId: string | null
    confirmed: boolean
}

export type TournamentGroupPlan = {
    groupId: string
    groupName: string
    permittedMatchDays: Weekday[]
    competitionTeamIds: string[]
}

export type TournamentConstraintPlan = {
    avoidDoubleHeaders: boolean
    minimumRestDays: number
    maximumMatchesPerDay: number
    maximumMatchesPerWeek: number
    balanceHomeAndAway: boolean
    enforceTeamAvailability: boolean
    enforceGroupMatchDays: boolean
    enforceVenueAvailability: boolean
    teamAvailabilityPriority: ConstraintPriority
    groupMatchDayPriority: ConstraintPriority
    venueAvailabilityPriority: ConstraintPriority
}

export type TournamentSchedulingPlan = {
    mode: CompetitionMode
    venueAssignmentMode: VenueAssignmentMode
    defaultVenueId: string | null
    confirmedOnly: boolean
    matchesPerTeam: number
    randomiseCupDraw: boolean
    publishImmediately: boolean
}

export type TournamentAiPlan = {
    originalPrompt: string
    summary: string
    assumptions: string[]
    warnings: string[]
}

export type TournamentHealthIssueSeverity =
    | 'error'
    | 'warning'
    | 'suggestion'

export type TournamentHealthIssue = {
    id: string
    severity: TournamentHealthIssueSeverity
    title: string
    message: string
}

export type TournamentHealthPlan = {
    score: number
    valid: boolean
    issues: TournamentHealthIssue[]
}

export type TournamentPlan = {
    id: string
    competitionId: string
    competitionName: string

    source: TournamentPlanSource
    status: TournamentPlanStatus

    createdAt: string
    updatedAt: string

    calendar: TournamentCalendarPlan
    scheduling: TournamentSchedulingPlan
    constraints: TournamentConstraintPlan

    groups: TournamentGroupPlan[]
    teams: TournamentTeamPlan[]
    venues: TournamentVenuePlan[]

    ai: TournamentAiPlan
    health: TournamentHealthPlan
}

export const createEmptyTournamentPlan = (
    competitionId: string,
    competitionName: string
): TournamentPlan => {
    const timestamp = new Date().toISOString()

    return {
        id: crypto.randomUUID(),
        competitionId,
        competitionName,

        source: 'manual',
        status: 'draft',

        createdAt: timestamp,
        updatedAt: timestamp,

        calendar: {
            startDate: '',
            endDate: '',
            permittedMatchDays: [],
            kickoffTimes: [],
            daysBetweenRounds: 7,
        },

        scheduling: {
            mode: 'group_full',
            venueAssignmentMode: 'selected_venue',
            defaultVenueId: null,
            confirmedOnly: true,
            matchesPerTeam: 2,
            randomiseCupDraw: true,
            publishImmediately: false,
        },

        constraints: {
            avoidDoubleHeaders: true,
            minimumRestDays: 1,
            maximumMatchesPerDay: 1,
            maximumMatchesPerWeek: 2,
            balanceHomeAndAway: true,
            enforceTeamAvailability: true,
            enforceGroupMatchDays: true,
            enforceVenueAvailability: true,
            teamAvailabilityPriority: 'required',
            groupMatchDayPriority: 'required',
            venueAvailabilityPriority: 'required',
        },

        groups: [],
        teams: [],
        venues: [],

        ai: {
            originalPrompt: '',
            summary: '',
            assumptions: [],
            warnings: [],
        },

        health: {
            score: 0,
            valid: false,
            issues: [],
        },
    }
}