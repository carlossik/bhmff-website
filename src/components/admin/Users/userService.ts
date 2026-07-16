import { supabase } from '../../../lib/supabaseClient'
import type {
    AdminUser,
    UserAccessFormValues,
} from './userTypes'
import type {
    AdminRole,
} from '../../../services/accessControl'

export type InviteAdminUserValues = {
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

function throwSupabaseError(
    error: { message: string } | null,
    context: string
) {
    if (!error) {
        return
    }

    console.error(`${context}:`, error)
    throw new Error(error.message)
}

export const userService = {
    async getUsers(): Promise<AdminUser[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                email,
                role,
                active,
                created_at,
                updated_at
            `)
            .order('created_at', {
                ascending: true,
            })

        throwSupabaseError(
            error,
            'Failed to load administrator users'
        )

        return (data ?? []) as AdminUser[]
    },

    async inviteUser(
        values: InviteAdminUserValues,
        action: 'invite' | 'resend_setup' = 'invite'
    ): Promise<InviteAdminUserResponse> {
        const {
            data,
            error,
        } = await supabase.functions.invoke(
            'invite-admin-user',
            {
                body: {
                    action,
                    fullName: values.fullName.trim(),
                    email: values.email.trim().toLowerCase(),
                    role: values.role,
                    redirectUrl: values.redirectUrl,
                },
            }
        )

        if (error) {
            console.error(
                'Failed to invite administrator user:',
                error
            )

            throw new Error(
                error.message ||
                'Unable to invite the user.'
            )
        }

        const response =
            data as Partial<InviteAdminUserResponse> & {
                error?: string
            }

        if (response.error) {
            throw new Error(response.error)
        }

        if (
            !response.success ||
            !response.userId ||
            !response.email
        ) {
            throw new Error(
                'The invitation response was incomplete.'
            )
        }

        return {
            success: true,
            userId: response.userId,
            email: response.email,
        }
    },

    async updateUser(
        userId: string,
        values: UserAccessFormValues
    ): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name:
                    values.fullName.trim() ||
                    null,
                role: values.role,
                active: values.active,
                updated_at:
                    new Date().toISOString(),
            })
            .eq('id', userId)

        throwSupabaseError(
            error,
            'Failed to update administrator access'
        )
    },
}