import { supabase } from '../../../lib/supabaseClient'
import type {
    CompetitionGroup,
    GroupFormValues,
    GroupMembership,
    GroupTeam,
} from './groupTypes'

type CompetitionTeamRow = {
    id: string
    team_id: string
    teams:
        | {
        name: string
        logo_url: string | null
    }
        | {
        name: string
        logo_url: string | null
    }[]
        | null
}

function throwSupabaseError(
    error: { message: string } | null,
    context: string
): void {
    if (!error) return

    console.error(`${context}:`, error)
    throw new Error(error.message)
}

function getRelatedTeam(
    relation: CompetitionTeamRow['teams']
): {
    name: string
    logo_url: string | null
} | null {
    if (!relation) return null

    return Array.isArray(relation) ? relation[0] ?? null : relation
}

export const groupService = {
    async getActiveCompetitionId(): Promise<string | null> {
        const { data, error } = await supabase
            .from('competitions')
            .select('id')
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        throwSupabaseError(error, 'Failed to load active competition')

        return data?.id ?? null
    },

    async getGroups(
        competitionId: string
    ): Promise<CompetitionGroup[]> {
        const { data, error } = await supabase
            .from('groups')
            .select(
                'id, competition_id, name, sort_order, created_at'
            )
            .eq('competition_id', competitionId)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true })

        throwSupabaseError(error, 'Failed to load groups')

        return (data ?? []) as CompetitionGroup[]
    },

    async getTeams(competitionId: string): Promise<GroupTeam[]> {
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

        throwSupabaseError(
            error,
            'Failed to load competition teams'
        )

        return ((data ?? []) as CompetitionTeamRow[])
            .map((competitionTeam) => {
                const team = getRelatedTeam(competitionTeam.teams)

                if (!team) return null

                return {
                    id: competitionTeam.id,
                    competition_team_id: competitionTeam.id,
                    team_id: competitionTeam.team_id,
                    name: team.name,
                    logo_url: team.logo_url,
                }
            })
            .filter((team): team is GroupTeam => team !== null)
            .sort((a, b) => a.name.localeCompare(b.name))
    },

    async getMemberships(
        groupIds: string[]
    ): Promise<GroupMembership[]> {
        if (!groupIds.length) return []

        const { data, error } = await supabase
            .from('group_teams')
            .select('id, group_id, competition_team_id')
            .in('group_id', groupIds)

        throwSupabaseError(
            error,
            'Failed to load group memberships'
        )

        return (data ?? []) as GroupMembership[]
    },

    async createGroup(
        competitionId: string,
        values: GroupFormValues
    ): Promise<void> {
        const { data, error } = await supabase
            .from('groups')
            .insert({
                competition_id: competitionId,
                name: values.name.trim(),
                sort_order: Number(values.sort_order),
            })
            .select('id')
            .single()

        throwSupabaseError(error, 'Failed to create group')

        if (!data) {
            throw new Error(
                'Group was created but no data was returned.'
            )
        }

        if (!values.competition_team_ids.length) return

        const { error: membershipError } = await supabase
            .from('group_teams')
            .insert(
                values.competition_team_ids.map(
                    (competitionTeamId) => ({
                        group_id: data.id,
                        competition_team_id: competitionTeamId,
                    })
                )
            )

        if (membershipError) {
            const { error: rollbackError } = await supabase
                .from('groups')
                .delete()
                .eq('id', data.id)

            if (rollbackError) {
                console.error(
                    'Failed to remove group after allocation failure:',
                    rollbackError
                )
            }

            throwSupabaseError(
                membershipError,
                'Failed to allocate teams to the new group'
            )
        }
    },

    async updateGroup(
        groupId: string,
        values: GroupFormValues
    ): Promise<void> {
        const { error } = await supabase
            .from('groups')
            .update({
                name: values.name.trim(),
                sort_order: Number(values.sort_order),
            })
            .eq('id', groupId)

        throwSupabaseError(error, 'Failed to update group')

        const { error: deleteError } = await supabase
            .from('group_teams')
            .delete()
            .eq('group_id', groupId)

        throwSupabaseError(
            deleteError,
            'Failed to update group team allocations'
        )

        if (!values.competition_team_ids.length) return

        const { error: insertError } = await supabase
            .from('group_teams')
            .insert(
                values.competition_team_ids.map(
                    (competitionTeamId) => ({
                        group_id: groupId,
                        competition_team_id: competitionTeamId,
                    })
                )
            )

        throwSupabaseError(
            insertError,
            'Failed to save group team allocations'
        )
    },

    async deleteGroup(groupId: string): Promise<void> {
        const { error } = await supabase
            .from('groups')
            .delete()
            .eq('id', groupId)

        throwSupabaseError(error, 'Failed to delete group')
    },
}