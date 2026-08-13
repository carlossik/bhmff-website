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
    description: string | null
    sport: string | null
    country: string | null
    currency: string | null
    founded_year: number | null
    home_ground: string | null
    website_url: string | null
    contact_email: string | null
    facebook_url: string | null
    instagram_url: string | null
    twitter_url: string | null
    youtube_url: string | null
    organisation_type:
        OrganisationFormData['organisation_type']
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
    value: string,
): string | null {
    const normalisedValue = value.trim()

    return normalisedValue || null
}

function toOrganisationRecord(
    organisation: OrganisationFormData,
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
                organisation.logo_url,
            ),
        description: normaliseOptionalText(organisation.description),
        sport: normaliseOptionalText(organisation.sport),
        country: normaliseOptionalText(organisation.country),
        currency: normaliseOptionalText(organisation.currency)?.toUpperCase() ?? null,
        founded_year: organisation.founded_year,
        home_ground: normaliseOptionalText(organisation.home_ground),
        website_url: normaliseOptionalText(organisation.website_url),
        contact_email:
            normaliseOptionalText(organisation.contact_email)?.toLowerCase() ?? null,
        facebook_url: normaliseOptionalText(organisation.facebook_url),
        instagram_url: normaliseOptionalText(organisation.instagram_url),
        twitter_url: normaliseOptionalText(organisation.twitter_url),
        youtube_url: normaliseOptionalText(organisation.youtube_url),
        organisation_type:
            organisation.organisation_type,
        status: organisation.status,
        subscription_plan:
            organisation.subscription_plan,
        subscription_status:
            organisation.subscription_status,
        trial_end:
            normaliseOptionalText(
                organisation.trial_end,
            ),
        max_users:
            organisation.max_users,
        max_competitions:
            organisation.max_competitions,
        public_site_enabled:
            organisation.public_site_enabled,
        owner_name:
            normaliseOptionalText(
                organisation.owner_name,
            ),
        owner_email:
            normaliseOptionalText(
                organisation.owner_email,
            )?.toLowerCase() ?? null,
        owner_phone:
            normaliseOptionalText(
                organisation.owner_phone,
            ),
        enabled_modules: [
            ...organisation.enabled_modules,
        ],
    }
}

function getErrorMessage(
    error: unknown,
): string {
    if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
    ) {
        return error.message
    }

    return 'Unable to create organisation.'
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
    id: string,
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
    excludeId?: string,
): Promise<boolean> {
    let query = supabase
        .from(TABLE)
        .select('id')
        .eq(
            'slug',
            slug.trim().toLowerCase(),
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
    provisionalId?: string,
): Promise<Organisation> {
    const record =
        toOrganisationRecord(organisation)

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error(
            'Unable to determine the current user.',
        )
    }

    /*
     * Organisation bootstrap must be atomic.
     *
     * A brand-new self-service customer cannot insert directly into
     * organisations because the normal RLS model correctly requires
     * existing tenant/platform access. The RPC creates the organisation,
     * owner membership and owner profile together inside one database
     * transaction without weakening tenant RLS.
     */
    const { data, error } = await supabase.rpc(
        'create_onboarding_organisation',
        {
            p_organisation: record,
            p_provisional_id:
                provisionalId ?? null,
        },
    )

    if (error) {
        const message = getErrorMessage(error)

        if (
            message
                .toLowerCase()
                .includes(
                    'organisation slug already exists',
                )
        ) {
            throw new Error(
                'An organisation with this slug already exists.',
            )
        }

        throw new Error(message)
    }

    if (!data) {
        throw new Error(
            'TournamentHQ did not return the created organisation.',
        )
    }

    let created =
        data as Organisation

    /*
     * Backward-compatible correction:
     * older versions of the onboarding RPC may not yet copy
     * organisation_type from the JSON payload.
     */
    if (
        created.organisation_type !==
        organisation.organisation_type
    ) {
        const {
            data: corrected,
            error: correctionError,
        } =
            await supabase
                .from(TABLE)
                .update({
                    organisation_type:
                        organisation.organisation_type,
                })
                .eq(
                    'id',
                    created.id,
                )
                .select()
                .single()

        if (correctionError) {
            throw new Error(
                `Organisation created, but its operating model could not be saved: ${correctionError.message}`,
            )
        }

        created =
            corrected as Organisation
    }

    return created
}

export async function updateOrganisation(
    id: string,
    organisation: OrganisationFormData,
): Promise<Organisation> {
    const record =
        toOrganisationRecord(organisation)

    const exists = await slugExists(
        record.slug,
        id,
    )

    if (exists) {
        throw new Error(
            'An organisation with this slug already exists.',
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
    id: string,
): Promise<void> {
    const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', id)

    if (error) {
        throw error
    }
}
