import { supabase } from '../../../lib/supabaseClient'
import type {
    ClubFixture,
    ClubFixtureFormValues,
    ClubFixtureSlot,
    ClubFixtureSlotFormValues,
    ClubOpponent,
    ClubOpponentFormValues,
    ClubSeason,
    ClubSeasonFormValues,
} from './clubFixtureTypes'

type SupabaseErrorLike = {
    message: string
}

function throwSupabaseError(
    error: SupabaseErrorLike | null,
    context: string
): void {
    if (!error) return

    console.error(`${context}:`, error)
    throw new Error(error.message)
}

function optionalText(value: string): string | null {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
}

function seasonPayload(values: ClubSeasonFormValues) {
    return {
        name: values.name.trim(),
        season_label: values.season_label.trim(),
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        status: values.status,
        updated_at: new Date().toISOString(),
    }
}

function opponentPayload(values: ClubOpponentFormValues) {
    return {
        name: values.name.trim(),
        contact_name: optionalText(values.contact_name),
        contact_phone: optionalText(values.contact_phone),
        contact_email: optionalText(values.contact_email),
        notes: optionalText(values.notes),
        active: values.active,
        updated_at: new Date().toISOString(),
    }
}

function slotPayload(values: ClubFixtureSlotFormValues) {
    return {
        fixture_date: values.fixture_date,
        slot_status: values.slot_status,
        slot_label: optionalText(values.slot_label),
        reason: optionalText(values.reason),
        notes: optionalText(values.notes),
        updated_at: new Date().toISOString(),
    }
}

function fixturePayload(values: ClubFixtureFormValues) {
    return {
        slot_id: values.slot_id || null,
        opponent_id: values.opponent_id || null,
        fixture_date: values.fixture_date,
        kickoff_time: values.kickoff_time || null,
        home_away: values.home_away,
        fixture_type: values.fixture_type,
        venue_name: optionalText(values.venue_name),
        venue_address: optionalText(values.venue_address),
        status: values.status,
        opponent_contact_name: optionalText(
            values.opponent_contact_name
        ),
        opponent_contact_phone: optionalText(
            values.opponent_contact_phone
        ),
        opponent_contact_email: optionalText(
            values.opponent_contact_email
        ),
        referee_name: optionalText(values.referee_name),
        notes: optionalText(values.notes),
        published: values.published,
        cancellation_reason: optionalText(
            values.cancellation_reason
        ),
        replaced_fixture_id:
            values.replaced_fixture_id || null,
        updated_at: new Date().toISOString(),
    }
}

