import { supabase } from '../../lib/supabaseClient'

export type ClubPublicSeason = {
    id: string
    name: string
    seasonLabel: string
}

export type ClubPublicTeam = {
    id: string
    name: string
    ageGroup: string | null
    yearGroup: number | null
    gender: string | null
    division: string | null
    logoUrl: string | null
}

export type ClubPublicFixture = {
    id: string
    teamId: string | null
    fixtureDate: string
    kickoffTime: string | null
    homeAway: string
    fixtureType: string
    venueName: string | null
    status: string
    opponentName: string | null
}

export type ClubPublicResult = {
    id: string
    fixtureId: string
    homeScore: number
    awayScore: number
    playerOfTheMatch: string | null
}

export type ClubPublicSquadMember = {
    id: string
    teamId: string | null
    squadNumber: number | null
    position: string | null
    playerName: string
}

export type ClubPublicGoal = {
    id: string
    fixtureId: string
    playerName: string
    squadMemberId: string | null
}

export type ClubPublicData = {
    season: ClubPublicSeason | null
    teams: ClubPublicTeam[]
    fixtures: ClubPublicFixture[]
    results: ClubPublicResult[]
    squad: ClubPublicSquadMember[]
    goals: ClubPublicGoal[]
}

type SupabaseRpcError = {
    message: string
    code?: string
    details?: string
    hint?: string
}

const emptyClubPublicData: ClubPublicData = {
    season: null,
    teams: [],
    fixtures: [],
    results: [],
    squad: [],
    goals: [],
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string | null {
    return typeof value === 'string' ? value : null
}

function nullableStringValue(value: unknown): string | null {
    return value === null || typeof value === 'string' ? value : null
}

function numberValue(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : null
}

function arrayValue(value: unknown): unknown[] {
    return Array.isArray(value) ? value : []
}

function parseSeason(value: unknown): ClubPublicSeason | null {
    if (value === null) {
        return null
    }

    if (!isRecord(value)) {
        throw new Error('Public club season payload is invalid.')
    }

    const id = stringValue(value.id)
    const name = stringValue(value.name)
    const seasonLabel = stringValue(value.seasonLabel)

    if (!id || !name || !seasonLabel) {
        throw new Error('Public club season payload is incomplete.')
    }

    return {
        id,
        name,
        seasonLabel,
    }
}

function parseTeam(value: unknown): ClubPublicTeam {
    if (!isRecord(value)) {
        throw new Error('Public club team payload is invalid.')
    }

    const id = stringValue(value.id)
    const name = stringValue(value.name)
    const yearGroupValue = value.yearGroup

    if (!id || !name) {
        throw new Error('Public club team payload is incomplete.')
    }

    return {
        id,
        name,
        ageGroup: nullableStringValue(value.ageGroup),
        yearGroup:
            yearGroupValue === null
                ? null
                : numberValue(yearGroupValue),
        gender: nullableStringValue(value.gender),
        division: nullableStringValue(value.division),
        logoUrl: nullableStringValue(value.logoUrl),
    }
}

function parseFixture(value: unknown): ClubPublicFixture {
    if (!isRecord(value)) {
        throw new Error('Public club fixture payload is invalid.')
    }

    const id = stringValue(value.id)
    const fixtureDate = stringValue(value.fixtureDate)
    const homeAway = stringValue(value.homeAway)
    const fixtureType = stringValue(value.fixtureType)
    const status = stringValue(value.status)

    if (!id || !fixtureDate || !homeAway || !fixtureType || !status) {
        throw new Error('Public club fixture payload is incomplete.')
    }

    return {
        id,
        teamId: nullableStringValue(value.teamId),
        fixtureDate,
        kickoffTime: nullableStringValue(value.kickoffTime),
        homeAway,
        fixtureType,
        venueName: nullableStringValue(value.venueName),
        status,
        opponentName: nullableStringValue(value.opponentName),
    }
}

function parseResult(value: unknown): ClubPublicResult {
    if (!isRecord(value)) {
        throw new Error('Public club result payload is invalid.')
    }

    const id = stringValue(value.id)
    const fixtureId = stringValue(value.fixtureId)
    const homeScore = numberValue(value.homeScore)
    const awayScore = numberValue(value.awayScore)

    if (!id || !fixtureId || homeScore === null || awayScore === null) {
        throw new Error('Public club result payload is incomplete.')
    }

    return {
        id,
        fixtureId,
        homeScore,
        awayScore,
        playerOfTheMatch: nullableStringValue(value.playerOfTheMatch),
    }
}

function parseSquadMember(value: unknown): ClubPublicSquadMember {
    if (!isRecord(value)) {
        throw new Error('Public club squad payload is invalid.')
    }

    const id = stringValue(value.id)
    const playerName = stringValue(value.playerName)
    const squadNumberValue = value.squadNumber

    if (!id || !playerName) {
        throw new Error('Public club squad payload is incomplete.')
    }

    return {
        id,
        teamId: nullableStringValue(value.teamId),
        squadNumber:
            squadNumberValue === null
                ? null
                : numberValue(squadNumberValue),
        position: nullableStringValue(value.position),
        playerName,
    }
}

function parseGoal(value: unknown): ClubPublicGoal {
    if (!isRecord(value)) {
        throw new Error('Public club goal payload is invalid.')
    }

    const id = stringValue(value.id)
    const fixtureId = stringValue(value.fixtureId)
    const playerName = stringValue(value.playerName)

    if (!id || !fixtureId || !playerName) {
        throw new Error('Public club goal payload is incomplete.')
    }

    return {
        id,
        fixtureId,
        playerName,
        squadMemberId: nullableStringValue(value.squadMemberId),
    }
}

function parseClubPublicData(value: unknown): ClubPublicData {
    if (value === null) {
        throw new Error(
            'This club public website is not currently available.',
        )
    }

    if (!isRecord(value)) {
        throw new Error('Public club data payload is invalid.')
    }

    return {
        season: parseSeason(value.season ?? null),
        teams: arrayValue(value.teams).map(parseTeam),
        fixtures: arrayValue(value.fixtures).map(parseFixture),
        results: arrayValue(value.results).map(parseResult),
        squad: arrayValue(value.squad).map(parseSquadMember),
        goals: arrayValue(value.goals).map(parseGoal),
    }
}

function formatRpcError(error: SupabaseRpcError): string {
    const parts = [error.message, error.details, error.hint].filter(
        (part): part is string => Boolean(part?.trim()),
    )

    return parts.join(' ')
}

export const clubPublicService = {
    async getClubPublicData(
        organisationId: string,
    ): Promise<ClubPublicData> {
        const cleanOrganisationId = organisationId.trim()

        if (!cleanOrganisationId) {
            return emptyClubPublicData
        }

        const { data, error } = await supabase.rpc(
            'get_public_club_data',
            {
                p_organisation_id: cleanOrganisationId,
            },
        )

        if (error) {
            const rpcError = error as SupabaseRpcError
            console.error('Failed to load public club data:', rpcError)
            throw new Error(formatRpcError(rpcError))
        }

        return parseClubPublicData(data)
    },
}
