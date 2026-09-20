import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    Globe2,
    Loader2,
    Save,
    ShieldCheck,
    UsersRound,
} from 'lucide-react'

import { useCompetition } from '../../../contexts/CompetitionContext'
import { useOrganisation } from '../../../context/OrganisationContext'
import { formatAdminRole } from '../../../services/accessControl'
import {
    getCompetitionRules,
    getCompetitionRulesAcceptanceAudit,
    saveCompetitionRules,
    type CompetitionRules,
    type CompetitionRulesAcceptanceAuditItem,
} from '../../../services/competitionRulesService'

function formatAcceptedAt(value: string | null): string {
    if (!value) {
        return 'Pending'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Accepted'
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

export function CompetitionRulesManager() {
    const { currentOrganisation } = useOrganisation()
    const { currentCompetition } = useCompetition()

    const [rules, setRules] = useState<CompetitionRules | null>(null)
    const [title, setTitle] = useState('Tournament Rules')
    const [rulesText, setRulesText] = useState('')
    const [rulesUrl, setRulesUrl] = useState('')
    const [requiresAcceptance, setRequiresAcceptance] = useState(false)
    const [publicVisible, setPublicVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [audit, setAudit] = useState<CompetitionRulesAcceptanceAuditItem[]>([])
    const [auditLoading, setAuditLoading] = useState(false)
    const [auditError, setAuditError] = useState('')

    const auditSummary = useMemo(() => {
        const accepted = audit.filter((item) => item.accepted).length
        return {
            accepted,
            pending: audit.length - accepted,
            total: audit.length,
        }
    }, [audit])

    const loadAudit = useCallback(
        async (activeRules: CompetitionRules | null) => {
            if (
                !activeRules ||
                !currentOrganisation?.id ||
                !currentCompetition?.id
            ) {
                setAudit([])
                setAuditError('')
                return
            }

            setAuditLoading(true)
            setAuditError('')

            try {
                const rows = await getCompetitionRulesAcceptanceAudit(
                    currentOrganisation.id,
                    currentCompetition.id,
                    activeRules.id,
                    activeRules.version,
                )
                setAudit(rows)
            } catch (caughtError) {
                setAudit([])
                setAuditError(
                    caughtError instanceof Error
                        ? caughtError.message
                        : 'TournamentHQ could not load the rules acceptance audit.',
                )
            } finally {
                setAuditLoading(false)
            }
        },
        [currentCompetition?.id, currentOrganisation?.id],
    )

    const loadRules = useCallback(async () => {
        if (!currentOrganisation?.id || !currentCompetition?.id) {
            setRules(null)
            setTitle('Tournament Rules')
            setRulesText('')
            setRulesUrl('')
            setRequiresAcceptance(false)
            setPublicVisible(false)
            setAudit([])
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
            setPublicVisible(activeRules?.public_visible ?? false)
            await loadAudit(activeRules)
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'TournamentHQ could not load tournament rules.',
            )
        } finally {
            setLoading(false)
        }
    }, [currentCompetition?.id, currentOrganisation?.id, loadAudit])

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
                publicVisible,
                existingRules: rules,
            })

            setRules(savedRules)
            setTitle(savedRules.title)
            setRulesText(savedRules.rules_text)
            setRulesUrl(savedRules.rules_url ?? '')
            setRequiresAcceptance(savedRules.requires_acceptance)
            setPublicVisible(savedRules.public_visible)
            setMessage(
                savedRules.requires_acceptance
                    ? `Rules saved as version ${savedRules.version}. Invited officials must accept this version before accessing the competition portal.`
                    : `Rules saved as version ${savedRules.version}. Acceptance is currently not required.`,
            )
            await loadAudit(savedRules)
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
                        Publish rules for {currentCompetition.name}, require invited officials to accept them and track acknowledgements.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="rounded-2xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] p-8 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--thq-admin-accent)]" />
                    <p className="mt-4 text-sm font-semibold text-[var(--thq-admin-muted)]">Loading rules...</p>
                </div>
            ) : (
                <>
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
                                    rows={20}
                                    className="rounded-xl border border-[color:var(--thq-admin-border)] bg-black/20 px-4 py-3 font-mono text-sm leading-6 text-white outline-none focus:border-[var(--thq-admin-accent)]"
                                    placeholder="Paste the competition rules here so invited users and public visitors can read them."
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
                                    checked={publicVisible}
                                    onChange={(event) => setPublicVisible(event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-900"
                                />
                                <span>
                                    <strong className="flex items-center gap-2 text-white">
                                        <Globe2 className="h-4 w-4 text-[var(--thq-admin-accent)]" />
                                        Show these rules on the public website
                                    </strong>
                                    <span className="mt-1 block text-[var(--thq-admin-muted)]">
                                        Public visitors will be able to read this active rules version from the Tournament Rules page.
                                    </span>
                                </span>
                            </label>

                            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[color:var(--thq-admin-border)] bg-black/20 p-4 text-sm leading-6 text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={requiresAcceptance}
                                    onChange={(event) => setRequiresAcceptance(event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-900"
                                />
                                <span>
                                    <strong className="text-white">
                                        Require invited officials to accept these rules before accessing this competition portal
                                    </strong>
                                    <span className="mt-1 block text-[var(--thq-admin-muted)]">
                                        Organisation owners and TournamentHQ platform administrators are exempt from the gate.
                                    </span>
                                </span>
                            </label>
                        </div>

                        {rules && (
                            <div className="mt-5 rounded-xl border border-[color:var(--thq-admin-border)] bg-black/20 px-4 py-3 text-sm text-[var(--thq-admin-muted)]">
                                Current saved version: <strong className="text-white">{rules.version}</strong>. Changing the rules content or acceptance requirement creates a new version, so officials must accept the updated rules again.
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

                    <section className="rounded-2xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--thq-admin-accent)]">
                                    <UsersRound className="h-4 w-4" />
                                    Acceptance audit
                                </div>
                                <h4 className="mt-2 text-xl font-black text-white">
                                    Invited official acknowledgements
                                </h4>
                                <p className="mt-1 text-sm leading-6 text-[var(--thq-admin-muted)]">
                                    Acceptance is tracked per user, competition and rules version.
                                </p>
                            </div>

                            {rules && (
                                <div className="flex flex-wrap gap-2 text-xs font-black">
                                    <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1.5 text-lime-200">
                                        {auditSummary.accepted} accepted
                                    </span>
                                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-amber-100">
                                        {auditSummary.pending} pending
                                    </span>
                                    <span className="rounded-full border border-[color:var(--thq-admin-border)] bg-black/20 px-3 py-1.5 text-[var(--thq-admin-muted)]">
                                        Version {rules.version}
                                    </span>
                                </div>
                            )}
                        </div>

                        {!rules ? (
                            <div className="mt-5 rounded-xl border border-[color:var(--thq-admin-border)] bg-black/20 p-4 text-sm text-[var(--thq-admin-muted)]">
                                Save tournament rules to start tracking acknowledgements.
                            </div>
                        ) : auditLoading ? (
                            <div className="mt-5 flex items-center gap-3 rounded-xl border border-[color:var(--thq-admin-border)] bg-black/20 p-4 text-sm text-[var(--thq-admin-muted)]">
                                <Loader2 className="h-4 w-4 animate-spin text-[var(--thq-admin-accent)]" />
                                Loading acceptance status...
                            </div>
                        ) : auditError ? (
                            <div role="alert" className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm font-semibold text-amber-100">
                                {auditError}
                            </div>
                        ) : audit.length === 0 ? (
                            <div className="mt-5 rounded-xl border border-[color:var(--thq-admin-border)] bg-black/20 p-4 text-sm text-[var(--thq-admin-muted)]">
                                No active invited officials currently require rules acceptance.
                            </div>
                        ) : (
                            <div className="mt-5 overflow-x-auto rounded-xl border border-[color:var(--thq-admin-border)]">
                                <table className="min-w-full border-collapse text-left text-sm">
                                    <thead className="bg-black/25 text-xs uppercase tracking-[0.12em] text-[var(--thq-admin-muted)]">
                                        <tr>
                                            <th className="px-4 py-3 font-black">Official</th>
                                            <th className="px-4 py-3 font-black">Role</th>
                                            <th className="px-4 py-3 font-black">Status</th>
                                            <th className="px-4 py-3 font-black">Accepted</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[color:var(--thq-admin-border)]">
                                        {audit.map((item) => (
                                            <tr key={item.userId} className="bg-black/10">
                                                <td className="px-4 py-3">
                                                    <strong className="block text-white">
                                                        {item.fullName ?? item.email ?? 'Invited official'}
                                                    </strong>
                                                    {item.fullName && item.email && (
                                                        <span className="mt-0.5 block text-xs text-[var(--thq-admin-muted)]">
                                                            {item.email}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--thq-admin-muted)]">
                                                    {formatAdminRole(item.role)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${
                                                        item.accepted
                                                            ? 'border-lime-400/30 bg-lime-400/10 text-lime-200'
                                                            : 'border-amber-400/30 bg-amber-400/10 text-amber-100'
                                                    }`}>
                                                        {item.accepted ? 'Accepted' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-[var(--thq-admin-muted)]">
                                                    {formatAcceptedAt(item.acceptedAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}
