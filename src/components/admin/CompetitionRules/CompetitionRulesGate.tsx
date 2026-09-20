import {
    useCallback,
    useEffect,
    useState,
    type ReactNode,
} from 'react'
import {
    CheckCircle2,
    ExternalLink,
    Loader2,
    ShieldCheck,
} from 'lucide-react'

import { useCompetition } from '../../../contexts/CompetitionContext'
import { useOrganisation } from '../../../context/OrganisationContext'
import type { AdminProfile } from '../../../services/accessControl'
import { CompetitionRulesContent } from '../../common/CompetitionRulesContent'
import {
    acceptCompetitionRules,
    getCompetitionRules,
    hasAcceptedCompetitionRules,
    type CompetitionRules,
} from '../../../services/competitionRulesService'

type CompetitionRulesGateProps = {
    profile: AdminProfile
    children: ReactNode
}

export function CompetitionRulesGate({
    profile,
    children,
}: CompetitionRulesGateProps) {
    const { currentOrganisation } = useOrganisation()
    const { currentCompetition } = useCompetition()

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [rules, setRules] = useState<CompetitionRules | null>(null)
    const [accepted, setAccepted] = useState(true)
    const [confirmed, setConfirmed] = useState(false)
    const [error, setError] = useState('')

    const shouldCheckRules =
        currentOrganisation?.organisation_type === 'competition_organiser' &&
        Boolean(currentCompetition?.id) &&
        !profile.isPlatformAdmin

    const loadRulesState = useCallback(async () => {
        if (!shouldCheckRules || !currentOrganisation || !currentCompetition) {
            setRules(null)
            setAccepted(true)
            return
        }

        setLoading(true)
        setError('')

        try {
            const activeRules = await getCompetitionRules(
                currentOrganisation.id,
                currentCompetition.id,
            )

            if (!activeRules?.requires_acceptance) {
                setRules(activeRules)
                setAccepted(true)
                return
            }

            const alreadyAccepted = await hasAcceptedCompetitionRules(
                activeRules.id,
                activeRules.version,
                profile.id,
            )

            setRules(activeRules)
            setAccepted(alreadyAccepted)
            setConfirmed(false)
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'TournamentHQ could not check the tournament rules agreement.',
            )
            setAccepted(false)
        } finally {
            setLoading(false)
        }
    }, [
        currentCompetition,
        currentOrganisation,
        profile.id,
        shouldCheckRules,
    ])

    useEffect(() => {
        void loadRulesState()
    }, [loadRulesState])

    async function handleAccept(): Promise<void> {
        if (!currentOrganisation || !currentCompetition || !rules || saving || !confirmed) {
            return
        }

        setSaving(true)
        setError('')

        try {
            await acceptCompetitionRules({
                organisationId: currentOrganisation.id,
                competitionId: currentCompetition.id,
                ruleId: rules.id,
                ruleVersion: rules.version,
                userId: profile.id,
                role: profile.currentMembership.role,
            })

            setAccepted(true)
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'TournamentHQ could not save the tournament rules agreement.',
            )
        } finally {
            setSaving(false)
        }
    }

    if (!shouldCheckRules || accepted) {
        return <>{children}</>
    }

    if (loading) {
        return (
            <div className="rounded-3xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] p-8 text-center shadow-2xl shadow-black/20">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--thq-admin-accent)]" />
                <p className="mt-4 text-sm font-semibold text-[var(--thq-admin-muted)]">
                    Checking tournament rules agreement...
                </p>
            </div>
        )
    }

    return (
        <div className="rounded-3xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] p-5 shadow-2xl shadow-black/20 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--thq-admin-border)] bg-black/20 px-3 py-1.5 text-xs font-black uppercase tracking-[0.15em] text-[var(--thq-admin-accent)]">
                        <ShieldCheck className="h-4 w-4" />
                        Agreement required
                    </div>
                    <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
                        Tournament rules acceptance
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--thq-admin-muted)]">
                        Please read and accept the rules for {currentCompetition?.name}. TournamentHQ will record your acceptance before giving you access to the competition portal.
                    </p>
                </div>
                {rules && (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-[color:var(--thq-admin-border)] bg-black/20 px-3 py-1.5 text-xs font-black text-[var(--thq-admin-muted)]">
                        Version {rules.version}
                    </span>
                )}
            </div>

            {rules ? (
                <div className="mt-6 rounded-2xl border border-[color:var(--thq-admin-border)] bg-black/20 p-4 sm:p-5">
                    <h3 className="text-lg font-black text-white">{rules.title}</h3>
                    {rules.rules_text && (
                        <div className="mt-4 max-h-[28rem] overflow-auto rounded-xl border border-[color:var(--thq-admin-border)] bg-black/25 p-4 text-slate-200 sm:p-5">
                            <CompetitionRulesContent text={rules.rules_text} />
                        </div>
                    )}
                    {rules.rules_url && (
                        <a
                            href={rules.rules_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[var(--thq-admin-accent)] no-underline hover:underline"
                        >
                            Open rules document
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    )}
                </div>
            ) : (
                <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm font-semibold text-amber-100">
                    Rules acceptance is required, but the rules could not be loaded. Please contact the competition organiser.
                </div>
            )}

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-[color:var(--thq-admin-border)] bg-black/20 p-4 text-sm leading-6 text-slate-200">
                <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-900"
                />
                <span>
                    I confirm that I have read these tournament rules and agree to follow them and share them with the relevant team officials.
                </span>
            </label>

            {error && (
                <div role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100">
                    {error}
                </div>
            )}

            <div className="mt-6 flex justify-end">
                <button
                    type="button"
                    disabled={!rules || !confirmed || saving}
                    onClick={() => {
                        void handleAccept()
                    }}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--thq-admin-accent)] px-6 py-3 text-sm font-black text-[var(--thq-admin-on-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving agreement...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-4 w-4" />
                            Accept and continue
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
