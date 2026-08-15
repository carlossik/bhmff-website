import {
    CalendarDays,
    Globe2,
    Loader2,
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

export function ClubSetupStep({
    organisationId,
    onBack,
    onFinish,
}: ClubSetupStepProps) {
    const [organisation, setOrganisation] =
        useState<Organisation | null>(null)
    const [loading, setLoading] =
        useState(true)
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
                title="Set up your club & teams"
                description="Your club workspace is ready. Finish onboarding now, then add your teams, squads, fixtures, results and club content from the TournamentHQ Club Portal."
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
                <section className="mt-8 rounded-3xl border border-lime-900/60 bg-[#071006] p-6 sm:p-8">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-lime-400">
                        Club workspace
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-white">
                        {organisation.name}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                        TournamentHQ will keep the club as the ownership boundary while your teams, seasons and match operations sit underneath it.
                    </p>

                    <div className="mt-7 grid gap-4 md:grid-cols-3">
                        <article className="rounded-2xl border border-lime-900/50 bg-white/[0.025] p-5">
                            <UsersRound className="h-6 w-6 text-lime-400" />
                            <h3 className="mt-4 text-base font-black text-white">
                                Teams & squads
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                Add and manage the teams and players that belong to your club.
                            </p>
                        </article>

                        <article className="rounded-2xl border border-lime-900/50 bg-white/[0.025] p-5">
                            <CalendarDays className="h-6 w-6 text-lime-400" />
                            <h3 className="mt-4 text-base font-black text-white">
                                Club operations
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                Organise seasons, fixtures, results and the operational calendar.
                            </p>
                        </article>

                        <article className="rounded-2xl border border-lime-900/50 bg-white/[0.025] p-5">
                            <Globe2 className="h-6 w-6 text-lime-400" />
                            <h3 className="mt-4 text-base font-black text-white">
                                Public club site
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                Publish the club experience using the branding you have just configured.
                            </p>
                        </article>
                    </div>

                    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                        <p className="text-sm leading-6 text-emerald-100">
                            No competition needs to be created for a club account. Club teams and club operations are managed directly from the Club Portal.
                        </p>
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
                    nextLabel="Finish club setup"
                />
            </div>
        </div>
    )
}
