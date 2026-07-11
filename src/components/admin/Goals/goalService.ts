import { supabase } from '../../../lib/supabaseClient'
import type {
    Goal,
    GoalFixture,
    GoalFormValues,
    GoalTeam,
} from './goalTypes'

function throwSupabaseError(
    error: { message: string } | null,
    context: string
) {
    if (!error) return

    console.error(`${context}:`, error)
    throw new Error(error.message)
}

export const goalService = {
    async getActiveFestivalId(): Promise<string | null> {
        const { data, error } = await supabase
            .from('festivals')
            .select('id')
            .eq('status', 'active')
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle()

        throwSupabaseError(
            error,
            'Failed to load active festival'
        )

        return data?.id ?? null
    },

    async getFixtures(
        festivalId: string
    ): Promise<GoalFixture[]> {
        const { data, error } = await supabase
            .from('fixtures')
            .select(`
                id,
                stage,
                kickoff_time,
                home_team_id,
                away_team_id
            `)
            .eq('festival_id', festivalId)
            .order('kickoff_time', {
                ascending: true,
                nullsFirst: false,
            })

        throwSupabaseError(
            error,
            'Failed to load fixtures'
        )

        return data ?? []
    },

    async getTeams(
        festivalId: string
    ): Promise<GoalTeam[]> {
        const { data, error } = await supabase
            .from('teams')
            .select('id, name, logo_url')
            .eq('festival_id', festivalId)
            .order('name', { ascending: true })

        throwSupabaseError(
            error,
            'Failed to load teams'
        )

        return data ?? []
    },

    async getGoals(
        fixtureIds: string[]
    ): Promise<Goal[]> {
        if (!fixtureIds.length) return []

        const { data, error } = await supabase
            .from('goals')
            .select('*')
            .in('fixture_id', fixtureIds)
            .order('created_at', {
                ascending: false,
            })

        throwSupabaseError(
            error,
            'Failed to load goals'
        )

        return data ?? []
    },

    async createGoal(
        values: GoalFormValues
    ): Promise<void> {
        const { error } = await supabase
            .from('goals')
            .insert({
                fixture_id: values.fixture_id,
                team_id: values.team_id,
                player_name:
                    values.player_name.trim(),
                minute: values.minute
                    ? Number(values.minute)
                    : null,
                video_timestamp:
                    values.video_timestamp.trim() ||
                    null,
            })

        throwSupabaseError(
            error,
            'Failed to create goal'
        )
    },

    async updateGoal(
        goalId: string,
        values: GoalFormValues
    ): Promise<void> {
        const { error } = await supabase
            .from('goals')
            .update({
                fixture_id: values.fixture_id,
                team_id: values.team_id,
                player_name:
                    values.player_name.trim(),
                minute: values.minute
                    ? Number(values.minute)
                    : null,
                video_timestamp:
                    values.video_timestamp.trim() ||
                    null,
            })
            .eq('id', goalId)

        throwSupabaseError(
            error,
            'Failed to update goal'
        )
    },

    async deleteGoal(
        goalId: string
    ): Promise<void> {
        const { error } = await supabase
            .from('goals')
            .delete()
            .eq('id', goalId)

        throwSupabaseError(
            error,
            'Failed to delete goal'
        )
    },
}