import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    CheckCircle2,
    CircleAlert,
    Clock3,
    Mail,
    MessageCircle,
    MessagesSquare,
    RefreshCw,
    Smartphone,
    UserRound,
    Users,
    UsersRound,
} from 'lucide-react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { communicationsService } from '../../../services/communicationsService'
import type {
    CommunicationChannel,
    CommunicationDirectoryRecipient,
    CommunicationHistoryItem,
    CommunicationProviderStatus,
    CommunicationRecipientDraft,
} from '../../../types/communicationTypes'
import { CommunicationComposerModal } from './CommunicationComposerModal'

type RecipientMode =
    | 'player'
    | 'all_players'
    | 'manual'

function shortDateTime(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

function channelIcon(channel: CommunicationChannel) {
    if (channel === 'email') return Mail
    if (channel === 'sms') return Smartphone
    return MessageCircle
}

function isValidEmail(value: string): boolean {
    const trimmed = value.trim()
    if (!trimmed) return true
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

function isValidPhone(value: string): boolean {
    const trimmed = value.trim()
    if (!trimmed) return true
    if (!/^[0-9+() \-]+$/.test(trimmed)) return false

    const digits = trimmed.replace(/\D/g, '')
    return digits.length >= 7 && digits.length <= 15
}

function isTestDelivery(
    item: CommunicationHistoryItem,
): boolean {
    return (
        item.provider === 'mock' ||
        Boolean(
            item.providerMessageId?.startsWith('mock-') ||
            item.providerMessageId?.startsWith('dry-run-'),
        )
    )
}

function statusClasses(
    item: CommunicationHistoryItem,
): string {
    if (isTestDelivery(item)) {
        return 'border-amber-300/25 bg-amber-300/10 text-amber-200'
    }

    if (
        item.status === 'delivered' ||
        item.status === 'read'
    ) {
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
    }

    if (item.status === 'sent') {
        return 'border-sky-300/25 bg-sky-300/10 text-sky-200'
    }

    if (
        item.status === 'accepted' ||
        item.status === 'queued' ||
        item.status === 'delivery_delayed' ||
        item.status === 'skipped'
    ) {
        return 'border-amber-300/25 bg-amber-300/10 text-amber-200'
    }

    if (
        item.status === 'failed' ||
        item.status === 'bounced' ||
        item.status === 'complained'
    ) {
        return 'border-red-400/25 bg-red-400/10 text-red-200'
    }

    return 'border-white/10 bg-white/5 text-slate-300'
}

function statusLabel(
    item: CommunicationHistoryItem,
): string {
    if (isTestDelivery(item)) return 'Test only'

    if (item.status === 'accepted') return 'Submitted'
    if (item.status === 'delivery_delayed') return 'Delayed'
    if (item.status === 'read') {
        return item.channel === 'email' ? 'Opened' : 'Read'
    }
    if (item.status === 'bounced') return 'Bounced'
    if (item.status === 'complained') return 'Spam complaint'
    if (item.status === 'skipped') return 'Not sent'

    return item.status.replace(/_/g, ' ')
}

function statusTime(
    item: CommunicationHistoryItem,
): string {
    if (item.status === 'read' && item.readAt) return item.readAt
    if (item.status === 'complained' && item.complainedAt) {
        return item.complainedAt
    }
    if (item.status === 'bounced' && item.bouncedAt) {
        return item.bouncedAt
    }
    if (item.status === 'failed' && item.failedAt) return item.failedAt
    if (item.status === 'delivered' && item.deliveredAt) {
        return item.deliveredAt
    }
    if (item.status === 'delivery_delayed' && item.delayedAt) {
        return item.delayedAt
    }
    if (item.status === 'sent' && item.sentAt) return item.sentAt

    return item.updatedAt || item.queuedAt
}

function isTrackingPending(
    item: CommunicationHistoryItem,
): boolean {
    return (
        !isTestDelivery(item) &&
        (
            item.status === 'queued' ||
            item.status === 'accepted' ||
            item.status === 'sent' ||
            item.status === 'delivery_delayed'
        )
    )
}

function toDraft(
    recipient: CommunicationDirectoryRecipient,
): CommunicationRecipientDraft {
    return {
        recipientName: recipient.recipientName,
        email: recipient.email,
        phone: recipient.phone,
        whatsappPhone: recipient.whatsappPhone,
        playerId: recipient.playerId,
        teamId: recipient.teamId,
        contactId: recipient.contactId,
    }
}

export function CommunicationsManager() {
    const { currentOrganisation } = useOrganisation()
    const organisationId = currentOrganisation?.id ?? null
    const isClub =
        currentOrganisation?.organisation_type === 'club'

    const [providers, setProviders] =
        useState<CommunicationProviderStatus[]>([])
    const [history, setHistory] =
        useState<CommunicationHistoryItem[]>([])
    const [directory, setDirectory] =
        useState<CommunicationDirectoryRecipient[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [composerOpen, setComposerOpen] = useState(false)

    const [recipientMode, setRecipientMode] =
        useState<RecipientMode>(isClub ? 'player' : 'manual')
    const [selectedDirectoryKey, setSelectedDirectoryKey] =
        useState('')
    const [recipientName, setRecipientName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [messageBody, setMessageBody] = useState('')

    useEffect(() => {
        setRecipientMode(isClub ? 'player' : 'manual')
        setSelectedDirectoryKey('')
        setRecipientName('')
        setEmail('')
        setPhone('')
        setMessageBody('')
        setComposerOpen(false)
        setError(null)
    }, [organisationId, isClub])

    const load = useCallback(async (soft = false) => {
        if (!organisationId) {
            setProviders([])
            setHistory([])
            setDirectory([])
            setLoading(false)
            return
        }

        try {
            if (soft) setRefreshing(true)
            else setLoading(true)

            setError(null)

            const [
                providerResult,
                historyResult,
                directoryResult,
            ] = await Promise.allSettled([
                communicationsService.getProviderStatus(
                    organisationId,
                ),
                communicationsService.getHistory(
                    organisationId,
                    60,
                ),
                communicationsService.getRecipientDirectory(
                    organisationId,
                ),
            ])

            if (providerResult.status === 'fulfilled') {
                setProviders(providerResult.value)
            } else {
                setProviders([])
            }

            if (historyResult.status === 'fulfilled') {
                setHistory(historyResult.value)
            } else {
                setHistory([])
            }

            if (directoryResult.status === 'fulfilled') {
                const directoryRows = directoryResult.value
                setDirectory(directoryRows)

                const playerRows = directoryRows.filter(
                    (item) => item.kind === 'player',
                )

                setSelectedDirectoryKey((current) => {
                    if (
                        current &&
                        playerRows.some(
                            (item) => item.key === current,
                        )
                    ) {
                        return current
                    }

                    return playerRows[0]?.key ?? ''
                })
            } else {
                setDirectory([])
                setSelectedDirectoryKey('')
                setError(
                    'The player and contact list could not be loaded. You can still use Other contact to send a message.',
                )
            }
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [organisationId])

    useEffect(() => {
        void load()
    }, [load])

    const refreshHistory = useCallback(async () => {
        if (!organisationId) return

        try {
            const rows = await communicationsService.getHistory(
                organisationId,
                60,
            )
            setHistory(rows)
        } catch (caughtError) {
            console.error(
                'Unable to refresh communication delivery status:',
                caughtError,
            )
        }
    }, [organisationId])

    const hasPendingTracking = useMemo(
        () => history.some(isTrackingPending),
        [history],
    )

    useEffect(() => {
        if (!hasPendingTracking) return

        const timer = window.setInterval(() => {
            void refreshHistory()
        }, 10000)

        return () => window.clearInterval(timer)
    }, [hasPendingTracking, refreshHistory])

    const registeredPlayers = useMemo(
        () => directory.filter(
            (item) => item.kind === 'player',
        ),
        [directory],
    )

    const selectedDirectoryRecipient = useMemo(
        () => registeredPlayers.find(
            (item) => item.key === selectedDirectoryKey,
        ) ?? null,
        [registeredPlayers, selectedDirectoryKey],
    )

    const manualRecipient = useMemo<
        CommunicationRecipientDraft | null
    >(
        () => {
            const trimmedEmail = email.trim()
            const trimmedPhone = phone.trim()
            const trimmedName = recipientName.trim()

            if (!trimmedEmail && !trimmedPhone) {
                return null
            }

            return {
                recipientName:
                    trimmedName ||
                    trimmedEmail ||
                    trimmedPhone ||
                    'Recipient',
                email: trimmedEmail || null,
                phone: trimmedPhone || null,
                whatsappPhone: trimmedPhone || null,
            }
        },
        [email, phone, recipientName],
    )

    const activeRecipients = useMemo<
        CommunicationRecipientDraft[]
    >(() => {
        if (recipientMode === 'all_players') {
            return registeredPlayers.map(toDraft)
        }

        if (recipientMode === 'player') {
            return selectedDirectoryRecipient
                ? [toDraft(selectedDirectoryRecipient)]
                : []
        }

        return manualRecipient ? [manualRecipient] : []
    }, [
        manualRecipient,
        recipientMode,
        registeredPlayers,
        selectedDirectoryRecipient,
    ])

    const playerEmailCount = useMemo(
        () => registeredPlayers.filter(
            (player) => Boolean(player.email?.trim()),
        ).length,
        [registeredPlayers],
    )

    const playerMobileCount = useMemo(
        () => registeredPlayers.filter(
            (player) => Boolean(
                player.phone?.trim() ||
                player.whatsappPhone?.trim(),
            ),
        ).length,
        [registeredPlayers],
    )

    function openComposer(): void {
        if (recipientMode === 'player') {
            if (!selectedDirectoryRecipient) {
                setError('Choose a player first.')
                return
            }
        } else if (recipientMode === 'all_players') {
            if (registeredPlayers.length === 0) {
                setError('There are no players available to message yet.')
                return
            }
        } else {
            if (!email.trim() && !phone.trim()) {
                setError(
                    'Enter an email address or mobile number.',
                )
                return
            }

            if (!isValidEmail(email)) {
                setError('Enter a valid email address.')
                return
            }

            if (!isValidPhone(phone)) {
                setError('Enter a valid mobile number.')
                return
            }
        }

        if (!messageBody.trim()) {
            setError('Enter the message you want to send.')
            return
        }

        setError(null)
        setComposerOpen(true)
    }

    if (!currentOrganisation) {
        return (
            <div className="rounded-3xl border border-white/10 bg-[#08120c] p-10 text-center text-slate-400">
                Select an organisation before using TournamentHQ Communications.
            </div>
        )
    }

    return (
        <div className="space-y-6 font-['Inter']">
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#08150d] via-[#08120c] to-[#061008] p-6 lg:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-[#8cf566]/10 p-3 text-[#8cf566]">
                            <MessagesSquare className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8cf566]">
                                TournamentHQ · Communications
                            </p>
                            <h2 className="mt-2 font-['Space_Grotesk'] text-3xl font-black text-white">
                                Send a message
                            </h2>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                                Send updates, reminders and announcements to players, staff and other contacts.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => void load(true)}
                        disabled={refreshing}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${
                                refreshing ? 'animate-spin' : ''
                            }`}
                        />
                        Refresh
                    </button>
                </div>
            </section>

            {error && (
                <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
                    {error}
                </div>
            )}

            {providers.length > 0 && (
                <section className="grid gap-4 md:grid-cols-3">
                    {providers.map((provider) => {
                        const Icon = channelIcon(provider.channel)
                        const ready =
                            provider.configured &&
                            !provider.dryRun &&
                            provider.provider !== 'mock' &&
                            provider.provider !== 'unconfigured'

                        return (
                            <article
                                key={provider.channel}
                                className="rounded-2xl border border-white/10 bg-[#08120c] p-5"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="rounded-xl bg-white/5 p-2.5 text-[#8cf566]">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                                            ready
                                                ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
                                                : 'border-amber-300/25 bg-amber-300/10 text-amber-200'
                                        }`}
                                    >
                                        {ready ? (
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                        ) : (
                                            <CircleAlert className="h-3.5 w-3.5" />
                                        )}
                                        {provider.dryRun
                                            ? 'Test mode'
                                            : ready
                                                ? 'Ready'
                                                : 'Not available'}
                                    </span>
                                </div>
                                <h3 className="mt-4 text-lg font-black capitalize text-white">
                                    {provider.channel}
                                </h3>
                            </article>
                        )
                    })}
                </section>
            )}

            <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-white/10 bg-[#08120c] p-5 sm:p-6">
                    <h3 className="text-xl font-black text-white">
                        {isClub
                            ? 'Who do you want to message?'
                            : 'Who do you want to contact?'}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                        {isClub
                            ? 'Choose a player, message all players, or enter another contact.'
                            : 'Enter the contact details for the person you want to message.'}
                    </p>

                    {isClub && (
                        <div className="mt-5 grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-black/20 p-1.5 sm:grid-cols-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setRecipientMode('player')
                                    setError(null)
                                }}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-black transition ${
                                    recipientMode === 'player'
                                        ? 'bg-[#8cf566] text-[#061008]'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <UserRound className="h-4 w-4" />
                                Player
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRecipientMode('all_players')
                                    setError(null)
                                }}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-black transition ${
                                    recipientMode === 'all_players'
                                        ? 'bg-[#8cf566] text-[#061008]'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <UsersRound className="h-4 w-4" />
                                All players
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRecipientMode('manual')
                                    setError(null)
                                }}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-black transition ${
                                    recipientMode === 'manual'
                                        ? 'bg-[#8cf566] text-[#061008]'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <Users className="h-4 w-4" />
                                Other contact
                            </button>
                        </div>
                    )}

                    <div className="mt-5 space-y-4">
                        {recipientMode === 'player' && isClub ? (
                            <>
                                <label className="block">
                                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                        Choose player
                                    </span>
                                    <select
                                        value={selectedDirectoryKey}
                                        onChange={(event) => {
                                            setSelectedDirectoryKey(
                                                event.target.value,
                                            )
                                            setError(null)
                                        }}
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1710] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-[#8cf566]/60"
                                        disabled={
                                            loading ||
                                            registeredPlayers.length === 0
                                        }
                                    >
                                        {registeredPlayers.length === 0 && (
                                            <option value="">
                                                No players found
                                            </option>
                                        )}
                                        {registeredPlayers.map((recipient) => (
                                            <option
                                                key={recipient.key}
                                                value={recipient.key}
                                            >
                                                {recipient.recipientName}
                                                {recipient.teamNames.length > 0
                                                    ? ` · ${recipient.teamNames.join(', ')}`
                                                    : ''}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                {selectedDirectoryRecipient && (
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                                        <p className="font-black text-white">
                                            {selectedDirectoryRecipient.recipientName}
                                        </p>
                                        {selectedDirectoryRecipient.teamNames.length > 0 && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                {selectedDirectoryRecipient.teamNames.join(' · ')}
                                            </p>
                                        )}
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {selectedDirectoryRecipient.email && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300">
                                                    <Mail className="h-3.5 w-3.5 text-[#8cf566]" />
                                                    Email available
                                                </span>
                                            )}
                                            {(selectedDirectoryRecipient.phone ||
                                                selectedDirectoryRecipient.whatsappPhone) && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300">
                                                    <Smartphone className="h-3.5 w-3.5 text-[#8cf566]" />
                                                    Mobile available
                                                </span>
                                            )}
                                            {!selectedDirectoryRecipient.email &&
                                                !selectedDirectoryRecipient.phone &&
                                                !selectedDirectoryRecipient.whatsappPhone && (
                                                    <span className="text-xs font-semibold text-amber-200">
                                                        No email or mobile number is stored for this player.
                                                    </span>
                                                )}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : recipientMode === 'all_players' && isClub ? (
                            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-[#8cf566]/10 p-2 text-[#8cf566]">
                                        <UsersRound className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-black text-white">
                                            {registeredPlayers.length} player{registeredPlayers.length === 1 ? '' : 's'} selected
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-slate-400">
                                            {playerEmailCount} with email · {playerMobileCount} with mobile
                                        </p>
                                        {registeredPlayers.length === 0 && (
                                            <p className="mt-2 text-xs font-semibold text-amber-200">
                                                Add players to the squad before using this option.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <label className="block">
                                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                        Name (optional)
                                    </span>
                                    <input
                                        value={recipientName}
                                        onChange={(event) =>
                                            setRecipientName(event.target.value)
                                        }
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#8cf566]/60"
                                        placeholder="e.g. Club Secretary"
                                    />
                                </label>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                            Email
                                        </span>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(event) =>
                                                setEmail(event.target.value)
                                            }
                                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#8cf566]/60"
                                            placeholder="name@example.com"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                            Mobile
                                        </span>
                                        <input
                                            value={phone}
                                            onChange={(event) =>
                                                setPhone(event.target.value)
                                            }
                                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#8cf566]/60"
                                            placeholder="+44… or 07…"
                                        />
                                    </label>
                                </div>
                            </>
                        )}

                        <label className="block">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                Message
                            </span>
                            <textarea
                                value={messageBody}
                                onChange={(event) =>
                                    setMessageBody(event.target.value)
                                }
                                rows={5}
                                maxLength={1600}
                                className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-[#8cf566]/60"
                                placeholder="Write your message…"
                            />
                        </label>

                        <button
                            type="button"
                            onClick={openComposer}
                            disabled={
                                loading ||
                                activeRecipients.length === 0 ||
                                !messageBody.trim()
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8cf566] px-4 py-3 text-sm font-black text-[#061008] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <MessagesSquare className="h-4 w-4" />
                            Review message
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#08120c] p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8cf566]">
                                Message history
                            </p>
                            <h3 className="mt-1 text-xl font-black text-white">
                                Recent messages
                            </h3>
                        </div>
                        <Clock3 className="h-5 w-5 text-slate-600" />
                    </div>

                    <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="pb-3 pr-4">Recipient</th>
                                    <th className="pb-3 pr-4">Sent by</th>
                                    <th className="pb-3 pr-4">Status</th>
                                    <th className="pb-3">When</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {history.map((item) => {
                                    const Icon = channelIcon(item.channel)

                                    return (
                                        <tr key={item.deliveryId}>
                                            <td className="py-3 pr-4 font-bold text-white">
                                                {item.recipientName}
                                                {item.errorMessage && (
                                                    <span className="mt-1 block max-w-xs text-[11px] font-medium leading-4 text-red-300/80">
                                                        {item.errorMessage}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 pr-4 text-slate-300">
                                                <span className="inline-flex items-center gap-2 capitalize">
                                                    <Icon className="h-4 w-4 text-[#8cf566]" />
                                                    {item.channel}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span
                                                    className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusClasses(item)}`}
                                                >
                                                    {statusLabel(item)}
                                                </span>
                                                {item.statusDetail && (
                                                    <span
                                                        className={`mt-1 block max-w-xs text-[11px] font-medium leading-4 ${
                                                            item.status === 'failed' ||
                                                            item.status === 'bounced' ||
                                                            item.status === 'complained'
                                                                ? 'text-red-300/80'
                                                                : 'text-amber-200/70'
                                                        }`}
                                                    >
                                                        {item.statusDetail}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 text-slate-500">
                                                {shortDateTime(statusTime(item))}
                                            </td>
                                        </tr>
                                    )
                                })}

                                {!loading && history.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="py-12 text-center text-slate-500"
                                        >
                                            No messages have been sent yet.
                                        </td>
                                    </tr>
                                )}

                                {loading && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="py-12 text-center text-slate-500"
                                        >
                                            Loading messages…
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <CommunicationComposerModal
                open={composerOpen}
                organisationId={currentOrganisation.id}
                organisationName={currentOrganisation.name}
                recipients={activeRecipients}
                defaultTemplateCode="general_operational_message"
                sourceType="manual_message"
                title="Review message"
                initialMessageBody={messageBody}
                onClose={() => setComposerOpen(false)}
                onSent={() => {
                    setComposerOpen(false)
                    setMessageBody('')
                    void load(true)
                }}
            />
        </div>
    )
}
