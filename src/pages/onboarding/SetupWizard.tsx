import {
    useEffect,
    useState,
} from 'react'

import {
    Loader2,
    LockKeyhole,
} from 'lucide-react'

import {
    BillingStep,
} from '../../components/onboarding/BillingStep'
import {
    BrandingStep,
} from '../../components/onboarding/BrandingStep'
import {
    ClubSetupStep,
} from '../../components/onboarding/ClubSetupStep'
import {
    CompetitionStep,
} from '../../components/onboarding/CompetitionStep'
import {
    FinishStep,
} from '../../components/onboarding/FinishStep'
import {
    OrganisationStep,
} from '../../components/onboarding/OrganisationStep'
import {
    WelcomeStep,
} from '../../components/onboarding/WelcomeStep'
import type {
    Organisation,
    OrganisationType,
} from '../../components/admin/Organisations/organisationTypes'
import {
    getOrganisation,
} from '../../components/admin/Organisations/organisationService'
import {
    getRequestedOrganisationTypeFromSearch,
    persistRequestedOrganisationType,
    resolveRequestedOrganisationType,
} from '../../config/onboardingJourney'
import {
    useSetupWizard,
} from '../../hooks/useSetupWizard'
import {
    supabase,
} from '../../lib/supabaseClient'
import {
    SetupWizardLayout,
} from './SetupWizardLayout'

type AccessState =
    | 'checking'
    | 'authenticated'
    | 'signed_out'

function getInitialOrganisationType(): OrganisationType {
    if (typeof window === 'undefined') {
        return 'competition_organiser'
    }

    return resolveRequestedOrganisationType(
        window.location.search,
    )
}

