import { supabase } from '../../../lib/supabaseClient'
import type {
    Organisation,
    OrganisationFormData,
} from './organisationTypes'

const TABLE = 'organisations'

export async function getOrganisations(): Promise<Organisation[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('name')

    if (error) {
        throw error
    }

    return (data ?? []) as Organisation[]
}

export async function getOrganisation(
    id: string
): Promise<Organisation | null> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle()

    if (error) {
        throw error
    }

    return data as Organisation | null
}

export async function slugExists(
    slug: string,
    excludeId?: string
): Promise<boolean> {
    let query = supabase
        .from(TABLE)
        .select('id')
        .eq('slug', slug)

    if (excludeId) {
        query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) {
        throw error
    }

    return (data?.length ?? 0) > 0
}

export async function createOrganisation(
    organisation: OrganisationFormData
): Promise<Organisation> {
    const exists = await slugExists(organisation.slug)

    if (exists) {
        throw new Error(
            'An organisation with this slug already exists.'
        )
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error(
            'Unable to determine the current user.'
        )
    }

    const {
        data: newOrganisation,
        error: organisationError,
    } = await supabase
        .from(TABLE)
        .insert({
            name: organisation.name,
            slug: organisation.slug.toLowerCase(),
            primary_colour:
            organisation.primary_colour,
            secondary_colour:
            organisation.secondary_colour,
            logo_url:
                organisation.logo_url || null,
            status: organisation.status,
        })
        .select()
        .single()

    if (organisationError) {
        throw organisationError
    }

    const { error: membershipError } =
        await supabase
            .from('organisation_memberships')
            .insert({
                organisation_id:
                newOrganisation.id,
                user_id: user.id,
                role: 'super_admin',
                active: true,
            })

    if (membershipError) {
        await supabase
            .from(TABLE)
            .delete()
            .eq(
                'id',
                newOrganisation.id
            )

        throw membershipError
    }

    return newOrganisation as Organisation
}
export async function updateOrganisation(
    id: string,
    organisation: OrganisationFormData
): Promise<Organisation> {
    const exists = await slugExists(
        organisation.slug,
        id
    )

    if (exists) {
        throw new Error(
            'An organisation with this slug already exists.'
        )
    }

    const { data, error } = await supabase
        .from(TABLE)
        .update({
            name: organisation.name,
            slug: organisation.slug.toLowerCase(),
            primary_colour: organisation.primary_colour,
            secondary_colour: organisation.secondary_colour,
            logo_url:
                organisation.logo_url || null,
            status: organisation.status,
        })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        throw error
    }

    return data as Organisation
}

export async function deleteOrganisation(
    id: string
): Promise<void> {
    const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', id)

    if (error) {
        throw error
    }
}