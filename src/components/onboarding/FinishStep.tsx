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
    UsersRound,
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
                const organisationResult =
                    organisationId
                        ? await getOrganisation(
                              organisationId,
                          )
                        : null

                const isClub =
                    organisationResult
                        ?.organisation_type ===
                    'club'

                const competitionResult =
                    !isClub && competitionId
                        ? await competitionService.getById(
                              competitionId,
                          )
                        : null

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

    const isClub =
        organisation?.organisation_type ===
        'club'

    return (
        <div>
            <SetupWizardHeader
                title={
                    isClub
                        ? 'Your TournamentHQ club workspace is ready'
                        : 'Your TournamentHQ workspace is ready'
                }
                description={
                    isClub
                        ? 'Your club setup is complete. Open the Club Portal to add teams, squads and fixtures, or preview your public club website.'
                        : 'The core setup is complete. You can enter the admin workspace now, or open the public organisation site to see the customer-facing experience.'
                }
            />

            <div className="mt-8 grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                    <h2 className="mt-4 text-base font-black text-[var(--organisation-text)]">
                        {isClub
                            ? 'Club'
                            : 'Organisation'}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--organisation-muted)]">
                        {organisation?.name ??
                            'Created'}
                    </p>
                </article>

                <article className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    {isClub ? (
                        <UsersRound className="h-6 w-6 text-emerald-300" />
                    ) : (
                        <Trophy className="h-6 w-6 text-emerald-300" />
                    )}
                    <h2 className="mt-4 text-base font-black text-[var(--organisation-text)]">
                        {isClub
                            ? 'Teams & squads'
                            : 'Competition'}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--organisation-muted)]">
                        {isClub
                            ? 'Ready to configure in the Club Portal'
                            : competition?.name ??
                              'Created'}
                    </p>
                </article>

                <article className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <Globe2 className="h-6 w-6 text-emerald-300" />
                    <h2 className="mt-4 text-base font-black text-[var(--organisation-text)]">
                        {isClub
                            ? 'Club website'
                            : 'Public site'}
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
                <h2 className="mt-2 text-xl font-black text-[var(--organisation-text)]">
                    {isClub
                        ? 'Add your teams and organise the club from one workspace.'
                        : 'Add teams, then let the AI Tournament Director build your fixture programme.'}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--organisation-muted)]">
                    {isClub
                        ? 'Use the Club Portal to manage teams, squads, seasons, fixtures, results, officials, content, media and the public club experience. No competition record is required for the club journey.'
                        : 'Your competition is now available to the rest of the TournamentHQ workflow, including teams, groups, venues, officials, fixture import and intelligent scheduling.'}
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
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-5 py-3 text-sm font-bold text-slate-200 no-underline transition hover:bg-white/[0.06]"
                        >
                            <ExternalLink className="h-4 w-4" />
                            {isClub
                                ? 'View club website'
                                : 'View public site'}
                        </a>
                    )}

                    <button
                        type="button"
                        onClick={openDashboard}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent,#84cc16)] px-6 py-3 text-sm font-black text-[var(--organisation-on-accent,#071006)] transition hover:opacity-90"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        {isClub
                            ? 'Go to club dashboard'
                            : 'Go to dashboard'}
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
