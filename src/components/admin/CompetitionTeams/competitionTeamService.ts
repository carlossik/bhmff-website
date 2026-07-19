import { supabase } from '../../../lib/supabaseClient'
import type {
    CompetitionTeam,
    CompetitionTeamForm,
    TeamOption,
    GroupOption,
} from './competitionTeamTypes'

const TABLE = 'competition_teams'

export const competitionTeamService = {
    async getCompetitionTeams(
        competitionId: string
    ): Promise<CompetitionTeam[]> {
        const { data, error } =
            await supabase
                .from(TABLE)
                .select(`
                    *,
                    team:teams(
                        id,
                        name,
                        logo_url,
                        age_group,
                        gender,
                        club_id
                    ),
                    group:groups(
                        id,
                        name
                    )
                `)
                .eq(
                    'competition_id',
                    competitionId
                )
                .order('created_at')

        if (error) {
            throw error
        }

        return (data ??
            []) as CompetitionTeam[]
    },

    async getAvailableTeams(
        organisationId: string
    ): Promise<TeamOption[]> {
        const { data, error } =
            await supabase
                .from('teams')
                .select(`
                    id,
                    name,
                    club_id,
                    age_group,
                    gender
                `)
                .eq(
                    'organisation_id',
                    organisationId
                )
                .order('name')

        if (error) {
            throw error
        }

        return (data ?? []) as TeamOption[]
    },

    async getGroups(
        competitionId: string
    ): Promise<GroupOption[]> {
        const { data, error } =
            await supabase
                .from('groups')
                .select('id,name')
                .eq(
                    'competition_id',
                    competitionId
                )
                .order('name')

        if (error) {
            throw error
        }

        return (data ??
            []) as GroupOption[]
    },

    async create(
        organisationId: string,
        competitionId: string,
        form: CompetitionTeamForm
    ) {
        const { data, error } =
            await supabase
                .from(TABLE)
                .insert({
                    organisation_id:
                    organisationId,
                    competition_id:
                    competitionId,
                    team_id: form.team_id,
                    group_id:
                        form.group_id ||
                        null,
                    squad_number:
                        form.squad_number
                            ? Number(
                                form.squad_number
                            )
                            : null,
                    seed: form.seed
                        ? Number(
                            form.seed
                        )
                        : null,
                    status: form.status,
                    published:
                    form.published,
                })
                .select()
                .single()

        if (error) {
            throw error
        }

        return data
    },

    async update(
        id: string,
        form: CompetitionTeamForm
    ) {
        const { data, error } =
            await supabase
                .from(TABLE)
                .update({
                    group_id:
                        form.group_id ||
                        null,
                    squad_number:
                        form.squad_number
                            ? Number(
                                form.squad_number
                            )
                            : null,
                    seed: form.seed
                        ? Number(
                            form.seed
                        )
                        : null,
                    status: form.status,
                    published:
                    form.published,
                })
                .eq('id', id)
                .select()
                .single()

        if (error) {
            throw error
        }

        return data
    },

    async remove(id: string) {
        const { error } =
            await supabase
                .from(TABLE)
                .delete()
                .eq('id', id)

        if (error) {
            throw error
        }
    },
}