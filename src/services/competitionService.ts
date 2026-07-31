import { supabase } from '../lib/supabaseClient'
import {
    Competition,
    CreateCompetitionInput,
    UpdateCompetitionInput,
} from '../types/competitionTypes'

const TABLE = 'competitions'

const DEFAULT_SELECT = `
    *,
    sport:sports(*)
`

export const competitionService = {
    async getAll(organisationId: string): Promise<Competition[]> {
        const { data, error } = await supabase
            .from(TABLE)
            .select(DEFAULT_SELECT)
            .eq('organisation_id', organisationId)
            .order('created_at')

        if (error) throw error

        return data as Competition[]
    },

    async getById(id: string): Promise<Competition | null> {
        const { data, error } = await supabase
            .from(TABLE)
            .select(DEFAULT_SELECT)
            .eq('id', id)
            .single()

        if (error) throw error

        return data as Competition
    },

    async create(input: CreateCompetitionInput): Promise<Competition> {
        const { data, error } = await supabase
            .from(TABLE)
            .insert(input)
            .select(DEFAULT_SELECT)
            .single()

        if (error) throw error

        return data as Competition
    },

    async update(
        id: string,
        updates: UpdateCompetitionInput
    ): Promise<Competition> {
        const { data, error } = await supabase
            .from(TABLE)
            .update(updates)
            .eq('id', id)
            .select(DEFAULT_SELECT)
            .single()

        if (error) throw error

        return data as Competition
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)

        if (error) throw error
    },
}