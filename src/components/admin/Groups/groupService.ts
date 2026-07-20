import { supabase } from '../../../lib/supabaseClient'
import type {
    CompetitionGroup,
    GroupFormValues,
    GroupMembership,
    GroupTeam,
} from './groupTypes'

function throwSupabaseError(
    error: { message: string } | null,
    context: string
) {
    if (!error) return

    console.error(`${context}:`, error)
    throw new Error(error.message)
}

type CompetitionTeamRow = {
    id: string
    team_id: string
    team:
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

function getRelatedTeam(
    row: CompetitionTeamRow
): {
    name: string
    logo_url: string | null
} | null {
    if (!row.team) return null

    return Array.isArray(row.team)
        ? row.team[0] ?? null
        : row.team
}

export const groupService = {
    async getActiveCompetitionId(): Promise<string | null> {
        const { data, error } = await supabase
            .from('competitions')
            .select('id')
            .eq('status', 'ACTIVE')
            .limit(1)
            .maybeSingle()

        throwSupabaseError(
            error,
            'Failed to load active competition'
        )

        return data?.id ?? null
    },

    async getGroups(
        competitionId: string
    ): Promise<CompetitionGroup[]> {
        const { data, error } = await supabase
            .from('groups')
            .select(
                'id, competition_id, name, sort_order, published, created_at'
            )
            .eq('competition_id', competitionId)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true })

        throwSupabaseError(error, 'Failed to load groups')

        return (data ?? []) as CompetitionGroup[]
    },

    async getTeams(
        competitionId: string
    ): Promise<GroupTeam[]> {
        const { data, error } = await supabase
            .from('competition_teams')
            .select(`
                id,
                team_id,
                team:teams!competition_teams_team_id_fkey (
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
            .map((row) => {
                const team = getRelatedTeam(row)

                if (!team) return null

                return {
                    competition_team_id: row.id,
                    team_id: row.team_id,
                    name: team.name,
                    logo_url: team.logo_url,
                }
            })
            .filter(
                (team): team is GroupTeam => team !== null
            )
            .sort((a, b) =>
                a.name.localeCompare(b.name)
            )
    },

    async getMemberships(
        groupIds: string[]
    ): Promise<GroupMembership[]> {
        if (!groupIds.length) return []

        const { data, error } = await supabase
            .from('group_teams')
            .select(
                'id, group_id, competition_team_id'
            )
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
                published: false,
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
                        competition_team_id:
                        competitionTeamId,
                    })
                )
            )

        throwSupabaseError(
            membershipError,
            'Group created, but team allocation failed'
        )
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
                        competition_team_id:
                        competitionTeamId,
                    })
                )
            )

        throwSupabaseError(
            insertError,
            'Failed to save group team allocations'
        )
    },

    async setPublished(
        groupId: string,
        published: boolean
    ): Promise<void> {
        const { error } = await supabase
            .from('groups')
            .update({ published })
            .eq('id', groupId)

        throwSupabaseError(
            error,
            published
                ? 'Failed to publish group'
                : 'Failed to unpublish group'
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