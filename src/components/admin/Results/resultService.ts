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
    async getActiveFestivalId(): Promise<string | null> {
        const { data, error } = await supabase
            .from('festivals')
            .select('id')
            .eq('status', 'active')
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle()

        throwSupabaseError(error, 'Failed to load active festival')

        return data?.id ?? null
    },

    async getFixtures(festivalId: string): Promise<ResultFixture[]> {
        const { data, error } = await supabase
            .from('fixtures')
            .select(
                'id, stage, kickoff_time, home_team_id, away_team_id'
            )
            .eq('festival_id', festivalId)
            .order('kickoff_time', { ascending: true })

        throwSupabaseError(error, 'Failed to load fixtures')

        return data ?? []
    },

    async getTeams(festivalId: string): Promise<ResultTeam[]> {
        const { data, error } = await supabase
            .from('teams')
            .select('id, name')
            .eq('festival_id', festivalId)
            .order('name', { ascending: true })

        throwSupabaseError(error, 'Failed to load teams')

        return data ?? []
    },

    async getResults(fixtureIds: string[]): Promise<Result[]> {
        if (!fixtureIds.length) return []

        const { data, error } = await supabase
            .from('results')
            .select('*')
            .in('fixture_id', fixtureIds)
            .order('created_at', { ascending: false })

        throwSupabaseError(error, 'Failed to load results')

        return data ?? []
    },

    async createResult(values: ResultFormValues): Promise<void> {
        const { error } = await supabase.from('results').insert({
            fixture_id: values.fixture_id,
            home_score: Number(values.home_score),
            away_score: Number(values.away_score),
            player_of_match:
                values.player_of_match.trim() || null,
            match_report: values.match_report.trim() || null,
            published: values.published,
        })

        throwSupabaseError(error, 'Failed to create result')
    },

    async updateResult(
        resultId: string,
        values: ResultFormValues
    ): Promise<void> {
        const { error } = await supabase
            .from('results')
            .update({
                fixture_id: values.fixture_id,
                home_score: Number(values.home_score),
                away_score: Number(values.away_score),
                player_of_match:
                    values.player_of_match.trim() || null,
                match_report: values.match_report.trim() || null,
                published: values.published,
            })
            .eq('id', resultId)

        throwSupabaseError(error, 'Failed to update result')
    },

    async deleteResult(resultId: string): Promise<void> {
        const { error } = await supabase
            .from('results')
            .delete()
            .eq('id', resultId)

        throwSupabaseError(error, 'Failed to delete result')
    },
}