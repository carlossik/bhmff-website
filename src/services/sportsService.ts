import { supabase } from '../lib/supabaseClient'
import {
    Sport,
    SportOfficialRole,
    SportWithRoles,
    CreateSportInput,
    UpdateSportInput,
} from '../types/sportTypes'

const SPORTS_TABLE = 'sports'
const ROLES_TABLE = 'sport_official_roles'

export const sportsService = {
    async getAll(): Promise<Sport[]> {
        const { data, error } = await supabase
            .from(SPORTS_TABLE)
            .select('*')
            .order('name')

        if (error) throw error

        return data as Sport[]
    },

    async getActiveSports(): Promise<Sport[]> {
        const { data, error } = await supabase
            .from(SPORTS_TABLE)
            .select('*')
            .eq('active', true)
            .order('name')

        if (error) throw error

        return data as Sport[]
    },

    async getById(id: string): Promise<Sport | null> {
        const { data, error } = await supabase
            .from(SPORTS_TABLE)
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error

        return data as Sport
    },

    async getBySlug(slug: string): Promise<Sport | null> {
        const { data, error } = await supabase
            .from(SPORTS_TABLE)
            .select('*')
            .eq('slug', slug)
            .single()

        if (error) throw error

        return data as Sport
    },

    async getRolesForSport(
        sportId: string
    ): Promise<SportOfficialRole[]> {
        const { data, error } = await supabase
            .from(ROLES_TABLE)
            .select('*')
            .eq('sport_id', sportId)
            .eq('active', true)
            .order('sort_order')

        if (error) throw error

        return data as SportOfficialRole[]
    },

    async getSportWithRoles(
        sportId: string
    ): Promise<SportWithRoles | null> {
        const sport = await this.getById(sportId)

        if (!sport) {
            return null
        }

        const roles = await this.getRolesForSport(sportId)

        return {
            ...sport,
            roles,
        }
    },

    async create(input: CreateSportInput): Promise<Sport> {
        const { data, error } = await supabase
            .from(SPORTS_TABLE)
            .insert(input)
            .select()
            .single()

        if (error) throw error

        return data as Sport
    },

    async update(
        id: string,
        updates: UpdateSportInput
    ): Promise<Sport> {
        const { data, error } = await supabase
            .from(SPORTS_TABLE)
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return data as Sport
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from(SPORTS_TABLE)
            .delete()
            .eq('id', id)

        if (error) throw error
    },
}