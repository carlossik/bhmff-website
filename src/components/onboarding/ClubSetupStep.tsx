import {
    ChevronDown,
    CheckCircle2,
    Globe2,
    Loader2,
    Settings2,
    ShieldCheck,
    UsersRound,
} from 'lucide-react'
import {
    useEffect,
    useState,
} from 'react'

import type {
    Organisation,
} from '../admin/Organisations/organisationTypes'
import {
    getOrganisation,
} from '../admin/Organisations/organisationService'
import {
    SetupWizardHeader,
} from '../../pages/onboarding/SetupWizardHeader'
import {
    SetupWizardNavigation,
} from '../../pages/onboarding/SetupWizardNavigation'

type ClubSetupStepProps = {
    organisationId: string | null
    onBack: () => void
    onFinish: () => void
}

const quickStartItems = [
    'Add teams',
    'Invite coaches and club officials',
    'Build squads and seasons',
    'Add fixtures and Match Centre updates',
    'Configure club payments when ready',
] as const

export function ClubSetupStep({
    organisationId,
    onBack,
    onFinish,
}: ClubSetupStepProps) {
    const [organisation, setOrganisation] =
        useState<Organisation | null>(null)
    const [loading, setLoading] =
        useState(true)
    const [advancedOpen, setAdvancedOpen] =
        useState(false)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    useEffect(() => {
        let mounted = true

        async function loadOrganisation() {
            if (!organisationId) {
                if (mounted) {
                    setErrorMessage(
                        'Create your club workspace before continuing.',
                    )
                    setLoading(false)
                }
                return
            }

            try {
                const result =
                    await getOrganisation(
                        organisationId,
                    )

                if (!mounted) {
                    return
                }

                if (!result) {
                    throw new Error(
                        'The club workspace could not be found.',
                    )
                }

                setOrganisation(result)
            } catch (error) {
                if (!mounted) {
                    return
                }

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Unable to prepare the club workspace.',
                )
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        void loadOrganisation()

        return () => {
            mounted = false
        }
    }, [organisationId])

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
                title="Club quick start"
                description="Your club workspace is ready. Finish now and add teams, squads, fixtures, payments and content from the Club Portal when you are ready."
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
                <section className="mt-8 overflow-hidden rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)]">
                    <div className="border-b border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-5 py-5 sm:px-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-start gap-4">
                                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--organisation-accent,#84cc16)]/10 text-[var(--organisation-accent,#84cc16)]">
                                    <UsersRound className="h-6 w-6" />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--organisation-accent,#84cc16)]">
                                        Club workspace
                                    </p>
                                    <h2 className="mt-2 truncate text-2xl font-black text-[var(--organisation-text)] sm:text-3xl">
                                        {organisation.name}
                                    </h2>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--organisation-muted)]">
                                        No extra setup is required today. You can complete onboarding and configure the club step by step inside the dashboard.
                                    </p>
                                </div>
                            </div>

                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-200">
                                <CheckCircle2 className="h-4 w-4" />
                                Ready
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 p-5 sm:p-6">
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                            <div className="flex items-start gap-3">
                                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                                <div>
                                    <h3 className="text-sm font-black text-emerald-100">
                                        Finish now, configure later
                                    </h3>
                                    <p className="mt-1 text-sm leading-6 text-emerald-100/80">
                                        Teams, squads, fixtures, finance, communications and website content can all be added after onboarding. The customer does not need to complete everything before reaching the dashboard.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setAdvancedOpen(
                                    (current) => !current,
                                )
                            }
                            className="flex w-full items-center justify-between rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-4 py-3 text-left text-sm font-black text-[var(--organisation-text)] transition hover:bg-white/[0.06]"
                            aria-expanded={advancedOpen}
                        >
                            <span className="inline-flex items-center gap-2">
                                <Settings2 className="h-4 w-4 text-[var(--organisation-accent,#84cc16)]" />
                                What can I set up later?
                            </span>
                            <ChevronDown
                                className={[
                                    'h-4 w-4 transition-transform',
                                    advancedOpen
                                        ? 'rotate-180'
                                        : '',
                                ].join(' ')}
                            />
                        </button>

                        {advancedOpen && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {quickStartItems.map(
                                    (item) => (
                                        <div
                                            key={item}
                                            className="flex items-center gap-3 rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-4 py-3 text-sm font-semibold text-[var(--organisation-muted)]"
                                        >
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--organisation-accent,#84cc16)]" />
                                            {item}
                                        </div>
                                    ),
                                )}

                                <div className="flex items-center gap-3 rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-4 py-3 text-sm font-semibold text-[var(--organisation-muted)]">
                                    <Globe2 className="h-4 w-4 shrink-0 text-[var(--organisation-accent,#84cc16)]" />
                                    Publish the public club website
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <div className="mt-8">
                <SetupWizardNavigation
                    canGoBack
                    canGoForward={
                        Boolean(organisation)
                    }
                    onBack={onBack}
                    onNext={onFinish}
                    nextLabel="Finish now"
                />
            </div>
        </div>
    )
}
