import { supabase } from '../../../lib/supabaseClient'
import type {
    FestivalGroup,
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

export const groupService = {
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

    async getGroups(festivalId: string): Promise<FestivalGroup[]> {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('festival_id', festivalId)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true })

        throwSupabaseError(error, 'Failed to load groups')

        return data ?? []
    },

    async getTeams(festivalId: string): Promise<GroupTeam[]> {
        const { data, error } = await supabase
            .from('teams')
            .select('id, name, logo_url')
            .eq('festival_id', festivalId)
            .order('name', { ascending: true })

        throwSupabaseError(error, 'Failed to load teams')

        return data ?? []
    },

    async getMemberships(
        groupIds: string[]
    ): Promise<GroupMembership[]> {
        if (!groupIds.length) return []

        const { data, error } = await supabase
            .from('group_teams')
            .select('id, group_id, team_id')
            .in('group_id', groupIds)

        throwSupabaseError(error, 'Failed to load group memberships')

        return data ?? []
    },

    async createGroup(
        festivalId: string,
        values: GroupFormValues
    ): Promise<void> {
        const { data, error } = await supabase
            .from('groups')
            .insert({
                festival_id: festivalId,
                name: values.name.trim(),
                sort_order: Number(values.sort_order),
            })
            .select('id')
            .single()

        throwSupabaseError(error, 'Failed to create group')
        if (!data) {
            throw new Error('Group was created but no data was returned.')
        }

        if (!values.team_ids.length) return

        const { error: membershipError } = await supabase
            .from('group_teams')
            .insert(
                values.team_ids.map((teamId) => ({
                    group_id: data.id,
                    team_id: teamId,
                }))
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

        if (!values.team_ids.length) return

        const { error: insertError } = await supabase
            .from('group_teams')
            .insert(
                values.team_ids.map((teamId) => ({
                    group_id: groupId,
                    team_id: teamId,
                }))
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