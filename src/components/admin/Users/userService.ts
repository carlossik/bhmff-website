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