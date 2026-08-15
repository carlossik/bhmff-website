import { supabase } from '../lib/supabaseClient'

import {
    createOrganisation,
    deleteOrganisation,
} from '../components/admin/Organisations/organisationService'

import {
    defaultOrganisation,
    type Organisation,
    type OrganisationFormData,
} from '../components/admin/Organisations/organisationTypes'

export type OnboardingNextStep =
    | 'create_first_competition'
    | 'complete_profile'
    | 'sign_in'

export type OnboardingResult = {
    organisation: Organisation
    ownerInvitationSent: boolean
    ownerInvitationSkipped: boolean
    nextStep: OnboardingNextStep
    warnings: string[]
}

export type CreateOrganisationOnboardingInput = {
    organisation: OrganisationFormData
    provisionalId?: string
    rollbackOnInvitationFailure?: boolean
}

type InviteResponse = {
    success?: boolean
    error?: string
    existingUser?: boolean
}

const DEFAULT_ENABLED_MODULES = [
    ...defaultOrganisation.enabled_modules,
]

function normaliseOptionalText(
    value: string,
): string {
    return value.trim()
}

function normaliseEmail(
    value: string,
): string {
    return value
        .trim()
        .toLowerCase()
}

function createSlug(
    value: string,
): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function getApplicationBaseUrl(): string {
    const configuredUrl =
        (
            import.meta.env
                .VITE_ADMIN_URL as
                | string
                | undefined
        )
            ?.trim()
            .replace(/\/$/, '')

    return (
        configuredUrl ||
        window.location.origin
    )
}

function getOwnerRedirectUrl(): string {
    return `${getApplicationBaseUrl()}/admin/set-password?invitation=true`
}

function validateInput(
    organisation: OrganisationFormData,
): void {
    if (!organisation.name.trim()) {
        throw new Error(
            'Organisation name is required.',
        )
    }

    if (!organisation.slug.trim()) {
        throw new Error(
            'Organisation slug is required.',
        )
    }

    if (!organisation.owner_name.trim()) {
        throw new Error(
            'Organisation owner name is required.',
        )
    }

    if (!organisation.owner_email.trim()) {
        throw new Error(
            'Organisation owner email is required.',
        )
    }

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            organisation.owner_email.trim(),
        )
    ) {
        throw new Error(
            'Organisation owner email is invalid.',
        )
    }

    if (
        organisation.max_users < 1
    ) {
        throw new Error(
            'Maximum users must be at least 1.',
        )
    }

    if (
        organisation.max_competitions <
        1
    ) {
        throw new Error(
            'Maximum competitions must be at least 1.',
        )
    }
}

function applyOnboardingDefaults(
    organisation: OrganisationFormData,
): OrganisationFormData {
    const enabledModules =
        organisation.enabled_modules.length >
        0
            ? [
                ...new Set(
                    organisation.enabled_modules,
                ),
            ]
            : DEFAULT_ENABLED_MODULES

    return {
        ...defaultOrganisation,
        ...organisation,
        name:
            organisation.name.trim(),
        slug:
            createSlug(
                organisation.slug ||
                organisation.name,
            ),
        owner_name:
            organisation.owner_name.trim(),
        owner_email:
            normaliseEmail(
                organisation.owner_email,
            ),
        owner_phone:
            normaliseOptionalText(
                organisation.owner_phone,
            ),
        logo_url:
            normaliseOptionalText(
                organisation.logo_url,
            ),
        trial_end:
            normaliseOptionalText(
                organisation.trial_end,
            ),
        enabled_modules:
        enabledModules,
    }
}

async function ensureClubWorkspaceRecord(
    organisation: Organisation,
): Promise<void> {
    if (organisation.organisation_type !== 'club') {
        return
    }

    const {
        data: existingClub,
        error: existingClubError,
    } = await supabase
        .from('clubs')
        .select('id')
        .eq(
            'organisation_id',
            organisation.id,
        )
        .limit(1)
        .maybeSingle()

    if (existingClubError) {
        throw existingClubError
    }

    if (existingClub) {
        return
    }

    const { error: createClubError } =
        await supabase
            .from('clubs')
            .insert({
                organisation_id:
                    organisation.id,
                name:
                    organisation.name.trim(),
                badge_url:
                    organisation.logo_url
                        ?.trim() || null,
            })

    if (createClubError) {
        throw createClubError
    }
}

