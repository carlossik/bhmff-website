import { supabase } from '../../../lib/supabaseClient'
import type {
    Result,
    ResultFixture,
    ResultFormValues,
    ResultTeam,
} from './resultTypes'

function throwSupabaseError(
    error: { message: string } | null,
    context: string
) {
    if (!error) return

    console.error(`${context}:`, error)
    throw new Error(error.message)
}

export const resultService = {
    async getFixtures(
        competitionId: string
    ): Promise<ResultFixture[]> {
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

        return (data ?? []) as ResultFixture[]
    },

    async getTeams(
        competitionId: string
    ): Promise<ResultTeam[]> {
        const { data, error } = await supabase
            .from('competition_teams')
            .select(`
                id,
                team_id,
                teams (
                    name
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
            })) ?? []
        )
    },

    async getResults(
        competitionId: string
    ): Promise<Result[]> {
        const { data, error } = await supabase
            .from('results')
            .select('*')
            .eq('competition_id', competitionId)
            .order('created_at', {
                ascending: false,
            })

        throwSupabaseError(
            error,
            'Failed to load results'
        )

        return (data ?? []) as Result[]
    },

    async createResult(
        competitionId: string,
        values: ResultFormValues
    ): Promise<void> {
        const { error } = await supabase
            .from('results')
            .insert({
                competition_id: competitionId,
                fixture_id: values.fixture_id,
                home_score: Number(values.home_score),
                away_score: Number(values.away_score),
                player_of_match:
                    values.player_of_match.trim() || null,
                match_report:
                    values.match_report.trim() || null,
                published: values.published,
            })

        throwSupabaseError(
            error,
            'Failed to create result'
        )
    },

    async updateResult(
        resultId: string,
        competitionId: string,
        values: ResultFormValues
    ): Promise<void> {
        const { error } = await supabase
            .from('results')
            .update({
                competition_id: competitionId,
                fixture_id: values.fixture_id,
                home_score: Number(values.home_score),
                away_score: Number(values.away_score),
                player_of_match:
                    values.player_of_match.trim() || null,
                match_report:
                    values.match_report.trim() || null,
                published: values.published,
            })
            .eq('id', resultId)
            .eq('competition_id', competitionId)

        throwSupabaseError(
            error,
            'Failed to update result'
        )
    },

    async deleteResult(
        resultId: string,
        competitionId: string
    ): Promise<void> {
        const { error } = await supabase
            .from('results')
            .delete()
            .eq('id', resultId)
            .eq('competition_id', competitionId)

        throwSupabaseError(
            error,
            'Failed to delete result'
        )
    },
}