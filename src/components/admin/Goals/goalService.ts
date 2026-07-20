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
    async getFixtures(
        competitionId: string
    ): Promise<GoalFixture[]> {
        const { data, error } = await supabase
            .from('fixtures')
            .select(`
                id,
                stage,
                kickoff_time,
                home_competition_team_id,
                away_competition_team_id
            `)
            .eq('competition_id', competitionId)
            .order('kickoff_time', {
                ascending: true,
                nullsFirst: false,
            })

        throwSupabaseError(
            error,
            'Failed to load fixtures'
        )

        return (data ?? []) as GoalFixture[]
    },

    async getTeams(
        competitionId: string
    ): Promise<GoalTeam[]> {
        const { data, error } = await supabase
            .from('competition_teams')
            .select(`
                id,
                team_id,
                teams (
                    name,
                    logo_url
                )
            `)
            .eq('competition_id', competitionId)
            .order('team_id', {
                ascending: true,
            })

        throwSupabaseError(
            error,
            'Failed to load competition teams'
        )

        return (
            data?.map((row: any) => ({
                id: row.team_id,
                competition_team_id: row.id,
                name: row.teams?.name ?? '',
                logo_url:
                    row.teams?.logo_url ?? null,
            })) ?? []
        )
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

        return (data ?? []) as Goal[]
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