export const clubFixtureService = {
    async getSeasons(
        organisationId: string
    ): Promise<ClubSeason[]> {
        const { data, error } = await supabase
            .from('club_seasons')
            .select('*')
            .eq('organisation_id', organisationId)
            .order('start_date', { ascending: false })

        throwSupabaseError(
            error,
            'Failed to load club seasons'
        )

        return (data ?? []) as ClubSeason[]
    },

    async createSeason(
        organisationId: string,
        values: ClubSeasonFormValues
    ): Promise<ClubSeason> {
        const { data, error } = await supabase
            .from('club_seasons')
            .insert({
                organisation_id: organisationId,
                ...seasonPayload(values),
            })
            .select('*')
            .single()

        throwSupabaseError(
            error,
            'Failed to create club season'
        )

        if (!data) {
            throw new Error(
                'The season was created but could not be returned.'
            )
        }

        return data as ClubSeason
    },

    async updateSeason(
        seasonId: string,
        values: ClubSeasonFormValues
    ): Promise<ClubSeason> {
        const { data, error } = await supabase
            .from('club_seasons')
            .update(seasonPayload(values))
            .eq('id', seasonId)
            .select('*')
            .single()

        throwSupabaseError(
            error,
            'Failed to update club season'
        )

        if (!data) {
            throw new Error(
                'The season was updated but could not be returned.'
            )
        }

        return data as ClubSeason
    },

    async getOpponents(
        organisationId: string
    ): Promise<ClubOpponent[]> {
        const { data, error } = await supabase
            .from('club_opponents')
            .select('*')
            .eq('organisation_id', organisationId)
            .order('name')

        throwSupabaseError(
            error,
            'Failed to load club opponents'
        )

        return (data ?? []) as ClubOpponent[]
    },

    async createOpponent(
        organisationId: string,
        values: ClubOpponentFormValues
    ): Promise<ClubOpponent> {
        const { data, error } = await supabase
            .from('club_opponents')
            .insert({
                organisation_id: organisationId,
                ...opponentPayload(values),
            })
            .select('*')
            .single()

        throwSupabaseError(
            error,
            'Failed to create club opponent'
        )

        if (!data) {
            throw new Error(
                'The opponent was created but could not be returned.'
            )
        }

        return data as ClubOpponent
    },

    async updateOpponent(
        opponentId: string,
        values: ClubOpponentFormValues
    ): Promise<ClubOpponent> {
        const { data, error } = await supabase
            .from('club_opponents')
            .update(opponentPayload(values))
            .eq('id', opponentId)
            .select('*')
            .single()

        throwSupabaseError(
            error,
            'Failed to update club opponent'
        )

        if (!data) {
            throw new Error(
                'The opponent was updated but could not be returned.'
            )
        }

        return data as ClubOpponent
    },

    async getSlots(
        seasonId: string
    ): Promise<ClubFixtureSlot[]> {
        const { data, error } = await supabase
            .from('club_fixture_slots')
            .select('*')
            .eq('season_id', seasonId)
            .order('fixture_date')

        throwSupabaseError(
            error,
            'Failed to load club fixture slots'
        )

        return (data ?? []) as ClubFixtureSlot[]
    },

    async createSlot(
        organisationId: string,
        seasonId: string,
        values: ClubFixtureSlotFormValues
    ): Promise<ClubFixtureSlot> {
        const { data, error } = await supabase
            .from('club_fixture_slots')
            .insert({
                organisation_id: organisationId,
                season_id: seasonId,
                ...slotPayload(values),
            })
            .select('*')
            .single()

        throwSupabaseError(
            error,
            'Failed to create club fixture slot'
        )

        if (!data) {
            throw new Error(
                'The fixture slot was created but could not be returned.'
            )
        }

        return data as ClubFixtureSlot
    },

    async updateSlot(
        slotId: string,
        values: ClubFixtureSlotFormValues
    ): Promise<ClubFixtureSlot> {
        const { data, error } = await supabase
            .from('club_fixture_slots')
            .update(slotPayload(values))
            .eq('id', slotId)
            .select('*')
            .single()

        throwSupabaseError(
            error,
            'Failed to update club fixture slot'
        )

        if (!data) {
            throw new Error(
                'The fixture slot was updated but could not be returned.'
            )
        }

        return data as ClubFixtureSlot
    },

    async getFixtures(
        seasonId: string
    ): Promise<ClubFixture[]> {
        const { data, error } = await supabase
            .from('club_fixtures')
            .select('*')
            .eq('season_id', seasonId)
            .order('fixture_date')

        throwSupabaseError(
            error,
            'Failed to load club fixtures'
        )

        return (data ?? []) as ClubFixture[]
    },

    async createFixture(
        organisationId: string,
        seasonId: string,
        values: ClubFixtureFormValues
    ): Promise<ClubFixture> {
        const { data, error } = await supabase
            .from('club_fixtures')
            .insert({
                organisation_id: organisationId,
                season_id: seasonId,
                ...fixturePayload(values),
            })
            .select('*')
            .single()

        throwSupabaseError(
            error,
            'Failed to create club fixture'
        )

        if (!data) {
            throw new Error(
                'The fixture was created but could not be returned.'
            )
        }

        return data as ClubFixture
    },

    async updateFixture(
        fixtureId: string,
        values: ClubFixtureFormValues
    ): Promise<ClubFixture> {
        const { data, error } = await supabase
            .from('club_fixtures')
            .update(fixturePayload(values))
            .eq('id', fixtureId)
            .select('*')
            .single()

        throwSupabaseError(
            error,
            'Failed to update club fixture'
        )

        if (!data) {
            throw new Error(
                'The fixture was updated but could not be returned.'
            )
        }

        return data as ClubFixture
    },


    async bulkUpdateFixtures(
        fixtureIds: string[],
        changes: {
            fixture_type?: ClubFixtureFormValues['fixture_type']
            status?: ClubFixtureFormValues['status']
            published?: boolean
            home_away?: ClubFixtureFormValues['home_away']
            venue_name?: string | null
        }
    ): Promise<void> {
        if (fixtureIds.length === 0) return

        const payload = {
            ...changes,
            updated_at: new Date().toISOString(),
        }

        const { error } = await supabase
            .from('club_fixtures')
            .update(payload)
            .in('id', fixtureIds)

        throwSupabaseError(
            error,
            'Failed to bulk update club fixtures'
        )
    },

    async deleteFixture(
        fixtureId: string
    ): Promise<void> {
        const { error } = await supabase
            .from('club_fixtures')
            .delete()
            .eq('id', fixtureId)

        throwSupabaseError(
            error,
            'Failed to delete club fixture'
        )
    },
}
