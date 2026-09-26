import { supabase } from '../../../lib/supabaseClient'
import type {
    Venue,
    VenueFormValues,
    VenueHomeTeam,
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
    async getHomeTeams(organisationId: string): Promise<VenueHomeTeam[]> {
        const { data, error } = await supabase.from('teams')
            .select('id,name,primary_home_venue_id')
            .eq('organisation_id', organisationId)
            .order('name')
        throwSupabaseError(error, 'Failed to load home teams')
        return (data ?? []) as VenueHomeTeam[]
    },
    async getVenues(
        _competitionId: string,
        organisationId: string
    ): Promise<Venue[]> {
        const { data, error } = await supabase
            .from('venues')
            .select('*')
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
        _competitionId: string,
        organisationId: string,
        values: VenueFormValues
    ): Promise<Venue> {
        const { data, error } = await supabase
            .from('venues')
            .insert({
                // Home grounds must remain available across competitions and seasons.
                competition_id: null,
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
        _competitionId: string,
        organisationId: string,
        values: VenueFormValues
    ): Promise<void> {
        const { data, error } = await supabase
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
                'organisation_id',
                organisationId
            )
            .select('id')
            .maybeSingle()

        throwSupabaseError(
            error,
            'Failed to update venue'
        )
        if (!data) throw new Error('Venue unavailable. Refresh the page and try again.')
    },

    async deleteVenue(
        venueId: string,
        _competitionId: string,
        organisationId: string
    ): Promise<void> {
        const { data, error } = await supabase
            .from('venues')
            .delete()
            .eq('id', venueId)
            .eq(
                'organisation_id',
                organisationId
            )
            .select('id')
            .maybeSingle()

        throwSupabaseError(
            error,
            'Failed to delete venue'
        )
        if (!data) throw new Error('Venue unavailable. Refresh the page and try again.')
    },
}
