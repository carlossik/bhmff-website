import { supabase } from '../../../lib/supabaseClient'
import type {
    Festival,
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
    async getActiveFestival(): Promise<Festival | null> {
        const { data, error } = await supabase
            .from('festivals')
            .select('id, name, year')
            .eq('status', 'active')
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle()

        throwSupabaseError(error, 'Failed to load active festival')

        return data
    },

    async getFixtures(festivalId: string): Promise<Fixture[]> {
        const { data, error } = await supabase
            .from('fixtures')
            .select('*')
            .eq('festival_id', festivalId)
            .order('kickoff_time', { ascending: true })

        throwSupabaseError(error, 'Failed to load fixtures')

        return data ?? []
    },

    async getTeams(festivalId: string): Promise<FixtureTeam[]> {
        const { data, error } = await supabase
            .from('teams')
            .select('id, name')
            .eq('festival_id', festivalId)
            .order('name', { ascending: true })

        throwSupabaseError(error, 'Failed to load teams')

        return data ?? []
    },

    async getVenues(festivalId: string): Promise<FixtureVenue[]> {
        const { data, error } = await supabase
            .from('venues')
            .select('id, name, address, postcode')
            .eq('festival_id', festivalId)
            .order('name', { ascending: true })

        throwSupabaseError(error, 'Failed to load venues')

        return data ?? []
    },

    async getGroups(festivalId: string): Promise<FixtureGroup[]> {
        const { data, error } = await supabase
            .from('groups')
            .select('id, name, sort_order')
            .eq('festival_id', festivalId)
            .order('sort_order', { ascending: true })

        throwSupabaseError(error, 'Failed to load groups')

        return data ?? []
    },

    async getGroupMemberships(
        groupIds: string[]
    ): Promise<FixtureGroupMembership[]> {
        if (!groupIds.length) return []

        const { data, error } = await supabase
            .from('group_teams')
            .select('group_id, team_id')
            .in('group_id', groupIds)

        throwSupabaseError(error, 'Failed to load group teams')

        return data ?? []
    },

    async createFixture(
        festivalId: string,
        values: FixtureFormValues
    ): Promise<void> {
        const isGroupStage = values.stage === 'Group Stage'

        const { error } = await supabase.from('fixtures').insert({
            festival_id: festivalId,
            group_id: isGroupStage ? values.group_id || null : null,
            home_team_id: values.home_team_id || null,
            away_team_id: values.away_team_id || null,
            venue_id: values.venue_id || null,
            stage: values.stage.trim(),
            kickoff_time: values.kickoff_time
                ? new Date(values.kickoff_time).toISOString()
                : null,
            status: values.status,
        })

        throwSupabaseError(error, 'Failed to create fixture')
    },

    async updateFixture(
        fixtureId: string,
        values: FixtureFormValues
    ): Promise<void> {
        const isGroupStage = values.stage === 'Group Stage'

        const { error } = await supabase
            .from('fixtures')
            .update({
                group_id: isGroupStage
                    ? values.group_id || null
                    : null,
                home_team_id: values.home_team_id || null,
                away_team_id: values.away_team_id || null,
                venue_id: values.venue_id || null,
                stage: values.stage.trim(),
                kickoff_time: values.kickoff_time
                    ? new Date(values.kickoff_time).toISOString()
                    : null,
                status: values.status,
            })
            .eq('id', fixtureId)

        throwSupabaseError(error, 'Failed to update fixture')
    },

    async deleteFixture(fixtureId: string): Promise<void> {
        const { error } = await supabase
            .from('fixtures')
            .delete()
            .eq('id', fixtureId)

        throwSupabaseError(error, 'Failed to delete fixture')
    },
}