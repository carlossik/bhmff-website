import { supabase } from '../../../lib/supabaseClient'
import type {
    Competition,
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

export const fixtureService = {
    async getActiveCompetition(): Promise<Competition | null> {
        const { data, error } = await supabase
            .from('competitions')
            .select('id, name, status')
            .eq('status', 'ACTIVE')
            .limit(1)
            .maybeSingle()

        throwSupabaseError(
            error,
            'Failed to load active competition'
        )

        return data
    },

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

        throwSupabaseError(error, 'Failed to load fixtures')

        return data ?? []
    },

    async getTeams(
        competitionId: string
    ): Promise<FixtureTeam[]> {
        const { data, error } = await supabase
            .from('competition_teams')
            .select(
                `
                id,
                team_id,
                teams(
                    name,
                    logo_url
                )
            `
            )
            .eq('competition_id', competitionId)
            .order('team_id')

        throwSupabaseError(error, 'Failed to load teams')

        return (
            data?.map((row: any) => ({
                competition_team_id: row.id,
                team_id: row.team_id,
                name: row.teams?.name ?? '',
                logo_url: row.teams?.logo_url ?? null,
            })) ?? []
        )
    },

    async getVenues(
        competitionId: string
    ): Promise<FixtureVenue[]> {
        const { data, error } = await supabase
            .from('venues')
            .select(
                'id,name,address,postcode'
            )
            .eq('competition_id', competitionId)
            .order('name')

        throwSupabaseError(error, 'Failed to load venues')

        return data ?? []
    },

    async getGroups(
        competitionId: string
    ): Promise<FixtureGroup[]> {
        const { data, error } = await supabase
            .from('groups')
            .select(
                'id,name,sort_order'
            )
            .eq('competition_id', competitionId)
            .order('sort_order')

        throwSupabaseError(error, 'Failed to load groups')

        return data ?? []
    },

    async getGroupMemberships(
        groupIds: string[]
    ): Promise<FixtureGroupMembership[]> {
        if (!groupIds.length) return []

        const { data, error } = await supabase
            .from('group_teams')
            .select(
                'group_id,competition_team_id'
            )
            .in('group_id', groupIds)

        throwSupabaseError(
            error,
            'Failed to load group memberships'
        )

        return data ?? []
    },

    async createFixture(
        competitionId: string,
        values: FixtureFormValues
    ): Promise<void> {
        const isGroupStage =
            values.stage === 'Group Stage'

        const { error } = await supabase
            .from('fixtures')
            .insert({
                competition_id: competitionId,
                group_id: isGroupStage
                    ? values.group_id || null
                    : null,
                home_competition_team_id:
                    values.home_competition_team_id ||
                    null,
                away_competition_team_id:
                    values.away_competition_team_id ||
                    null,
                venue_id:
                    values.venue_id || null,
                stage: values.stage.trim(),
                kickoff_time:
                    values.kickoff_time
                        ? new Date(
                            values.kickoff_time
                        ).toISOString()
                        : null,
                status: values.status,
            })

        throwSupabaseError(
            error,
            'Failed to create fixture'
        )
    },

    async updateFixture(
        fixtureId: string,
        values: FixtureFormValues
    ): Promise<void> {
        const isGroupStage =
            values.stage === 'Group Stage'

        const { error } = await supabase
            .from('fixtures')
            .update({
                group_id: isGroupStage
                    ? values.group_id || null
                    : null,
                home_competition_team_id:
                    values.home_competition_team_id ||
                    null,
                away_competition_team_id:
                    values.away_competition_team_id ||
                    null,
                venue_id:
                    values.venue_id || null,
                stage: values.stage.trim(),
                kickoff_time:
                    values.kickoff_time
                        ? new Date(
                            values.kickoff_time
                        ).toISOString()
                        : null,
                status: values.status,
            })
            .eq('id', fixtureId)

        throwSupabaseError(
            error,
            'Failed to update fixture'
        )
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