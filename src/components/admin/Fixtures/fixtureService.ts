import { supabase } from '../../../lib/supabaseClient'
import type {
    Fixture,
    FixtureFormValues,
    FixtureGroup,
    FixtureGroupMembership,
    FixtureTeam,
    FixtureVenue,
} from './fixtureTypes'

function throwSupabaseError(
    error: { message: string } | null,
    context: string
) {
    if (!error) return
    console.error(`${context}:`, error)
    throw new Error(error.message)
}

function buildFixturePayload(
    values: FixtureFormValues
) {
    const isGroupStage =
        values.stage === 'Group Stage'

    return {
        group_id: isGroupStage
            ? values.group_id || null
            : null,
        home_competition_team_id:
            values.home_competition_team_id || null,
        away_competition_team_id:
            values.away_competition_team_id || null,
        venue_id: values.venue_id || null,
        stage: values.stage.trim(),
        kickoff_time: values.kickoff_time
            ? new Date(values.kickoff_time).toISOString()
            : null,
        status: values.status,
    }
}

export const fixtureService = {
    async getFixtures(
        competitionId: string
    ): Promise<Fixture[]> {
        const { data, error } = await supabase
            .from('fixtures')
            .select('*')
            .eq('competition_id', competitionId)
            .order('kickoff_time', {
                ascending: true,
            })

        throwSupabaseError(
            error,
            'Failed to load fixtures'
        )

        return (data ?? []) as Fixture[]
    },

    async getTeams(
        competitionId: string
    ): Promise<FixtureTeam[]> {
        const { data, error } = await supabase
            .from('competition_teams')
            .select(`
                id,
                team_id,
                teams(
                    name,
                    logo_url,
                    clubs(name)
                )
            `)
            .eq('competition_id', competitionId)
            .order('team_id')

        throwSupabaseError(
            error,
            'Failed to load teams'
        )

        return (
            data?.map((row: any) => {
                const teamRow =
                    Array.isArray(row.teams)
                        ? row.teams[0]
                        : row.teams
                const clubRow =
                    Array.isArray(teamRow?.clubs)
                        ? teamRow.clubs[0]
                        : teamRow?.clubs

                return {
                    competition_team_id: row.id,
                    team_id: row.team_id,
                    team_name: teamRow?.name ?? '',
                    club_name: clubRow?.name ?? null,
                    logo_url: teamRow?.logo_url ?? null,
                }
            }) ?? []
        )
    },

    async getVenues(
        competitionId: string
    ): Promise<FixtureVenue[]> {
        const { data, error } = await supabase
            .from('venues')
            .select('id,name,address,postcode')
            .eq('competition_id', competitionId)
            .order('name')

        throwSupabaseError(
            error,
            'Failed to load venues'
        )

        return (data ?? []) as FixtureVenue[]
    },

    async getGroups(
        competitionId: string
    ): Promise<FixtureGroup[]> {
        const { data, error } = await supabase
            .from('groups')
            .select('id,name,sort_order')
            .eq('competition_id', competitionId)
            .order('sort_order')

        throwSupabaseError(
            error,
            'Failed to load groups'
        )

        return (data ?? []) as FixtureGroup[]
    },

    async getGroupMemberships(
        groupIds: string[]
    ): Promise<FixtureGroupMembership[]> {
        if (!groupIds.length) return []

        const { data, error } = await supabase
            .from('group_teams')
            .select('group_id,competition_team_id')
            .in('group_id', groupIds)

        throwSupabaseError(
            error,
            'Failed to load group memberships'
        )

        return (
            data ?? []
        ) as FixtureGroupMembership[]
    },

    async createFixture(
        competitionId: string,
        values: FixtureFormValues
    ): Promise<Fixture> {
        const { data, error } = await supabase
            .from('fixtures')
            .insert({
                competition_id: competitionId,
                ...buildFixturePayload(values),
            })
            .select('*')
            .single()

        throwSupabaseError(
            error,
            'Failed to create fixture'
        )

        if (!data) {
            throw new Error(
                'The fixture was created but could not be returned.'
            )
        }

        return data as Fixture
    },

    async updateFixture(
        fixtureId: string,
        values: FixtureFormValues
    ): Promise<Fixture> {
        const { data, error } = await supabase
            .from('fixtures')
            .update(buildFixturePayload(values))
            .eq('id', fixtureId)
            .select('*')
            .single()

        throwSupabaseError(
            error,
            'Failed to update fixture'
        )

        if (!data) {
            throw new Error(
                'The fixture was updated but could not be returned.'
            )
        }

        return data as Fixture
    },

    async deleteFixture(
        fixtureId: string
    ): Promise<void> {
        const { error } = await supabase
            .from('fixtures')
            .delete()
            .eq('id', fixtureId)

        throwSupabaseError(
            error,
            'Failed to delete fixture'
        )
    },
}