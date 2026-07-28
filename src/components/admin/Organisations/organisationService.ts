import { supabase } from '../../../lib/supabaseClient'

import type {
    Organisation,
    OrganisationFormData,
} from './organisationTypes'

const TABLE = 'organisations'

type OrganisationRecord = {
    name: string
    slug: string
    primary_colour: string
    secondary_colour: string
    accent_colour: string
    background_colour: string
    surface_colour: string
    text_colour: string
    logo_url: string | null
    status: OrganisationFormData['status']
    subscription_plan:
        OrganisationFormData['subscription_plan']
    subscription_status:
        OrganisationFormData['subscription_status']
    trial_end: string | null
    max_users: number
    max_competitions: number
    public_site_enabled: boolean
    owner_name: string | null
    owner_email: string | null
    owner_phone: string | null
    enabled_modules:
        OrganisationFormData['enabled_modules']
}

function normaliseOptionalText(
    value: string
): string | null {
    const normalisedValue = value.trim()

    return normalisedValue || null
}

function toOrganisationRecord(
    organisation: OrganisationFormData
): OrganisationRecord {
    return {
        name: organisation.name.trim(),
        slug: organisation.slug
            .trim()
            .toLowerCase(),
        primary_colour:
            organisation.primary_colour,
        secondary_colour:
            organisation.secondary_colour,
        accent_colour:
            organisation.accent_colour,
        background_colour:
            organisation.background_colour,
        surface_colour:
            organisation.surface_colour,
        text_colour:
            organisation.text_colour,
        logo_url:
            normaliseOptionalText(
                organisation.logo_url
            ),
        status: organisation.status,
        subscription_plan:
            organisation.subscription_plan,
        subscription_status:
            organisation.subscription_status,
        trial_end:
            normaliseOptionalText(
                organisation.trial_end
            ),
        max_users:
            organisation.max_users,
        max_competitions:
            organisation.max_competitions,
        public_site_enabled:
            organisation.public_site_enabled,
        owner_name:
            normaliseOptionalText(
                organisation.owner_name
            ),
        owner_email:
            normaliseOptionalText(
                organisation.owner_email
            )?.toLowerCase() ?? null,
        owner_phone:
            normaliseOptionalText(
                organisation.owner_phone
            ),
        enabled_modules: [
            ...organisation.enabled_modules,
        ],
    }
}

export async function getOrganisations(): Promise<
    Organisation[]
> {
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
        .eq(
            'slug',
            slug.trim().toLowerCase()
        )

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
    organisation: OrganisationFormData,
    provisionalId?: string
): Promise<Organisation> {
    const record =
        toOrganisationRecord(organisation)

    const exists = await slugExists(
        record.slug
    )

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
            ...(provisionalId
                ? { id: provisionalId }
                : {}),
            ...record,
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
    const record =
        toOrganisationRecord(organisation)

    const exists = await slugExists(
        record.slug,
        id
    )

    if (exists) {
        throw new Error(
            'An organisation with this slug already exists.'
        )
    }

    const { data, error } = await supabase
        .from(TABLE)
        .update(record)
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
