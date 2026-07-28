import {
    Building2,
    Check,
    Palette,
    ShieldCheck,
    UserRound,
    type LucideIcon,
} from 'lucide-react'
import type {
    ReactNode,
} from 'react'

import type {
    OrganisationFormData,
} from '../organisationTypes'

type StepReviewProps = {
    form: OrganisationFormData
}

function ReviewCard({
    title,
    icon: Icon,
    children,
}: {
    title: string
    icon: LucideIcon
    children: ReactNode
}) {
    return (
        <article className="review-card">
            <header>
                <span>
                    <Icon size={21} />
                </span>

                <h3>{title}</h3>
            </header>

            <div className="review-card-body">
                {children}
            </div>
        </article>
    )
}

function Row({
    label,
    value,
}: {
    label: string
    value: ReactNode
}) {
    return (
        <div className="review-row">
            <span>{label}</span>

            <strong>{value}</strong>
        </div>
    )
}

export function StepReview({
    form,
}: StepReviewProps) {
    const colours = [
        form.primary_colour,
        form.secondary_colour,
        form.accent_colour,
        form.background_colour,
        form.surface_colour,
        form.text_colour,
    ]

    return (
        <section className="wizard-step-section">
            <header className="wizard-step-heading">
                <p>Step 5</p>

                <h2>
                    Review and create
                </h2>

                <span>
                    Check the customer workspace
                    configuration before creating the
                    organisation.
                </span>
            </header>

            <div className="review-grid">
                <ReviewCard
                    title="Organisation"
                    icon={Building2}
                >
                    <Row
                        label="Name"
                        value={form.name}
                    />
                    <Row
                        label="Slug"
                        value={form.slug}
                    />
                    <Row
                        label="Status"
                        value={form.status}
                    />
                    <Row
                        label="Public website"
                        value={
                            form.public_site_enabled
                                ? 'Enabled'
                                : 'Disabled'
                        }
                    />
                </ReviewCard>

                <ReviewCard
                    title="Administrator"
                    icon={UserRound}
                >
                    <Row
                        label="Name"
                        value={form.owner_name}
                    />
                    <Row
                        label="Email"
                        value={form.owner_email}
                    />
                    <Row
                        label="Phone"
                        value={
                            form.owner_phone ||
                            'Not supplied'
                        }
                    />
                </ReviewCard>

                <ReviewCard
                    title="Subscription"
                    icon={ShieldCheck}
                >
                    <Row
                        label="Plan"
                        value={
                            form.subscription_plan
                        }
                    />
                    <Row
                        label="Status"
                        value={
                            form.subscription_status
                        }
                    />
                    <Row
                        label="Maximum users"
                        value={form.max_users}
                    />
                    <Row
                        label="Maximum competitions"
                        value={
                            form.max_competitions
                        }
                    />
                </ReviewCard>

                <ReviewCard
                    title="Branding"
                    icon={Palette}
                >
                    <div className="review-branding">
                        {form.logo_url ? (
                            <img
                                src={form.logo_url}
                                alt=""
                            />
                        ) : (
                            <div
                                className="review-branding-placeholder"
                                style={{
                                    background:
                                        form.primary_colour,
                                    color:
                                        form.text_colour,
                                }}
                            >
                                {form.name
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>
                        )}

                        <div className="review-colours">
                            {colours.map(
                                (
                                    colour,
                                    index
                                ) => (
                                    <span
                                        key={`${colour}-${index}`}
                                        title={
                                            colour
                                        }
                                        style={{
                                            background:
                                                colour,
                                        }}
                                    />
                                )
                            )}
                        </div>
                    </div>
                </ReviewCard>
            </div>

            <div className="review-ready-panel">
                <Check size={22} />

                <div>
                    <strong>
                        Ready to create
                    </strong>

                    <p>
                        TournamentHQ will save the
                        workspace, branding,
                        subscription limits, enabled
                        modules and administrator
                        details.
                    </p>
                </div>
            </div>
        </section>
    )
}
