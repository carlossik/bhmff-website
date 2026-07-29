import { supabase } from '../../lib/supabaseClient'
import type { Competition } from '../../types/competitionTypes'

const TABLE = 'competitions'

export const competitionPublicService = {
    async getPublishedCompetitions(
        organisationId: string,
    ): Promise<Competition[]> {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('organisation_id', organisationId)
            .eq('published', true)
            .order('start_date', {
                ascending: true,
                nullsFirst: false,
            })
            .order('created_at', {
                ascending: true,
            })

        if (error) {
            throw error
        }

        return (data ?? []) as Competition[]
    },

    async getPublishedCompetitionBySlug(
        organisationId: string,
        slug: string,
    ): Promise<Competition | null> {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('organisation_id', organisationId)
            .eq('slug', slug)
            .eq('published', true)
            .maybeSingle()

        if (error) {
            throw error
        }

        return data as Competition | null
    },
}