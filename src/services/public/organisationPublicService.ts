import { supabase } from '../../lib/supabaseClient'
import type { Organisation } from '../../components/admin/Organisations/organisationTypes'

export const organisationPublicService = {
    async getOrganisationBySlug(
        slug: string,
    ): Promise<Organisation | null> {
        const { data, error } = await supabase
            .from('organisations')
            .select('*')
            .eq('slug', slug)
            .eq('public_site_enabled', true)
            .eq('status', 'active')
            .maybeSingle()

        if (error) {
            console.error(
                'Failed to load public organisation:',
                error,
            )

            throw error
        }

        return data as Organisation | null
    },
}