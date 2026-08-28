import {
    useEffect,
    useState,
} from 'react'

import {
    CheckCircle2,
    Loader2,
} from 'lucide-react'

import {
    OrganisationForm,
} from '../admin/Organisations/OrganisationForm'
import type {
    Organisation,
    OrganisationFormData,
    OrganisationType,
} from '../admin/Organisations/organisationTypes'
import {
    getOrganisation,
    updateOrganisation,
} from '../admin/Organisations/organisationService'
import {
    onboardingService,
} from '../../services/onboardingService'
import {
    SetupWizardHeader,
} from '../../pages/onboarding/SetupWizardHeader'
import {
    trackSaasAnalyticsMilestone,
} from '../../lib/saasAnalytics'

const CURRENT_ORGANISATION_KEY =
    'tournamenthq-current-organisation'

type OrganisationStepProps = {
    organisationId: string | null
    requestedOrganisationType: OrganisationType
    onBack: () => void
    onCreated: (
        organisation: Organisation,
    ) => void
    onContinue: () => void
}

function getErrorMessage(
    error: unknown,
): string {
    return error instanceof Error
        ? error.message
        : 'Unable to complete the organisation setup.'
}

export function OrganisationStep({
    organisationId,
    requestedOrganisationType,
    onBack,
    onCreated,
    onContinue,
}: OrganisationStepProps) {
    const [organisation, setOrganisation] =
        useState<Organisation | null>(null)
    const [loading, setLoading] =
        useState(Boolean(organisationId))
    const [saving, setSaving] =
        useState(false)
    const [editing, setEditing] =
        useState(!organisationId)
    const [message, setMessage] =
        useState<string | null>(null)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    useEffect(() => {
        let mounted = true

        async function loadExisting() {
            if (!organisationId) {
                setLoading(false)
                setEditing(true)
                return
            }

            try {
                setLoading(true)
                setErrorMessage(null)

                const existing =
                    await getOrganisation(
                        organisationId,
                    )

                if (!mounted) {
                    return
                }

                if (!existing) {
                    setEditing(true)
                    setErrorMessage(
                        'The saved onboarding organisation could not be found. Create it again to continue.',
                    )
                    return
                }

                setOrganisation(existing)
                setEditing(false)
            } catch (error) {
                if (!mounted) {
                    return
                }

                setEditing(true)
                setErrorMessage(
                    getErrorMessage(error),
                )
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        void loadExisting()

        return () => {
            mounted = false
        }
    }, [organisationId])

    async function handleSave(
        values: OrganisationFormData,
        provisionalId?: string,
    ) {
        setSaving(true)
        setMessage(null)
        setErrorMessage(null)

        try {
            const journeyValues: OrganisationFormData = {
                ...values,
                organisation_type:
                    requestedOrganisationType,
            }

            if (organisation) {
                const updated =
                    await updateOrganisation(
                        organisation.id,
                        journeyValues,
                    )

                setOrganisation(updated)
                setEditing(false)
                setMessage(
                    updated.organisation_type ===
                        'club'
                        ? 'Club details updated successfully.'
                        : 'Organisation details updated successfully.',
                )
                onCreated(updated)
                return
            }

            const result =
                await onboardingService.createOrganisation({
                    organisation: journeyValues,
                    provisionalId,
                })

            window.localStorage.setItem(
                CURRENT_ORGANISATION_KEY,
                result.organisation.id,
            )

            setOrganisation(
                result.organisation,
            )
            setEditing(false)

            trackSaasAnalyticsMilestone(
                `organisation-created:${result.organisation.id}`,
                'organisation_created',
                {
                    organisation_type:
                        result.organisation
                            .organisation_type,
                },
            )

            if (result.warnings.length > 0) {
                setMessage(
                    result.warnings.join(' '),
                )
            } else if (
                result.ownerInvitationSent
            ) {
                setMessage(
                    result.organisation
                        .organisation_type ===
                    'club'
                        ? 'Club workspace created and the owner invitation was sent.'
                        : 'Organisation created and the owner invitation was sent.',
                )
            } else {
                setMessage(
                    result.organisation
                        .organisation_type ===
                    'club'
                        ? 'Club workspace created successfully.'
                        : 'Organisation created successfully.',
                )
            }

            onCreated(
                result.organisation,
            )
        } catch (error) {
            const resolved =
                getErrorMessage(error)

            setErrorMessage(resolved)
            throw new Error(resolved)
        } finally {
            setSaving(false)
        }
    }

    const effectiveOrganisationType =
        organisation?.organisation_type ??
        requestedOrganisationType
    const isClub =
        effectiveOrganisationType ===
        'club'

    if (loading) {
        return (
            <div className="grid min-h-[18rem] place-items-center">
                <div className="text-center">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--organisation-accent,#84cc16)]" />
                    <p className="mt-3 text-sm text-[var(--organisation-muted)]">
                        Loading your {isClub
                            ? 'club'
                            : 'organisation'} setup...
                    </p>
                </div>
            </div>
        )
    }

    if (editing) {
        return (
            <div>
                <div className="mb-6">
                    <SetupWizardHeader
                        title={
                            isClub
                                ? 'Your club'
                                : 'Your organisation'
                        }
                        description={
                            isClub
                                ? 'Create the club workspace that will manage your teams, squads, fixtures, results, public website, administrators and branding.'
                                : 'Create the organisation workspace that will own your competitions, public website, administrators and branding.'
                        }
                    />
                </div>

                {errorMessage && (
                    <div
                        role="alert"
                        className="mb-5 rounded-2xl border border-red-800/50 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-200"
                    >
                        {errorMessage}
                    </div>
                )}

                <OrganisationForm
                    organisation={
                        organisation ??
                        undefined
                    }
                    saving={saving}
                    showSubscriptionControls={false}
                    initialOrganisationType={
                        requestedOrganisationType
                    }
                    fixedOrganisationType={
                        requestedOrganisationType
                    }
                    onSave={handleSave}
                    onCancel={
                        organisation
                            ? () =>
                                  setEditing(false)
                            : onBack
                    }
                />
            </div>
        )
    }

    return (
        <div>
            <SetupWizardHeader
                title={
                    isClub
                        ? 'Club workspace created'
                        : 'Organisation created'
                }
                description={
                    isClub
                        ? 'Your TournamentHQ club workspace is provisioned. Review the details below, then continue to choose your plan and billing frequency.'
                        : 'Your TournamentHQ tenant is provisioned. Review the details below, then continue to choose your plan and billing frequency.'
                }
            />

            {message && (
                <div className="mt-6 rounded-2xl border border-[color:var(--organisation-border,#315125)] bg-[var(--organisation-accent,#84cc16)]/10 px-5 py-4 text-sm font-semibold text-[var(--organisation-accent,#84cc16)]">
                    {message}
                </div>
            )}

            {organisation && (
                <div className="mt-8 rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-[color:var(--organisation-border)] bg-white/[0.04] p-2">
                                {organisation.logo_url ? (
                                    <img
                                        src={organisation.logo_url}
                                        alt=""
                                        className="h-full w-full object-contain"
                                    />
                                ) : (
                                    <CheckCircle2 className="h-7 w-7 text-[var(--organisation-accent,#84cc16)]" />
                                )}
                            </div>

                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-400">
                                    {isClub
                                        ? 'Club'
                                        : 'Organisation'}
                                </p>
                                <h2 className="m-0 mt-1 text-xl font-black text-[var(--organisation-text)]">
                                    {organisation.name}
                                </h2>
                                <p className="mt-1 text-sm text-[var(--organisation-muted)]">
                                    /{organisation.slug}
                                </p>
                            </div>
                        </div>

                        <span className="inline-flex w-fit rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-emerald-300">
                            Ready
                        </span>
                    </div>
                </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[color:var(--organisation-border)] pt-6 sm:flex-row sm:justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-5 py-3 text-sm font-bold text-[var(--organisation-muted)] transition hover:bg-white/[0.06]"
                >
                    Back
                </button>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                        type="button"
                        onClick={() =>
                            setEditing(true)
                        }
                        className="rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/[0.06]"
                    >
                        Edit {isClub
                            ? 'club'
                            : 'organisation'}
                    </button>

                    <button
                        type="button"
                        onClick={onContinue}
                        className="rounded-xl bg-[var(--organisation-accent,#84cc16)] px-6 py-3 text-sm font-black text-[var(--organisation-on-accent,#071006)] transition hover:opacity-90"
                    >
                        Continue to plan & billing
                    </button>
                </div>
            </div>
        </div>
    )
}
