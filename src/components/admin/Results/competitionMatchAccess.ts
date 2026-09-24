import { supabase } from '../../../lib/supabaseClient'
import { filterFixturesForTeam } from './matchAccessRules'

export async function writableCompetitionFixtures<T extends {
    id: string
    home_competition_team_id: string | null
    away_competition_team_id: string | null
}>(fixtures: T[], competitionId: string, organisationId: string, userId: string, role: string): Promise<T[]> {
    if (role !== 'match_official') return fixtures
    const { data, error } = await supabase.from('competition_team_official_assignments')
        .select('competition_team_id').eq('organisation_id', organisationId)
        .eq('competition_id', competitionId).eq('user_id', userId).maybeSingle()
    if (error) throw new Error(error.message)
    return filterFixturesForTeam(fixtures, data?.competition_team_id ?? null, role)
}
