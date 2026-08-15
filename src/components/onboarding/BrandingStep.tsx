import {
    useEffect,
    useState,
} from 'react'

import {
    Building2,
    Loader2,
    Palette,
} from 'lucide-react'

import {
    OrganisationForm,
} from '../admin/Organisations/OrganisationForm'
import type {
    Organisation,
    OrganisationFormData,
} from '../admin/Organisations/organisationTypes'
import {
    getOrganisation,
    updateOrganisation,
} from '../admin/Organisations/organisationService'
import {
    SetupWizardHeader,
} from '../../pages/onboarding/SetupWizardHeader'
import {
    SetupWizardNavigation,
} from '../../pages/onboarding/SetupWizardNavigation'

type BrandingStepProps = {
    organisationId: string | null
    onBack: () => void
    onContinue: () => void
}

function getErrorMessage(
    error: unknown,
): string {
    return error instanceof Error
        ? error.message
        : 'Unable to load the organisation branding.'
}

export function BrandingStep({
    organisationId,
    onBack,
    onContinue,
}: BrandingStepProps) {
    const [organisation, setOrganisation] =
        useState<Organisation | null>(null)
    const [loading, setLoading] =
        useState(true)
    const [saving, setSaving] =
        useState(false)
    const [editing, setEditing] =
        useState(false)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    async function loadOrganisation() {
        if (!organisationId) {
            setOrganisation(null)
            setErrorMessage(
                'Create your organisation before configuring branding.',
            )
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setErrorMessage(null)

            const result =
                await getOrganisation(
                    organisationId,
                )

            if (!result) {
                throw new Error(
                    'The onboarding organisation could not be found.',
                )
            }

            setOrganisation(result)
        } catch (error) {
            setErrorMessage(
                getErrorMessage(error),
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadOrganisation()
    }, [organisationId])

    async function handleSave(
        values: OrganisationFormData,
    ) {
        if (!organisation) {
            throw new Error(
                'The organisation is unavailable.',
            )
        }

        setSaving(true)
        setErrorMessage(null)

        try {
            const updated =
                await updateOrganisation(
                    organisation.id,
                    values,
                )

            setOrganisation(updated)
            setEditing(false)
        } catch (error) {
            const resolved =
                getErrorMessage(error)
            setErrorMessage(resolved)
            throw new Error(resolved)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="grid min-h-[18rem] place-items-center">
                <Loader2 className="h-7 w-7 animate-spin text-[var(--organisation-accent,#84cc16)]" />
            </div>
        )
    }

    const isClub =
        organisation?.organisation_type ===
        'club'

    if (editing && organisation) {
        return (
            <div>
                <SetupWizardHeader
                    title="Edit your branding"
                    description={
                        isClub
                            ? 'Update the club logo, colours and public-site presentation used across the TournamentHQ Club Portal.'
                            : 'Use the same production organisation editor to update your logo, palette and public-site presentation.'
                    }
                />

                <div className="mt-6">
                    <OrganisationForm
                        organisation={organisation}
                        saving={saving}
                        onSave={handleSave}
                        onCancel={() =>
                            setEditing(false)
                        }
                    />
                </div>
            </div>
        )
    }

    const colours = organisation
        ? [
              organisation.primary_colour,
              organisation.secondary_colour,
              organisation.accent_colour,
              organisation.background_colour,
              organisation.surface_colour,
              organisation.text_colour,
          ].filter(
              (colour): colour is string =>
                  Boolean(colour),
          )
        : []

    return (
        <div>
            <SetupWizardHeader
                title="Brand your experience"
                description={
                    isClub
                        ? 'TournamentHQ will use this identity across your club website and club-management workspace.'
                        : 'TournamentHQ will use this identity across your public site and organisation-aware workspace.'
                }
            />

            {errorMessage && (
                <div
                    role="alert"
                    className="mt-6 rounded-2xl border border-red-800/50 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-200"
                >
                    {errorMessage}
                </div>
            )}

            {organisation && (
                <div className="mt-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                    <section className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-6">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--organisation-accent,#84cc16)]/10 text-[var(--organisation-accent,#84cc16)]">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                    {isClub
                                        ? 'Club'
                                        : 'Organisation'}
                                </p>
                                <h2 className="mt-1 text-lg font-black text-[var(--organisation-text)]">
                                    {organisation.name}
                                </h2>
                            </div>
                        </div>

                        <div className="mt-6 grid min-h-40 place-items-center rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-5">
                            {organisation.logo_url ? (
                                <img
                                    src={organisation.logo_url}
                                    alt={`${organisation.name} logo`}
                                    className="max-h-28 max-w-full object-contain"
                                />
                            ) : (
                                <div className="text-center">
                                    <Building2 className="mx-auto h-9 w-9 text-slate-600" />
                                    <p className="mt-3 text-sm text-slate-500">
                                        No logo uploaded yet
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-6">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--organisation-accent,#84cc16)]/10 text-[var(--organisation-accent,#84cc16)]">
                                <Palette className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                    Saved palette
                                </p>
                                <h2 className="mt-1 text-lg font-black text-[var(--organisation-text)]">
                                    White-label theme
                                </h2>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            {colours.map(
                                (colour, index) => (
                                    <div
                                        key={`${colour}-${index}`}
                                        className="w-24 rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-2"
                                    >
                                        <div
                                            className="h-14 rounded-lg border border-black/20"
                                            style={{
                                                backgroundColor:
                                                    colour,
                                            }}
                                        />
                                        <span className="mt-2 block truncate text-center text-[10px] font-bold uppercase text-slate-500">
                                            {colour}
                                        </span>
                                    </div>
                                ),
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setEditing(true)
                            }
                            className="mt-6 rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/[0.06]"
                        >
                            Edit logo and colours
                        </button>
                    </section>
                </div>
            )}

            <div className="mt-8">
                <SetupWizardNavigation
                    canGoBack
                    canGoForward={
                        Boolean(organisation)
                    }
                    onBack={onBack}
                    onNext={onContinue}
                    nextLabel={
                        isClub
                            ? 'Continue to club setup'
                            : 'Create first competition'
                    }
                />
            </div>
        </div>
    )
}
