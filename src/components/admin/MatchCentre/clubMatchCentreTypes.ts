export type ClubMatchSquadStatus =
    | 'draft'
    | 'confirmed'
    | 'completed'

export type ClubMatchSelectionRole =
    | 'starter'
    | 'substitute'

export type ClubMatchAppearanceStatus =
    | 'selected'
    | 'played'
    | 'unused_substitute'
    | 'absent'

export type ClubPlayerRegistrationStatus =
    | 'pending'
    | 'registered'
    | 'not_registered'
    | 'inactive'

export type ClubFixtureStatus =
    | 'proposed'
    | 'scheduled'
    | 'confirmed'
    | 'played'
    | 'cancelled'
    | 'postponed'
    | 'abandoned'

export interface ClubMatchCentreSeason {
    id: string
    organisationId: string
    name: string
    seasonLabel: string
    startDate: string | null
    endDate: string | null
    status: string
}

export interface ClubMatchCentreTeam {
    id: string
    name: string
    shortName: string | null
    teamSeasonStatus: string
}

export interface ClubMatchCentreFixture {
    id: string
    organisationId: string
    seasonId: string
    teamId: string
    opponentId: string | null
    opponentName: string
    fixtureDate: string
    kickoffTime: string | null
    homeAway: 'home' | 'away' | 'neutral'
    fixtureType: string
    venueName: string | null
    venueAddress: string | null
    status: ClubFixtureStatus
    published: boolean
    matchSquadId: string | null
    matchSquadStatus: ClubMatchSquadStatus | null
    matchSquadMemberCount: number
}

export interface ClubMatchCentreRosterPlayer {
    squadMemberId: string
    playerId: string
    playerName: string
    squadNumber: number | null
    position: string | null
    registrationStatus: ClubPlayerRegistrationStatus
    active: boolean
}

export interface ClubMatchCentreSquadMember {
    id: string
    matchSquadId: string
    squadMemberId: string
    selectionRole: ClubMatchSelectionRole
    appearanceStatus: ClubMatchAppearanceStatus
    squadNumber: number | null
    position: string | null
    playerName: string
    isCaptain: boolean
    isGoalkeeper: boolean
    sortOrder: number
}

export interface ClubMatchCentreSquad {
    id: string
    organisationId: string
    seasonId: string
    teamId: string
    fixtureId: string
    status: ClubMatchSquadStatus
    published: boolean
    notes: string | null
    members: ClubMatchCentreSquadMember[]
}

export interface ClubMatchCentreSelection {
    squadMemberId: string
    selectionRole: ClubMatchSelectionRole
    isCaptain: boolean
    isGoalkeeper: boolean
}

export interface SaveClubMatchCentreSquadInput {
    organisationId: string
    fixtureId: string
    status: 'draft' | 'confirmed'
    notes: string
    published: boolean
    members: ClubMatchCentreSelection[]
}

export interface SaveClubMatchCentreSquadResult {
    matchSquadId: string
    fixtureId: string
    status: ClubMatchSquadStatus
    published: boolean
    memberCount: number
}
