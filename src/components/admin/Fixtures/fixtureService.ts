import { supabase } from '../../../lib/supabaseClient'
import type {
    Festival,
    Fixture,
    FixtureFormValues,
    FixtureTeam,
    FixtureVenue,
} from './fixtureTypes'

export const fixtureService = {
    async getActiveFestival(): Promise<Festival | null> {
        const { data, error } = await supabase
            .from('festivals')
            .select('id, name, year')
            .eq('status', 'active')
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error(error)
            throw error
        }

        return data
    },

    async getFixtures(festivalId: string): Promise<Fixture[]> {
        const { data, error } = await supabase
            .from('fixtures')
            .select('*')
            .eq('festival_id', festivalId)
            .order('kickoff_time', { ascending: true })

        if (error) throw error

        return data ?? []
    },

    async getTeams(festivalId: string): Promise<FixtureTeam[]> {
        const { data, error } = await supabase
            .from('teams')
            .select('id, name')
            .eq('festival_id', festivalId)
            .order('name', { ascending: true })

        if (error) throw error

        return data ?? []
    },

    async getVenues(festivalId: string): Promise<FixtureVenue[]> {
        const { data, error } = await supabase
            .from('venues')
            .select('id, name, address, postcode')
            .eq('festival_id', festivalId)
            .order('name', { ascending: true })

        if (error) throw error

        return data ?? []
    },

    async createFixture(
        festivalId: string,
        values: FixtureFormValues
    ): Promise<void> {
        const { error } = await supabase.from('fixtures').insert({
            festival_id: festivalId,
            home_team_id: values.home_team_id || null,
            away_team_id: values.away_team_id || null,
            venue_id: values.venue_id || null,
            stage: values.stage.trim(),
            kickoff_time: values.kickoff_time
                ? new Date(values.kickoff_time).toISOString()
                : null,
            status: values.status,
        })

        if (error) throw error
    },

    async updateFixture(
        fixtureId: string,
        values: FixtureFormValues
    ): Promise<void> {
        const { error } = await supabase
            .from('fixtures')
            .update({
                home_team_id: values.home_team_id || null,
                away_team_id: values.away_team_id || null,
                venue_id: values.venue_id || null,
                stage: values.stage.trim(),
                kickoff_time: values.kickoff_time
                    ? new Date(values.kickoff_time).toISOString()
                    : null,
                status: values.status,
            })
            .eq('id', fixtureId)

        if (error) throw error
    },

    async deleteFixture(fixtureId: string): Promise<void> {
        const { error } = await supabase
            .from('fixtures')
            .delete()
            .eq('id', fixtureId)

        if (error) throw error
    },
}