async function inviteOrganisationOwner(
    organisation: Organisation,
    ownerName: string,
    ownerEmail: string,
): Promise<{
    sent: boolean
    skipped: boolean
}> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error(
            'Unable to determine the current authenticated user.',
        )
    }

    const currentUserEmail =
        user.email
            ?.trim()
            .toLowerCase() ?? ''

    if (
        currentUserEmail &&
        currentUserEmail === ownerEmail
    ) {
        return {
            sent: false,
            skipped: true,
        }
    }

    const {
        data,
        error,
    } =
        await supabase.functions.invoke<InviteResponse>(
            'invite-admin-user',
            {
                body: {
                    action: 'invite',
                    organisationId:
                    organisation.id,
                    fullName:
                    ownerName,
                    email:
                    ownerEmail,
                    role:
                        'super_admin',
                    redirectUrl:
                        getOwnerRedirectUrl(),
                },
            },
        )

    if (error) {
        throw error
    }

    if (
        !data?.success
    ) {
        throw new Error(
            data?.error ||
            'The organisation owner invitation could not be sent.',
        )
    }

    return {
        sent: true,
        skipped: false,
    }
}

export async function createOrganisationOnboarding(
    input: CreateOrganisationOnboardingInput,
): Promise<OnboardingResult> {
    validateInput(
        input.organisation,
    )

    const organisationData =
        applyOnboardingDefaults(
            input.organisation,
        )

    let createdOrganisation:
        | Organisation
        | null = null

    const warnings: string[] = []

    try {
        createdOrganisation =
            await createOrganisation(
                organisationData,
                input.provisionalId,
            )

        if (
            createdOrganisation.organisation_type ===
            'club'
        ) {
            try {
                await ensureClubWorkspaceRecord(
                    createdOrganisation,
                )
            } catch (clubBootstrapError) {
                const message =
                    clubBootstrapError instanceof
                    Error
                        ? clubBootstrapError.message
                        : 'The club record could not be initialised.'

                warnings.push(
                    `The club workspace was created, but its club record could not be initialised automatically: ${message}`,
                )
            }
        }

        try {
            const invitation =
                await inviteOrganisationOwner(
                    createdOrganisation,
                    organisationData.owner_name,
                    organisationData.owner_email,
                )

            return {
                organisation:
                createdOrganisation,
                ownerInvitationSent:
                invitation.sent,
                ownerInvitationSkipped:
                invitation.skipped,
                nextStep:
                    organisationData.organisation_type === 'club'
                        ? 'complete_profile'
                        : 'create_first_competition',
                warnings,
            }
        } catch (invitationError) {
            const message =
                invitationError instanceof
                Error
                    ? invitationError.message
                    : 'The owner invitation could not be sent.'

            if (
                input.rollbackOnInvitationFailure
            ) {
                await deleteOrganisation(
                    createdOrganisation.id,
                )

                throw new Error(
                    `Organisation creation was rolled back because the owner invitation failed: ${message}`,
                )
            }

            warnings.push(
                `The organisation was created, but the owner invitation was not sent: ${message}`,
            )

            return {
                organisation:
                createdOrganisation,
                ownerInvitationSent:
                    false,
                ownerInvitationSkipped:
                    false,
                nextStep:
                    organisationData.organisation_type === 'club'
                        ? 'complete_profile'
                        : 'create_first_competition',
                warnings,
            }
        }
    } catch (error) {
        if (
            createdOrganisation &&
            input.rollbackOnInvitationFailure
        ) {
            try {
                await deleteOrganisation(
                    createdOrganisation.id,
                )
            } catch (rollbackError) {
                console.error(
                    'Failed to roll back organisation onboarding:',
                    rollbackError,
                )
            }
        }

        throw error
    }
}

export const onboardingService = {
    createOrganisation:
    createOrganisationOnboarding,
    applyDefaults:
    applyOnboardingDefaults,
}