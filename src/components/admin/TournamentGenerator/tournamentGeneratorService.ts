import { supabase } from '../../../lib/supabaseClient'
import type {
    ExistingFixture,
    GeneratedFixturePreview,
    GeneratorCompetitionTeam,
    GeneratorGroup,
    GeneratorMembership,
    GeneratorVenue,
} from './tournamentGeneratorTypes'

function throwSupabaseError(
    error: { message: string } | null,
    context: string
) {
    if (!error) return

    console.error(`${context}:`, error)
    throw new Error(error.message)
}

type CompetitionTeamRow = {
    id: string
    team_id: string
    teams:
        | {
        name: string
        published: boolean
        participation_status:
            | 'interested'
            | 'invited'
            | 'confirmed'
            | 'withdrawn'
        primary_home_venue_id: string | null
    }
        | {
        name: string
        published: boolean
        participation_status:
            | 'interested'
            | 'invited'
            | 'confirmed'
            | 'withdrawn'
        primary_home_venue_id: string | null
    }[]
        | null
}

function getRelatedTeam(
    relation: CompetitionTeamRow['teams']
) {
    if (!relation) {
        return null
    }

    if (Array.isArray(relation)) {
        return relation[0] ?? null
    }

    return relation
}

export const tournamentGeneratorService = {
    async getGroups(
        competitionId: string
    ): Promise<GeneratorGroup[]> {
        const { data, error } = await supabase
            .from('groups')
            .select('id, name, sort_order')
            .eq('competition_id', competitionId)
            .order('sort_order', {
                ascending: true,
            })
            .order('name', {
                ascending: true,
            })

        throwSupabaseError(
            error,
            'Failed to load competition groups'
        )

        return (data ?? []) as GeneratorGroup[]
    },

    async getTeams(
        competitionId: string
    ): Promise<GeneratorCompetitionTeam[]> {
        const { data, error } = await supabase
            .from('competition_teams')
            .select(`
                id,
                team_id,
                teams(
                    name,
                    published,
                    participation_status,
                    primary_home_venue_id
                )
            `)
            .eq('competition_id', competitionId)

        throwSupabaseError(
            error,
            'Failed to load competition teams'
        )

        const teams = (
            (data ?? []) as CompetitionTeamRow[]
        ).map((row) => {
            const team = getRelatedTeam(
                row.teams
            )

            return {
                id: row.id,
                team_id: row.team_id,
                name:
                    team?.name ??
                    'Unknown team',
                published:
                    team?.published ??
                    false,
                participation_status:
                    team?.participation_status ??
                    'interested',
                primary_home_venue_id:
                    team?.primary_home_venue_id ??
                    null,
            }
        })

        return teams.sort((left, right) =>
            left.name.localeCompare(
                right.name,
                undefined,
                {
                    sensitivity: 'base',
                }
            )
        )
    },

    async getMemberships(
        groupIds: string[]
    ): Promise<GeneratorMembership[]> {
        if (!groupIds.length) {
            return []
        }

        const { data, error } = await supabase
            .from('group_teams')
            .select(
                'group_id, competition_team_id'
            )
            .in('group_id', groupIds)

        throwSupabaseError(
            error,
            'Failed to load group allocations'
        )

        return (
            data ?? []
        ) as GeneratorMembership[]
    },

    async getVenues(
        competitionId: string
    ): Promise<GeneratorVenue[]> {
        const { data, error } = await supabase
            .from('venues')
            .select('id, name')
            .eq('competition_id', competitionId)
            .order('name', {
                ascending: true,
            })

        throwSupabaseError(
            error,
            'Failed to load competition venues'
        )

        return (data ?? []) as GeneratorVenue[]
    },

    async getExistingFixtures(
        competitionId: string
    ): Promise<ExistingFixture[]> {
        const { data, error } = await supabase
            .from('fixtures')
            .select(`
                id,
                group_id,
                stage,
                home_competition_team_id,
                away_competition_team_id
            `)
            .eq('competition_id', competitionId)

        throwSupabaseError(
            error,
            'Failed to check existing fixtures'
        )

        return (data ?? []) as ExistingFixture[]
    },

    async createFixtures(
        competitionId: string,
        fixtures: GeneratedFixturePreview[],
        publishImmediately: boolean
    ): Promise<void> {
        if (!fixtures.length) {
            throw new Error(
                'There are no generated fixtures to save.'
            )
        }

        const payload = fixtures.map(
            (fixture) => ({
                competition_id:
                competitionId,
                group_id:
                fixture.groupId,
                home_competition_team_id:
                fixture.homeCompetitionTeamId,
                away_competition_team_id:
                fixture.awayCompetitionTeamId,
                venue_id:
                fixture.venueId,
                stage:
                fixture.stage,
                kickoff_time:
                fixture.kickoffTime,
                status: 'scheduled',
                published:
                publishImmediately,
            })
        )

        const { error } = await supabase
            .from('fixtures')
            .insert(payload)

        throwSupabaseError(
            error,
            'Failed to save generated fixtures'
        )
    },
}