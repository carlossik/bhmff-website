import { supabase } from '../../../lib/supabaseClient'
import type {
    ExistingFixture,
    GeneratedFixturePreview,
    GeneratorFestival,
    GeneratorGroup,
    GeneratorMembership,
    GeneratorTeam,
    GeneratorVenue,
} from './tournamentGeneratorTypes'

function throwSupabaseError(
    error: { message: string } | null,
    context: string
) {
    if (!error) return

    console.error(`${context}:`, error)
    throw new Error(error.message)
}

export const tournamentGeneratorService = {
    async getActiveFestival(): Promise<GeneratorFestival | null> {
        const { data, error } = await supabase
            .from('festivals')
            .select('id, name, year')
            .eq('status', 'active')
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle()

        throwSupabaseError(
            error,
            'Failed to load the active festival'
        )

        return data
    },

    async getGroups(
        festivalId: string
    ): Promise<GeneratorGroup[]> {
        const { data, error } = await supabase
            .from('groups')
            .select('id, name, sort_order')
            .eq('festival_id', festivalId)
            .order('sort_order', { ascending: true })

        throwSupabaseError(
            error,
            'Failed to load tournament groups'
        )

        return data ?? []
    },

    async getTeams(
        festivalId: string
    ): Promise<GeneratorTeam[]> {
        const { data, error } = await supabase
            .from('teams')
            .select(
                'id, name, published, participation_status, primary_home_venue_id'
            )
            .eq('festival_id', festivalId)
            .order('name', { ascending: true })

        throwSupabaseError(
            error,
            'Failed to load tournament teams'
        )

        return (data ?? []) as GeneratorTeam[]
    },

    async getMemberships(
        groupIds: string[]
    ): Promise<GeneratorMembership[]> {
        if (!groupIds.length) return []

        const { data, error } = await supabase
            .from('group_teams')
            .select('group_id, team_id')
            .in('group_id', groupIds)

        throwSupabaseError(
            error,
            'Failed to load group allocations'
        )

        return data ?? []
    },

    async getVenues(
        festivalId: string
    ): Promise<GeneratorVenue[]> {
        const { data, error } = await supabase
            .from('venues')
            .select('id, name')
            .eq('festival_id', festivalId)
            .order('name', { ascending: true })

        throwSupabaseError(
            error,
            'Failed to load tournament venues'
        )

        return data ?? []
    },

    async getExistingFixtures(
        festivalId: string
    ): Promise<ExistingFixture[]> {
        const { data, error } = await supabase
            .from('fixtures')
            .select(`
                id,
                group_id,
                stage,
                home_team_id,
                away_team_id
            `)
            .eq('festival_id', festivalId)

        throwSupabaseError(
            error,
            'Failed to check existing fixtures'
        )

        return (data ?? []) as ExistingFixture[]
    },

    async createFixtures(
        festivalId: string,
        fixtures: GeneratedFixturePreview[],
        publishImmediately: boolean
    ): Promise<void> {
        if (!fixtures.length) {
            throw new Error(
                'There are no generated fixtures to save.'
            )
        }

        const payload = fixtures.map((fixture) => ({
            festival_id: festivalId,
            group_id: fixture.groupId,
            home_team_id: fixture.homeTeamId,
            away_team_id: fixture.awayTeamId,
            venue_id: fixture.venueId,
            stage: fixture.stage,
            kickoff_time: fixture.kickoffTime,
            status: 'scheduled',
            published: publishImmediately,
        }))

        const { error } = await supabase
            .from('fixtures')
            .insert(payload)

        throwSupabaseError(
            error,
            'Failed to save generated fixtures'
        )
    },
}