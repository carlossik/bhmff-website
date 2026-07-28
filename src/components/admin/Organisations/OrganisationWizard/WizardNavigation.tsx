import { Check } from 'lucide-react'

export type WizardStep = {
    id: number
    label: string
    description: string
}

type WizardNavigationProps = {
    steps: WizardStep[]
    currentStep: number
    completedSteps: number[]
    onStepSelect?: (step: number) => void
}

export function WizardNavigation({
    steps,
    currentStep,
    completedSteps,
    onStepSelect,
}: WizardNavigationProps) {
    const current =
        steps[currentStep - 1]

    return (
        <section
            aria-label="Organisation onboarding progress"
            className="wizard-navigation"
        >
            <div className="wizard-navigation-summary">
                <div>
                    <p>
                        Step {currentStep} of{' '}
                        {steps.length}
                    </p>

                    <strong>
                        {current?.label}
                    </strong>
                </div>

                <span>
                    {current?.description}
                </span>
            </div>

            <div className="wizard-progress-track">
                <div className="wizard-progress-line" />

                <ol className="wizard-navigation-steps">
                    {steps.map((step) => {
                        const isCurrent =
                            step.id === currentStep

                        const isCompleted =
                            completedSteps.includes(
                                step.id
                            )

                        const canSelect =
                            Boolean(onStepSelect) &&
                            (isCompleted ||
                                step.id <=
                                    currentStep + 1)

                        return (
                            <li key={step.id}>
                                <button
                                    type="button"
                                    disabled={!canSelect}
                                    onClick={() =>
                                        onStepSelect?.(
                                            step.id
                                        )
                                    }
                                    aria-current={
                                        isCurrent
                                            ? 'step'
                                            : undefined
                                    }
                                    className={[
                                        isCurrent
                                            ? 'current'
                                            : '',
                                        isCompleted
                                            ? 'completed'
                                            : '',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                >
                                    <span className="wizard-step-number">
                                        {isCompleted ? (
                                            <Check
                                                size={
                                                    17
                                                }
                                            />
                                        ) : (
                                            step.id
                                        )}
                                    </span>

                                    <span className="wizard-step-label">
                                        {step.label}
                                    </span>
                                </button>
                            </li>
                        )
                    })}
                </ol>
            </div>
        </section>
    )
}
