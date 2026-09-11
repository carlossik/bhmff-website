import {
    useCallback,
    useEffect,
    useState,
} from 'react'
import {
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    Loader2,
    Save,
    ShieldCheck,
} from 'lucide-react'

import { useCompetition } from '../../../contexts/CompetitionContext'
import { useOrganisation } from '../../../context/OrganisationContext'
import {
    getCompetitionRules,
    saveCompetitionRules,
    type CompetitionRules,
} from '../../../services/competitionRulesService'

export function CompetitionRulesManager() {
    const { currentOrganisation } = useOrganisation()
    const { currentCompetition } = useCompetition()

    const [rules, setRules] = useState<CompetitionRules | null>(null)
    const [title, setTitle] = useState('Tournament Rules')
    const [rulesText, setRulesText] = useState('')
    const [rulesUrl, setRulesUrl] = useState('')
    const [requiresAcceptance, setRequiresAcceptance] = useState(false)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const loadRules = useCallback(async () => {
        if (!currentOrganisation?.id || !currentCompetition?.id) {
            setRules(null)
            setTitle('Tournament Rules')
            setRulesText('')
            setRulesUrl('')
            setRequiresAcceptance(false)
            return
        }

        setLoading(true)
        setError('')
        setMessage('')

        try {
            const activeRules = await getCompetitionRules(
                currentOrganisation.id,
                currentCompetition.id,
            )

            setRules(activeRules)
            setTitle(activeRules?.title ?? 'Tournament Rules')
            setRulesText(activeRules?.rules_text ?? '')
            setRulesUrl(activeRules?.rules_url ?? '')
            setRequiresAcceptance(activeRules?.requires_acceptance ?? false)
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'TournamentHQ could not load tournament rules.',
            )
        } finally {
            setLoading(false)
        }
    }, [currentCompetition?.id, currentOrganisation?.id])

    useEffect(() => {
        void loadRules()
    }, [loadRules])

    async function handleSave(): Promise<void> {
        if (!currentOrganisation?.id || !currentCompetition?.id || saving) {
            return
        }

        setSaving(true)
        setError('')
        setMessage('')

        try {
            const savedRules = await saveCompetitionRules({
                organisationId: currentOrganisation.id,
                competitionId: currentCompetition.id,
                title,
                rulesText,
                rulesUrl,
                requiresAcceptance,
                existingRules: rules,
            })

            setRules(savedRules)
            setTitle(savedRules.title)
            setRulesText(savedRules.rules_text)
            setRulesUrl(savedRules.rules_url ?? '')
            setRequiresAcceptance(savedRules.requires_acceptance)
            setMessage(
                savedRules.requires_acceptance
                    ? `Rules saved. Users must accept version ${savedRules.version} before accessing this competition.`
                    : 'Rules saved. Acceptance is currently not required.',
            )
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'TournamentHQ could not save tournament rules.',
            )
        } finally {
            setSaving(false)
        }
    }

    if (!currentCompetition) {
        return (
            <div className="teamsEmptyState">
                <h3>No competition selected</h3>
                <p>Select or create a competition before setting tournament rules.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="adminWorkspaceHeader">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--thq-admin-border)] bg-black/20 px-3 py-1.5 text-xs font-black uppercase tracking-[0.15em] text-[var(--thq-admin-accent)]">
                        <ShieldCheck className="h-4 w-4" />
                        Rules agreement
                    </div>
                    <h3 className="mt-3">Tournament Rules</h3>
                    <p className="muted">
                        Set the rules for {currentCompetition.name}. If acceptance is required, invited officials must agree before accessing the competition portal.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="rounded-2xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] p-8 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--thq-admin-accent)]" />
                    <p className="mt-4 text-sm font-semibold text-[var(--thq-admin-muted)]">Loading rules...</p>
                </div>
            ) : (
                <section className="rounded-2xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] p-5 shadow-sm sm:p-6">
                    <div className="grid gap-5">
                        <label className="grid gap-2 text-sm font-bold text-white">
                            Rules title
                            <input
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                className="min-h-11 rounded-xl border border-[color:var(--thq-admin-border)] bg-black/20 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-[var(--thq-admin-accent)]"
                                placeholder="BHMFF Tournament Rules"
                            />
                        </label>

                        <label className="grid gap-2 text-sm font-bold text-white">
                            Rules text
                            <textarea
                                value={rulesText}
                                onChange={(event) => setRulesText(event.target.value)}
                                rows={12}
                                className="rounded-xl border border-[color:var(--thq-admin-border)] bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-[var(--thq-admin-accent)]"
                                placeholder="Paste the competition rules here so invited users can read them before entering the portal."
                            />
                        </label>

                        <label className="grid gap-2 text-sm font-bold text-white">
                            Optional rules document link
                            <input
                                value={rulesUrl}
                                onChange={(event) => setRulesUrl(event.target.value)}
                                className="min-h-11 rounded-xl border border-[color:var(--thq-admin-border)] bg-black/20 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-[var(--thq-admin-accent)]"
                                placeholder="https://..."
                            />
                        </label>

                        {rulesUrl.trim() && (
                            <a
                                href={rulesUrl.trim()}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex w-fit items-center gap-2 text-sm font-black text-[var(--thq-admin-accent)] no-underline hover:underline"
                            >
                                Preview rules link
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        )}

                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[color:var(--thq-admin-border)] bg-black/20 p-4 text-sm leading-6 text-slate-200">
                            <input
                                type="checkbox"
                                checked={requiresAcceptance}
                                onChange={(event) => setRequiresAcceptance(event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-900"
                            />
                            <span>
                                Require invited users to accept these rules before accessing this competition portal.
                            </span>
                        </label>
                    </div>

                    {rules && (
                        <div className="mt-5 rounded-xl border border-[color:var(--thq-admin-border)] bg-black/20 px-4 py-3 text-sm text-[var(--thq-admin-muted)]">
                            Current saved version: <strong className="text-white">{rules.version}</strong>. Updating the title, rules text, document link or acceptance setting creates a new version for audit purposes.
                        </div>
                    )}

                    {message && (
                        <div role="status" className="mt-5 flex items-start gap-3 rounded-xl border border-lime-400/30 bg-lime-400/10 px-4 py-3 text-sm font-semibold text-lime-100">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{message}</span>
                        </div>
                    )}

                    {error && (
                        <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                                void handleSave()
                            }}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--thq-admin-accent)] px-6 py-3 text-sm font-black text-[var(--thq-admin-on-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving rules...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save tournament rules
                                </>
                            )}
                        </button>
                    </div>
                </section>
            )}
        </div>
    )
}
