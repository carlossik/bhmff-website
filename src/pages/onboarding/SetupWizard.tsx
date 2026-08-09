import {
    useEffect,
    useState,
} from 'react'

import {
    Loader2,
    LockKeyhole,
} from 'lucide-react'

import {
    BrandingStep,
} from '../../components/onboarding/BrandingStep'
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

export function SetupWizard() {
    const wizard =
        useSetupWizard()

    const [accessState, setAccessState] =
        useState<AccessState>(
            'checking',
        )

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

    function recordOrganisation(
        organisationId: string,
    ) {
        wizard.setOrganisationId(
            organisationId,
        )
    }

    if (accessState === 'checking') {
        return (
            <SetupWizardLayout
                currentStep={
                    wizard.currentStep
                }
                completedSteps={
                    wizard.draft
                        .completedSteps
                }
            >
                <div className="grid min-h-[22rem] place-items-center text-center">
                    <div>
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--organisation-accent,#84cc16)]" />
                        <p className="mt-4 text-sm text-slate-400">
                            Checking your TournamentHQ session...
                        </p>
                    </div>
                </div>
            </SetupWizardLayout>
        )
    }

    if (accessState === 'signed_out') {
        return (
            <SetupWizardLayout
                currentStep={
                    wizard.currentStep
                }
                completedSteps={
                    wizard.draft
                        .completedSteps
                }
            >
                <div className="mx-auto max-w-2xl py-10 text-center">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--organisation-accent,#84cc16)]/10 text-[var(--organisation-accent,#84cc16)]">
                        <LockKeyhole className="h-8 w-8" />
                    </div>

                    <h1 className="mt-6 text-3xl font-black text-white">
                        Sign in before continuing setup
                    </h1>

                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
                        Sprint 1 now protects organisation provisioning behind a verified Supabase session. The public account-creation entry point will be connected from the marketing website in the next onboarding stage.
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
            currentStep={
                wizard.currentStep
            }
            completedSteps={
                wizard.draft
                    .completedSteps
            }
        >
            {wizard.currentStep ===
                'welcome' && (
                <WelcomeStep
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
                    onBack={wizard.goBack}
                    onCreated={(
                        organisation,
                    ) =>
                        recordOrganisation(
                            organisation.id,
                        )
                    }
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
                'competition' && (
                <CompetitionStep
                    organisationId={
                        wizard.draft
                            .organisationId
                    }
                    competitionId={
                        wizard.draft
                            .competitionId
                    }
                    onBack={wizard.goBack}
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
            )}

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
