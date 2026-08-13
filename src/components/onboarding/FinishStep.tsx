import {
    useEffect,
    useState,
} from 'react'

import {
    ArrowRight,
    CheckCircle2,
    ExternalLink,
    Globe2,
    LayoutDashboard,
    Loader2,
    Trophy,
} from 'lucide-react'

import type {
    Organisation,
} from '../admin/Organisations/organisationTypes'
import {
    getOrganisation,
} from '../admin/Organisations/organisationService'
import type {
    Competition,
} from '../../types/competitionTypes'
import {
    competitionService,
} from '../../services/competitionService'
import {
    SetupWizardHeader,
} from '../../pages/onboarding/SetupWizardHeader'

const CURRENT_ORGANISATION_KEY =
    'tournamenthq-current-organisation'

type FinishStepProps = {
    organisationId: string | null
    competitionId: string | null
    onBack: () => void
}

export function FinishStep({
    organisationId,
    competitionId,
    onBack,
}: FinishStepProps) {
    const [organisation, setOrganisation] =
        useState<Organisation | null>(null)
    const [competition, setCompetition] =
        useState<Competition | null>(null)
    const [loading, setLoading] =
        useState(true)

    useEffect(() => {
        let mounted = true

        async function loadSummary() {
            try {
                const [organisationResult, competitionResult] =
                    await Promise.all([
                        organisationId
                            ? getOrganisation(
                                  organisationId,
                              )
                            : Promise.resolve(
                                  null,
                              ),
                        competitionId
                            ? competitionService.getById(
                                  competitionId,
                              )
                            : Promise.resolve(
                                  null,
                              ),
                    ])

                if (!mounted) {
                    return
                }

                setOrganisation(
                    organisationResult,
                )
                setCompetition(
                    competitionResult,
                )
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        void loadSummary()

        return () => {
            mounted = false
        }
    }, [competitionId, organisationId])

    function openDashboard() {
        if (organisation?.id) {
            window.localStorage.setItem(
                CURRENT_ORGANISATION_KEY,
                organisation.id,
            )
        }

        window.location.assign('/admin')
    }

    if (loading) {
        return (
            <div className="grid min-h-[18rem] place-items-center">
                <Loader2 className="h-7 w-7 animate-spin text-[var(--organisation-accent,#84cc16)]" />
            </div>
        )
    }

    return (
        <div>
            <SetupWizardHeader
                title="Your TournamentHQ workspace is ready"
                description="The core setup is complete. You can enter the admin workspace now, or open the public organisation site to see the customer-facing experience."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-5">
                    <CheckCircle2 className="h-6 w-6 text-[var(--organisation-accent)]" />
                    <h2 className="mt-4 !text-base !leading-6 font-black text-[var(--organisation-text)] sm:!text-lg">
                        Organisation
                    </h2>
                    <p className="mt-2 text-sm text-[var(--organisation-muted)]">
                        {organisation?.name ??
                            'Created'}
                    </p>
                </article>

                <article className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-5">
                    <Trophy className="h-6 w-6 text-[var(--organisation-accent)]" />
                    <h2 className="mt-4 !text-base !leading-6 font-black text-[var(--organisation-text)] sm:!text-lg">
                        Competition
                    </h2>
                    <p className="mt-2 text-sm text-[var(--organisation-muted)]">
                        {competition?.name ??
                            'Created'}
                    </p>
                </article>

                <article className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-5">
                    <Globe2 className="h-6 w-6 text-[var(--organisation-accent)]" />
                    <h2 className="mt-4 !text-base !leading-6 font-black text-[var(--organisation-text)] sm:!text-lg">
                        Public site
                    </h2>
                    <p className="mt-2 text-sm text-[var(--organisation-muted)]">
                        {organisation
                            ? `/${organisation.slug}`
                            : 'Ready'}
                    </p>
                </article>
            </div>

            <section className="mt-6 rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-6">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--organisation-accent,#84cc16)]">
                    Recommended next move
                </p>
                <h2 className="mt-2 !text-xl !leading-8 font-black text-[var(--organisation-text)] sm:!text-2xl">
                    Add teams, then let the AI Tournament Director build your fixture programme.
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--organisation-muted)]">
                    Your competition is now available to the rest of the TournamentHQ workflow, including teams, groups, venues, officials, fixture import and intelligent scheduling.
                </p>
            </section>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[color:var(--organisation-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-5 py-3 text-sm font-bold text-[var(--organisation-muted)] transition hover:bg-white/[0.06]"
                >
                    Back
                </button>

                <div className="flex flex-col gap-3 sm:flex-row">
                    {organisation && (
                        <a
                            href={`/${organisation.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-5 py-3 text-sm font-bold text-[var(--organisation-text)] no-underline transition hover:bg-[color:var(--organisation-accent)]/10"
                        >
                            <ExternalLink className="h-4 w-4" />
                            View public site
                        </a>
                    )}

                    <button
                        type="button"
                        onClick={openDashboard}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent,#84cc16)] px-6 py-3 text-sm font-black text-[var(--organisation-on-accent,#071006)] transition hover:opacity-90"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Go to dashboard
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
