import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export async function getCurrentUser():
    Promise<User | null> {
    const {
        data,
        error,
    } = await supabase.auth.getSession()

    if (error) {
        console.error(
            'Unable to read the current authentication session:',
            error
        )

        return null
    }

    return data.session?.user ?? null
}