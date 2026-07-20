import { supabase } from '../../../lib/supabaseClient'
import type {
    Venue,
    VenueFormValues,
} from './venueTypes'

function throwSupabaseError(
    error: { message: string } | null,
    context: string
) {
    if (!error) return

    console.error(`${context}:`, error)
    throw new Error(error.message)
}

export const venueService = {
    async getVenues(
        competitionId: string,
        organisationId: string
    ): Promise<Venue[]> {
        const { data, error } = await supabase
            .from('venues')
            .select('*')
            .eq(
                'competition_id',
                competitionId
            )
            .eq(
                'organisation_id',
                organisationId
            )
            .order('name', {
                ascending: true,
            })

        throwSupabaseError(
            error,
            'Failed to load venues'
        )

        return (data ?? []) as Venue[]
    },

    async createVenue(
        competitionId: string,
        organisationId: string,
        values: VenueFormValues
    ): Promise<Venue> {
        const { data, error } = await supabase
            .from('venues')
            .insert({
                competition_id:
                competitionId,
                organisation_id:
                organisationId,
                name: values.name.trim(),
                address:
                    values.address.trim() ||
                    null,
                postcode:
                    values.postcode.trim() ||
                    null,
                notes:
                    values.notes.trim() ||
                    null,
            })
            .select('*')
            .single()

        throwSupabaseError(
            error,
            'Failed to create venue'
        )

        if (!data) {
            throw new Error(
                'The venue was created but could not be returned.'
            )
        }

        return data as Venue
    },

    async updateVenue(
        venueId: string,
        competitionId: string,
        organisationId: string,
        values: VenueFormValues
    ): Promise<void> {
        const { error } = await supabase
            .from('venues')
            .update({
                name: values.name.trim(),
                address:
                    values.address.trim() ||
                    null,
                postcode:
                    values.postcode.trim() ||
                    null,
                notes:
                    values.notes.trim() ||
                    null,
            })
            .eq('id', venueId)
            .eq(
                'competition_id',
                competitionId
            )
            .eq(
                'organisation_id',
                organisationId
            )

        throwSupabaseError(
            error,
            'Failed to update venue'
        )
    },

    async deleteVenue(
        venueId: string,
        competitionId: string,
        organisationId: string
    ): Promise<void> {
        const { error } = await supabase
            .from('venues')
            .delete()
            .eq('id', venueId)
            .eq(
                'competition_id',
                competitionId
            )
            .eq(
                'organisation_id',
                organisationId
            )

        throwSupabaseError(
            error,
            'Failed to delete venue'
        )
    },
}