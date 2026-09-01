import {
    Check,
} from 'lucide-react'

import type {
    OrganisationType,
} from '../../components/admin/Organisations/organisationTypes'
import {
    SETUP_WIZARD_STEPS,
    type SetupWizardStep,
} from '../../types/setupWizard'

type SetupWizardProgressProps = {
    currentStep: SetupWizardStep
    completedSteps: SetupWizardStep[]
    organisationType: OrganisationType
}

function getStepLabels(
    organisationType: OrganisationType,
): Readonly<Record<SetupWizardStep, string>> {
    const isClub =
        organisationType === 'club'

    return {
        welcome: 'Welcome',
        organisation: isClub
            ? 'Club'
            : 'Organisation',
        billing: 'Plan & Billing',
        branding: 'Branding',
        competition: 'Quick Start',
        finish: 'Finish',
    }
}

export function SetupWizardProgress({
    currentStep,
    completedSteps,
    organisationType,
}: SetupWizardProgressProps) {
    const currentIndex =
        SETUP_WIZARD_STEPS.indexOf(
            currentStep,
        )
    const stepLabels =
        getStepLabels(
            organisationType,
        )

    return (
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {SETUP_WIZARD_STEPS.map(
                (step, index) => {
                    const completed =
                        completedSteps.includes(
                            step,
                        )
                    const active =
                        step === currentStep
                    const reached =
                        completed ||
                        active ||
                        index < currentIndex

                    return (
                        <li
                            key={step}
                            aria-current={
                                active
                                    ? 'step'
                                    : undefined
                            }
                            className="min-w-0"
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className={[
                                        'grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-black transition',
                                        completed
                                            ? 'border-lime-400 bg-lime-400 text-[#071006]'
                                            : active
                                              ? 'border-lime-400 bg-lime-400/10 text-lime-300'
                                              : reached
                                                ? 'border-lime-800/70 text-lime-400'
                                                : 'border-white/10 text-slate-600',
                                    ].join(' ')}
                                >
                                    {completed ? (
                                        <Check className="h-3 w-3" />
                                    ) : (
                                        index + 1
                                    )}
                                </span>

                                <span
                                    className={[
                                        'truncate !text-[11px] font-bold',
                                        active
                                            ? 'text-white'
                                            : reached
                                              ? 'text-slate-300'
                                              : 'text-slate-600',
                                    ].join(' ')}
                                >
                                    {
                                        stepLabels[
                                            step
                                        ]
                                    }
                                </span>
                            </div>
                        </li>
                    )
                },
            )}
        </ol>
    )
}