export function SetupWizard() {
    const wizard =
        useSetupWizard()

    const [accessState, setAccessState] =
        useState<AccessState>(
            'checking',
        )
    const [organisationType, setOrganisationType] =
        useState<OrganisationType>(
            getInitialOrganisationType,
        )
    const [journeyReady, setJourneyReady] =
        useState(false)

    useEffect(() => {
        let mounted = true

        async function checkSession() {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!mounted) {
                return
            }

            setAccessState(
                user
                    ? 'authenticated'
                    : 'signed_out',
            )
        }

        void checkSession()

        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        const requestedType =
            resolveRequestedOrganisationType(
                window.location.search,
            )

        setOrganisationType(
            requestedType,
        )
        persistRequestedOrganisationType(
            requestedType,
        )
    }, [])

    useEffect(() => {
        let mounted = true

        async function resolveJourney() {
            if (!wizard.isReady) {
                return
            }

            const explicitRequestedType =
                typeof window === 'undefined'
                    ? null
                    : getRequestedOrganisationTypeFromSearch(
                          window.location.search,
                      )

            const organisationId =
                wizard.draft.organisationId

            if (!organisationId) {
                if (mounted) {
                    setJourneyReady(true)
                }
                return
            }

            try {
                const organisation =
                    await getOrganisation(
                        organisationId,
                    )

                if (!mounted) {
                    return
                }

                if (!organisation) {
                    setJourneyReady(true)
                    return
                }

                if (
                    explicitRequestedType &&
                    organisation.organisation_type !==
                        explicitRequestedType
                ) {
                    wizard.reset()
                    setOrganisationType(
                        explicitRequestedType,
                    )
                    persistRequestedOrganisationType(
                        explicitRequestedType,
                    )
                    setJourneyReady(true)
                    return
                }

                const resolvedType =
                    explicitRequestedType ??
                    organisation.organisation_type

                setOrganisationType(
                    resolvedType,
                )
                persistRequestedOrganisationType(
                    resolvedType,
                )
                setJourneyReady(true)
            } catch {
                if (mounted) {
                    setJourneyReady(true)
                }
                // The individual wizard step will surface
                // organisation-loading failures where appropriate.
            }
        }

        void resolveJourney()

        return () => {
            mounted = false
        }
    }, [
        wizard.draft.organisationId,
        wizard.isReady,
        wizard.reset,
    ])

    function recordOrganisation(
        organisation: Organisation,
    ) {
        wizard.setOrganisationId(
            organisation.id,
        )
        setOrganisationType(
            organisation.organisation_type,
        )
        persistRequestedOrganisationType(
            organisation.organisation_type,
        )
    }

    const layoutProps = {
        currentStep: wizard.currentStep,
        completedSteps:
            wizard.draft.completedSteps,
        organisationType,
    }

    if (
        accessState === 'checking' ||
        (accessState === 'authenticated' &&
            (!wizard.isReady || !journeyReady))
    ) {
        return (
            <SetupWizardLayout
                {...layoutProps}
            >
                <div className="grid min-h-[22rem] place-items-center text-center">
                    <div>
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--organisation-accent,#84cc16)]" />
                        <p className="mt-4 text-sm text-slate-400">
                            Preparing your TournamentHQ setup...
                        </p>
                    </div>
                </div>
            </SetupWizardLayout>
        )
    }

    if (accessState === 'signed_out') {
        return (
            <SetupWizardLayout
                {...layoutProps}
            >
                <div className="mx-auto max-w-2xl py-10 text-center">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--organisation-accent,#84cc16)]/10 text-[var(--organisation-accent,#84cc16)]">
                        <LockKeyhole className="h-8 w-8" />
                    </div>

                    <h1 className="mt-6 text-3xl font-black text-white">
                        Sign in before continuing setup
                    </h1>

                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
                        Your TournamentHQ setup is protected by your verified account. Sign in to continue where you left off.
                    </p>

                    <a
                        href="/admin"
                        className="mt-7 inline-flex rounded-xl bg-[var(--organisation-accent,#84cc16)] px-6 py-3 text-sm font-black text-[var(--organisation-on-accent,#071006)] no-underline"
                    >
                        Open TournamentHQ sign in
                    </a>
                </div>
            </SetupWizardLayout>
        )
    }

    return (
        <SetupWizardLayout
            {...layoutProps}
        >
            {wizard.currentStep ===
                'welcome' && (
                <WelcomeStep
                    organisationType={
                        organisationType
                    }
                    onContinue={
                        wizard.goForward
                    }
                />
            )}

            {wizard.currentStep ===
                'organisation' && (
                <OrganisationStep
                    organisationId={
                        wizard.draft
                            .organisationId
                    }
                    requestedOrganisationType={
                        organisationType
                    }
                    onBack={wizard.goBack}
                    onCreated={
                        recordOrganisation
                    }
                    onContinue={
                        wizard.goForward
                    }
                />
            )}

            {wizard.currentStep ===
                'billing' && (
                <BillingStep
                    organisationId={
                        wizard.draft
                            .organisationId
                    }
                    onBack={wizard.goBack}
                    onContinue={
                        wizard.goForward
                    }
                />
            )}

            {wizard.currentStep ===
                'branding' && (
                <BrandingStep
                    organisationId={
                        wizard.draft
                            .organisationId
                    }
                    onBack={wizard.goBack}
                    onContinue={
                        wizard.goForward
                    }
                />
            )}

            {wizard.currentStep ===
                'competition' &&
                (organisationType ===
                'club' ? (
                    <ClubSetupStep
                        organisationId={
                            wizard.draft
                                .organisationId
                        }
                        onBack={
                            wizard.goBack
                        }
                        onFinish={
                            wizard.finish
                        }
                    />
                ) : (
                    <CompetitionStep
                        organisationId={
                            wizard.draft
                                .organisationId
                        }
                        competitionId={
                            wizard.draft
                                .competitionId
                        }
                        onBack={
                            wizard.goBack
                        }
                        onCreated={(
                            competition,
                        ) =>
                            wizard.setCompetitionId(
                                competition.id,
                            )
                        }
                        onFinish={
                            wizard.finish
                        }
                    />
                ))}

            {wizard.currentStep ===
                'finish' && (
                <FinishStep
                    organisationId={
                        wizard.draft
                            .organisationId
                    }
                    competitionId={
                        wizard.draft
                            .competitionId
                    }
                    onBack={wizard.goBack}
                />
            )}
        </SetupWizardLayout>
    )
}
