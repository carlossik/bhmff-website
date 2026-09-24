import { supabase } from '../../../lib/supabaseClient'

import type {
    AdminUser,
    UserAccessFormValues,
} from './userTypes'

import type {
    AdminRole,
} from '../../../services/accessControl'

export type InviteAdminUserValues = {
    organisationId: string
    fullName: string
    email: string
    role: AdminRole
    competitionId?: string
    competitionTeamId?: string
    redirectUrl: string
}

type InviteAdminUserResponse = {
    success: boolean
    userId: string
    email: string
}

type MembershipRow = {
    id: string
    organisation_id: string
    user_id: string
    role: AdminRole
    active: boolean
    created_at: string
    updated_at: string
}

type ProfileRow = {
    id: string
    full_name: string | null
    email: string | null
    active: boolean
}

type AccessSummaryRow = {
    user_id: string
    invited_at: string | null
    last_sent_at: string | null
    accepted_at: string | null
    send_count: number | null
    sign_in_count: number
    first_signed_in_at: string | null
    last_signed_in_at: string | null
}

function throwSupabaseError(
    error: { message: string } | null,
    context: string,
) {
    if (!error) {
        return
    }

    console.error(`${context}:`, error)

    throw new Error(error.message)
}

export const userService = {
    async getUsers(
        organisationId: string,
    ): Promise<AdminUser[]> {
        if (!organisationId) {
            return []
        }

        const {
            data: membershipData,
            error: membershipError,
        } = await supabase
            .from('organisation_memberships')
            .select(`
                id,
                organisation_id,
                user_id,
                role,
                active,
                created_at,
                updated_at
            `)
            .eq('organisation_id', organisationId)
            .order('created_at', {
                ascending: true,
            })

        throwSupabaseError(
            membershipError,
            'Failed to load organisation memberships',
        )

        const memberships =
            (membershipData ?? []) as MembershipRow[]

        if (!memberships.length) {
            return []
        }

        const userIds = [
            ...new Set(
                memberships.map(
                    (membership) =>
                        membership.user_id,
                ),
            ),
        ]

        const {
            data: profileData,
            error: profileError,
        } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                email,
                active
            `)
            .in('id', userIds)

        throwSupabaseError(
            profileError,
            'Failed to load administrator profiles',
        )

        const profiles =
            (profileData ?? []) as ProfileRow[]

        const profilesById = new Map(
            profiles.map((profile) => [
                profile.id,
                profile,
            ]),
        )

        const { data: assignments, error: assignmentError } = await supabase
            .from('competition_team_official_assignments')
            .select('user_id,competition_id,competition_team_id')
            .eq('organisation_id', organisationId)
        throwSupabaseError(assignmentError, 'Failed to load team assignments')
        const assignmentsByUser = new Map((assignments ?? []).map((row) => [row.user_id, row]))
        const { data: accessSummary, error: accessSummaryError } = await supabase
            .rpc('portal_access_summary', { p_organisation: organisationId })
        throwSupabaseError(accessSummaryError, 'Failed to load invitation and sign-in activity')
        const summaryByUser = new Map(((accessSummary ?? []) as AccessSummaryRow[])
            .map((row) => [row.user_id, row]))

        return memberships.map(
            (membership): AdminUser => {
                const profile =
                    profilesById.get(
                        membership.user_id,
                    )

                return {
                    membership_id:
                    membership.id,

                    organisation_id:
                    membership.organisation_id,

                    user_id:
                    membership.user_id,

                    full_name:
                        profile?.full_name ??
                        null,

                    email:
                        profile?.email ??
                        null,

                    role:
                    membership.role,

                    active:
                    membership.active,

                    profile_active:
                        profile?.active ??
                        false,

                    created_at:
                    membership.created_at,

                    updated_at:
                    membership.updated_at,
                    competition_id: assignmentsByUser.get(membership.user_id)?.competition_id,
                    competition_team_id: assignmentsByUser.get(membership.user_id)?.competition_team_id,
                    invited_at: summaryByUser.get(membership.user_id)?.invited_at ?? null,
                    last_sent_at: summaryByUser.get(membership.user_id)?.last_sent_at ?? null,
                    accepted_at: summaryByUser.get(membership.user_id)?.accepted_at ?? null,
                    invitation_send_count: summaryByUser.get(membership.user_id)?.send_count ?? 0,
                    sign_in_count: summaryByUser.get(membership.user_id)?.sign_in_count ?? 0,
                    first_signed_in_at: summaryByUser.get(membership.user_id)?.first_signed_in_at ?? null,
                    last_signed_in_at: summaryByUser.get(membership.user_id)?.last_signed_in_at ?? null,
                }
            },
        )
    },

    async inviteUser(
        values: InviteAdminUserValues,
        action:
            | 'invite'
            | 'resend_setup' = 'invite',
    ): Promise<InviteAdminUserResponse> {
        const {
            data,
            error,
        } = await supabase.functions.invoke(
            'invite-admin-user',
            {
                body: {
                    action,

                    organisationId:
                    values.organisationId,

                    fullName:
                        values.fullName
                            .trim(),

                    email:
                        values.email
                            .trim()
                            .toLowerCase(),

                    role:
                    values.role,
                    competitionId: values.competitionId,
                    competitionTeamId: values.competitionTeamId,

                    redirectUrl:
                    values.redirectUrl,
                },
            },
        )

        if (error) {
            console.error(
                'Failed to invite administrator user:',
                error,
            )

            throw new Error(
                error.message ||
                'Unable to invite the user.',
            )
        }

        const response =
            data as Partial<InviteAdminUserResponse> & {
                error?: string
            }

        if (response.error) {
            throw new Error(
                response.error,
            )
        }

        if (
            !response.success ||
            !response.userId ||
            !response.email
        ) {
            throw new Error(
                'The invitation response was incomplete.',
            )
        }

        return {
            success: true,
            userId:
            response.userId,
            email:
            response.email,
        }
    },

    async updateUser(
        membershipId: string,
        userId: string,
        organisationId: string,
        values: UserAccessFormValues,
    ): Promise<void> {
        if (values.role === 'match_official' && values.competitionId && values.competitionTeamId) {
            const { error } = await supabase.rpc('set_competition_team_official_assignment', {
                p_organisation: organisationId,
                p_user: userId,
                p_competition: values.competitionId,
                p_team: values.competitionTeamId,
            })
            throwSupabaseError(error, 'Failed to assign official to a team')
        }
        const fullName =
            values.fullName.trim()

        const {
            error: profileError,
        } = await supabase
            .from('profiles')
            .update({
                full_name:
                    fullName || null,

                updated_at:
                    new Date()
                        .toISOString(),
            })
            .eq('id', userId)

        throwSupabaseError(
            profileError,
            'Failed to update the administrator profile',
        )

        const {
            error: membershipError,
        } = await supabase
            .from('organisation_memberships')
            .update({
                role:
                values.role,

                active:
                values.active,

                updated_at:
                    new Date()
                        .toISOString(),
            })
            .eq('id', membershipId)
            .eq(
                'organisation_id',
                organisationId,
            )
            .eq('user_id', userId)

        throwSupabaseError(
            membershipError,
            'Failed to update organisation access',
        )
        if (values.role !== 'match_official' && values.competitionId === '') {
            const { error } = await supabase.rpc('set_competition_team_official_assignment', {
                p_organisation: organisationId, p_user: userId, p_competition: null, p_team: null,
            })
            throwSupabaseError(error, 'Failed to clear official assignment')
        }
    },

    async getCompetitionTeams(organisationId: string) {
        const { data: competitions, error } = await supabase.from('competitions')
            .select('id,name').eq('organisation_id', organisationId).order('name')
        throwSupabaseError(error, 'Failed to load competitions')
        const ids = (competitions ?? []).map((competition) => competition.id)
        if (!ids.length) return []
        const { data: teams, error: teamsError } = await supabase.from('competition_teams')
            .select('id,competition_id,teams(name)').in('competition_id', ids)
        throwSupabaseError(teamsError, 'Failed to load competition teams')
        return (teams ?? []).map((team) => {
            const joined = team.teams as unknown as { name: string } | { name: string }[] | null
            return {
                id: team.id, competitionId: team.competition_id,
                competitionName: competitions?.find((competition) => competition.id === team.competition_id)?.name ?? '',
                name: (Array.isArray(joined) ? joined[0]?.name : joined?.name) ?? 'Unnamed team',
            }
        })
    },

    async removeUser(
        organisationId: string,
        userId: string,
    ): Promise<{
        accountDeleted: boolean
        membershipRemoved: boolean
        message: string
    }> {
        const {
            data,
            error,
        } = await supabase.functions.invoke(
            'manage-admin-user',
            {
                body: {
                    action: 'remove_user',
                    organisationId,
                    userId,
                },
            },
        )

        if (error) {
            console.error(
                'Failed to remove administrator user:',
                error,
            )

            throw new Error(
                error.message ||
                'Unable to remove the user.',
            )
        }

        const response =
            data as {
                success?: boolean
                accountDeleted?: boolean
                membershipRemoved?: boolean
                message?: string
                error?: string
            }

        if (response.error) {
            throw new Error(response.error)
        }

        if (
            !response.success ||
            typeof response.accountDeleted !==
            'boolean' ||
            typeof response.membershipRemoved !==
            'boolean' ||
            !response.message
        ) {
            throw new Error(
                'The user removal response was incomplete.',
            )
        }

        return {
            accountDeleted:
            response.accountDeleted,
            membershipRemoved:
            response.membershipRemoved,
            message:
            response.message,
        }
    },
}
