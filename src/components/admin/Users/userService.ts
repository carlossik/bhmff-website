import { supabase } from '../../../lib/supabaseClient'
import type {
    AdminUser,
    UserAccessFormValues,
} from './userTypes'

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