import {
    Check,
    Sparkles,
} from 'lucide-react'

import type {
    OrganisationFormData,
    SubscriptionPlan,
} from '../organisationTypes'

type StepSubscriptionProps = {
    form: OrganisationFormData
    disabled?: boolean
    onChange: <
        K extends keyof OrganisationFormData,
    >(
        field: K,
        value: OrganisationFormData[K]
    ) => void
}

const plans: Array<{
    id: SubscriptionPlan
    name: string
    description: string
    users: number
    competitions: number
    recommended?: boolean
}> = [
    {
        id: 'starter',
        name: 'Starter',
        description:
            'Essential competition management for smaller organisations.',
        users: 5,
        competitions: 2,
    },
    {
        id: 'professional',
        name: 'Professional',
        description:
            'Advanced content, media and operational tools for growing organisations.',
        users: 20,
        competitions: 10,
        recommended: true,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        description:
            'Full TournamentHQ capability with AI-assisted tournament management.',
        users: 100,
        competitions: 100,
    },
]

export function StepSubscription({
    form,
    disabled = false,
    onChange,
}: StepSubscriptionProps) {
    function selectPlan(
        plan: (typeof plans)[number]
    ) {
        onChange(
            'subscription_plan',
            plan.id
        )
        onChange('max_users', plan.users)
        onChange(
            'max_competitions',
            plan.competitions
        )
    }

    return (
        <section className="wizard-step-section">
            <header className="wizard-step-heading">
                <p>Step 3</p>

                <h2>
                    Subscription and access
                </h2>

                <span>
                    Choose the customer plan and confirm
                    the account limits that TournamentHQ
                    should enforce.
                </span>
            </header>

            <div className="subscription-plan-grid">
                {plans.map((plan) => {
                    const selected =
                        form.subscription_plan ===
                        plan.id

                    return (
                        <button
                            key={plan.id}
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                                selectPlan(plan)
                            }
                            className={[
                                'subscription-plan-card',
                                selected
                                    ? 'selected'
                                    : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            <div className="subscription-plan-top">
                                <div>
                                    <h3>
                                        {plan.name}
                                    </h3>

                                    {plan.recommended && (
                                        <span className="subscription-recommended">
                                            <Sparkles
                                                size={
                                                    14
                                                }
                                            />
                                            Recommended
                                        </span>
                                    )}
                                </div>

                                <span
                                    className={[
                                        'subscription-select-indicator',
                                        selected
                                            ? 'selected'
                                            : '',
                                    ]
                                        .filter(
                                            Boolean
                                        )
                                        .join(' ')}
                                >
                                    {selected ? (
                                        <Check
                                            size={
                                                16
                                            }
                                        />
                                    ) : null}
                                </span>
                            </div>

                            <p className="subscription-description">
                                {plan.description}
                            </p>

                            <div className="subscription-metrics">
                                <div>
                                    <strong>
                                        {plan.users}
                                    </strong>
                                    <span>
                                        Users
                                    </span>
                                </div>

                                <div>
                                    <strong>
                                        {
                                            plan.competitions
                                        }
                                    </strong>
                                    <span>
                                        Competitions
                                    </span>
                                </div>
                            </div>

                            <span className="subscription-selection-label">
                                {selected
                                    ? 'Selected'
                                    : 'Select plan'}
                            </span>
                        </button>
                    )
                })}
            </div>

            <div className="subscription-limits">
                <label>
                    <span>
                        Maximum users
                    </span>

                    <input
                        type="number"
                        min={1}
                        value={form.max_users}
                        disabled={disabled}
                        onChange={(event) =>
                            onChange(
                                'max_users',
                                Number(
                                    event.target
                                        .value
                                )
                            )
                        }
                    />
                </label>

                <label>
                    <span>
                        Maximum competitions
                    </span>

                    <input
                        type="number"
                        min={1}
                        value={
                            form.max_competitions
                        }
                        disabled={disabled}
                        onChange={(event) =>
                            onChange(
                                'max_competitions',
                                Number(
                                    event.target
                                        .value
                                )
                            )
                        }
                    />
                </label>
            </div>
        </section>
    )
}
