import { supabase } from '../../../lib/supabaseClient'
import type {
    Festival,
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
    async getActiveFestival(): Promise<Festival | null> {
        const { data, error } = await supabase
            .from('festivals')
            .select('id, name, year')
            .eq('status', 'active')
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle()

        throwSupabaseError(error, 'Failed to load active festival')

        return data
    },

    async getVenues(
        festivalId: string,
        organisationId: string
    ): Promise<Venue[]> {
        const { data, error } = await supabase
            .from('venues')
            .select('*')
            .eq('festival_id', festivalId)
            .eq('organisation_id', organisationId)
            .order('name', { ascending: true })

        throwSupabaseError(error, 'Failed to load venues')

        return data ?? []
    },

    async createVenue(
        festivalId: string,
        organisationId: string,
        values: VenueFormValues
    ): Promise<Venue> {
        const { data, error } = await supabase
            .from('venues')
            .insert({
                festival_id: festivalId,
                organisation_id: organisationId,
                name: values.name.trim(),
                address: values.address.trim() || null,
                postcode: values.postcode.trim() || null,
                notes: values.notes.trim() || null,
            })
            .select('*')
            .single()

        throwSupabaseError(error, 'Failed to create venue')

        if (!data) {
            throw new Error(
                'The venue was created but could not be returned.'
            )
        }

        return data
    },

    async updateVenue(
        venueId: string,
        organisationId: string,
        values: VenueFormValues
    ): Promise<void> {
        const { error } = await supabase
            .from('venues')
            .update({
                name: values.name.trim(),
                address: values.address.trim() || null,
                postcode: values.postcode.trim() || null,
                notes: values.notes.trim() || null,
            })
            .eq('id', venueId)
            .eq('organisation_id', organisationId)

        throwSupabaseError(error, 'Failed to update venue')
    },

    async deleteVenue(
        venueId: string,
        organisationId: string
    ): Promise<void> {
        const { error } = await supabase
            .from('venues')
            .delete()
            .eq('id', venueId)
            .eq('organisation_id', organisationId)

        throwSupabaseError(error, 'Failed to delete venue')
    },
}