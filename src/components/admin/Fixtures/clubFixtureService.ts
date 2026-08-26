import { supabase } from '../../../lib/supabaseClient'
import type {
    ClubFixture,
    ClubFixtureFormValues,
    ClubFixtureSlot,
    ClubFixtureSlotFormValues,
    ClubFixtureTeamOption,
    ClubOpponent,
    ClubOpponentFormValues,
    ClubSeason,
    ClubSeasonFormValues,
} from './clubFixtureTypes'

type SupabaseErrorLike = {
    message: string
}

type TeamIdRow = {
    team_id: string
}

type TeamRow = {
    id: string
    name: string
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
        ...(values.team_id
            ? { team_id: values.team_id }
            : {}),
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
        ...(values.team_id
            ? { team_id: values.team_id }
            : {}),
        slot_id: values.slot_id || null,
        opponent_id: values.opponent_id || null,
        fixture_date: values.fixture_date,
        kickoff_time: values.kickoff_time || null,
        home_away: values.home_away,
        fixture_type: values.fixture_type,
        match_format: values.match_format,
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

    async findOrCreateOpponent(
        organisationId: string,
        opponentName: string
    ): Promise<ClubOpponent> {
        const normalisedName = opponentName.trim()

        if (!normalisedName) {
            throw new Error('Opponent name is required.')
        }

        const { data: existingRows, error: existingError } =
            await supabase
                .from('club_opponents')
                .select('*')
                .eq('organisation_id', organisationId)
                .ilike('name', normalisedName)
                .limit(1)

        throwSupabaseError(
            existingError,
            'Failed to check club opponent'
        )

        const existing = (existingRows ?? [])[0] as
            | ClubOpponent
            | undefined

        if (existing) {
            return existing
        }

        const { data, error } = await supabase
            .from('club_opponents')
            .insert({
                organisation_id: organisationId,
                name: normalisedName,
                active: true,
                updated_at: new Date().toISOString(),
            })
            .select('*')
            .single()

        if (error) {
            // A concurrent admin may have created the same opponent.
            const { data: retryRows, error: retryError } =
                await supabase
                    .from('club_opponents')
                    .select('*')
                    .eq('organisation_id', organisationId)
                    .ilike('name', normalisedName)
                    .limit(1)

            throwSupabaseError(
                retryError,
                'Failed to recover club opponent'
            )

            const retry = (retryRows ?? [])[0] as
                | ClubOpponent
                | undefined

            if (retry) {
                return retry
            }

            throwSupabaseError(
                error,
                'Failed to create club opponent'
            )
        }

        if (!data) {
            throw new Error(
                'The opponent was created but could not be returned.'
            )
        }

        return data as ClubOpponent
    },

    async getTeamOptions(
        organisationId: string,
        seasonId: string
    ): Promise<ClubFixtureTeamOption[]> {
        const { data: links, error: linkError } = await supabase
            .from('club_team_seasons')
            .select('team_id')
            .eq('organisation_id', organisationId)
            .eq('season_id', seasonId)
            .neq('status', 'archived')

        throwSupabaseError(
            linkError,
            'Failed to load club team-season links'
        )

        const teamIds = ((links ?? []) as TeamIdRow[])
            .map(row => row.team_id)
            .filter(Boolean)

        if (teamIds.length === 0) {
            return []
        }

        const { data: teams, error: teamError } = await supabase
            .from('teams')
            .select('id,name')
            .eq('organisation_id', organisationId)
            .in('id', teamIds)
            .order('name')

        throwSupabaseError(
            teamError,
            'Failed to load club fixture teams'
        )

        return ((teams ?? []) as TeamRow[]).map(team => ({
            id: team.id,
            name: team.name,
        }))
    },

    async getSlots(
        seasonId: string,
        teamId?: string
    ): Promise<ClubFixtureSlot[]> {
        let query = supabase
            .from('club_fixture_slots')
            .select('*')
            .eq('season_id', seasonId)

        if (teamId) {
            query = query.eq('team_id', teamId)
        }

        const { data, error } = await query.order('fixture_date')

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
        seasonId: string,
        teamId?: string
    ): Promise<ClubFixture[]> {
        let query = supabase
            .from('club_fixtures')
            .select('*')
            .eq('season_id', seasonId)

        if (teamId) {
            query = query.eq('team_id', teamId)
        }

        const { data, error } = await query
            .order('fixture_date')
            .order('kickoff_time')

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
