import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    Banknote,
    BarChart3,
    BrainCircuit,
    CircleAlert,
    CircleCheck,
    CreditCard,
    Download,
    FileText,
    HandCoins,
    LoaderCircle,
    BellRing,
    MessageSquareText,
    Plus,
    ReceiptText,
    RefreshCw,
    Search,
    TrendingDown,
    TrendingUp,
    Trash2,
    WalletCards,
    X,
} from 'lucide-react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { CommunicationComposerModal } from '../Communications/CommunicationComposerModal'
import { clubFinanceService } from '../../../services/clubFinanceService'
import type {
    ClubFinanceCharge,
    ClubFinanceChargeType,
    ClubFinanceDashboard,
    ClubFinanceExpense,
    ClubFinanceFeeRule,
    ClubFinanceIncome,
    ClubFinanceLedger,
    ClubFinancePayment,
    ClubFinanceReferenceData,
    ClubFinanceReport,
    ClubFinanceTeamPaymentModel,
} from '../../../types/clubFinanceTypes'
import type {
    CommunicationRecipientDraft,
} from '../../../types/communicationTypes'

type FinanceTab =
    | 'overview'
    | 'charges'
    | 'payments'
    | 'income'
    | 'expenses'
    | 'receipts'
    | 'reports'
    | 'intelligence'

type PaymentPurpose =
    | 'existing_fee'
    | 'sign_on'
    | 'monthly_fee'
    | 'matchday_sub'
    | 'custom'
    | 'match_later'

type PaymentPurposeSelection = PaymentPurpose | ''

type ModalType =
    | 'payment'
    | 'match_payment'
    | 'expense'
    | 'income'
    | 'charge'
    | 'remove_rule'
    | 'ledger'
    | null

const emptyReferenceData: ClubFinanceReferenceData = {
    seasons: [],
    teams: [],
    players: [],
    fixtures: [],
    chargeTypes: [],
    incomeCategories: [],
    expenseCategories: [],
}

function today(): string {
    return new Date().toISOString().slice(0, 10)
}

function monthKey(): string {
    return today().slice(0, 7)
}

function billingPeriodDate(value: string): string {
    return /^\d{4}-\d{2}$/.test(value)
        ? `${value}-01`
        : value
}

function dueDateForMonth(
    billingMonth: string,
    dueDay: number,
): string {
    const match = /^(\d{4})-(\d{2})$/.exec(billingMonth)

    if (!match) {
        return today()
    }

    const year = Number(match[1])
    const month = Number(match[2])
    const safeDay = Math.min(
        Math.max(Math.trunc(dueDay), 1),
        28,
    )

    return [
        String(year).padStart(4, '0'),
        String(month).padStart(2, '0'),
        String(safeDay).padStart(2, '0'),
    ].join('-')
}

function monthLabel(value: string): string {
    const match = /^(\d{4})-(\d{2})$/.exec(value)

    if (!match) return value

    const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        1,
    )

    return date.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
    })
}

function money(value: number, currency: string): string {
    try {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency,
            maximumFractionDigits: 2,
        }).format(value)
    } catch {
        return `${currency} ${value.toFixed(2)}`
    }
}

function shortDate(value: string | null): string {
    if (!value) return '—'

    const parsed = new Date(`${value.slice(0, 10)}T12:00:00`)
    if (Number.isNaN(parsed.getTime())) return value

    return parsed.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

function label(value: string): string {
    return value
        .replace(/_/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((word) =>
            word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join(' ')
}

function chargeTypeLabel(value: string): string {
    switch (value) {
        case 'sign_on': return 'Signing-on / season dues'
        case 'monthly_fee': return 'Monthly dues'
        case 'matchday_sub': return 'Match subs'
        case 'yellow_card_fine': return 'Yellow card fine'
        case 'red_card_fine': return 'Red card fine'
        default: return label(value)
    }
}

function paymentPurposeLabel(value: PaymentPurpose): string {
    switch (value) {
        case 'existing_fee': return 'Existing amount due'
        case 'sign_on': return 'Signing-on / season dues'
        case 'monthly_fee': return 'Monthly dues'
        case 'matchday_sub': return 'Match subs'
        case 'custom': return 'Other member payment'
        case 'match_later': return 'Other payment / match later'
    }
}

function fixturePaymentLabel(
    fixture: ClubFinanceReferenceData['fixtures'][number],
): string {
    const date = shortDate(fixture.fixtureDate)
    const time = fixture.kickoffTime
        ? fixture.kickoffTime.slice(0, 5)
        : 'Time TBC'
    const opponentPrefix = fixture.homeAway === 'away' ? 'at' : 'vs'
    return `${date} • ${opponentPrefix} ${fixture.opponentName} • ${time}`
}

function paymentPlayerSelectionValue(
    player: ClubFinanceReferenceData['players'][number],
): string {
    return `${player.seasonId}:${player.teamId}:${player.id}`
}

function classNames(
    ...values: Array<string | false | null | undefined>
): string {
    return values.filter(Boolean).join(' ')
}

function statusBadge(status: string): string {
    if (
        status === 'paid' ||
        status === 'cleared' ||
        status === 'received' ||
        status === 'approved'
    ) {
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
    }

    if (
        status === 'overdue' ||
        status === 'failed' ||
        status === 'void'
    ) {
        return 'border-red-400/25 bg-red-400/10 text-red-200'
    }

    if (
        status === 'part_paid' ||
        status === 'pending' ||
        status === 'pending_approval'
    ) {
        return 'border-amber-300/25 bg-amber-300/10 text-amber-200'
    }

    return 'border-white/10 bg-white/5 text-slate-300'
}

function exportReportCsv(report: ClubFinanceReport): void {
    const rows: string[][] = [
        ['TournamentHQ Club Finance Report'],
        ['From', report.period.fromDate ?? ''],
        ['To', report.period.toDate ?? ''],
        [],
        ['Income by category', 'Amount'],
        ...report.incomeByCategory.map((item) => [
            item.category,
            item.amount.toFixed(2),
        ]),
        [],
        ['Expenses by category', 'Amount'],
        ...report.expensesByCategory.map((item) => [
            item.category,
            item.amount.toFixed(2),
        ]),
        [],
        [
            'Outstanding player',
            'Fee type',
            'Due date',
            'Status',
            'Outstanding',
        ],
        ...report.outstandingBalances.map((item) => [
            item.playerName,
            item.chargeType,
            item.dueDate ?? '',
            item.status,
            item.outstandingAmount.toFixed(2),
        ]),
    ]

    const csv = rows
        .map((row) =>
            row
                .map((cell) => `"${cell.replace(/"/g, '""')}"`)
                .join(','),
        )
        .join('\n')

    const blob = new Blob([csv], {
        type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `tournamenthq-club-finance-${today()}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
}

export function ClubFinanceDashboard() {
    const { currentOrganisation } = useOrganisation()
    const organisationId = currentOrganisation?.id ?? null

    const [tab, setTab] = useState<FinanceTab>('overview')
    const [modal, setModal] = useState<ModalType>(null)
    const [referenceData, setReferenceData] =
        useState<ClubFinanceReferenceData>(emptyReferenceData)
    const [dashboard, setDashboard] =
        useState<ClubFinanceDashboard | null>(null)
    const [charges, setCharges] = useState<ClubFinanceCharge[]>([])
    const [feeRules, setFeeRules] = useState<ClubFinanceFeeRule[]>([])
    const [payments, setPayments] = useState<ClubFinancePayment[]>([])
    const [expenses, setExpenses] = useState<ClubFinanceExpense[]>([])
    const [income, setIncome] = useState<ClubFinanceIncome[]>([])
    const [report, setReport] = useState<ClubFinanceReport | null>(null)
    const [ledger, setLedger] = useState<ClubFinanceLedger | null>(null)
    const [ledgerPlayerId, setLedgerPlayerId] = useState<string | null>(null)
    const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const [communicationOpen, setCommunicationOpen] = useState(false)
    const [communicationRecipients, setCommunicationRecipients] =
        useState<CommunicationRecipientDraft[]>([])
    const [communicationTemplateCode, setCommunicationTemplateCode] =
        useState('finance_payment_reminder')
    const [communicationSourceType, setCommunicationSourceType] =
        useState<string | null>(null)
    const [communicationSourceId, setCommunicationSourceId] =
        useState<string | null>(null)
    const [communicationTitle, setCommunicationTitle] =
        useState('Send payment reminder')

    const [paymentChargeId, setPaymentChargeId] = useState('')
    const [paymentPlayerId, setPaymentPlayerId] = useState('')
    const [paymentPurpose, setPaymentPurpose] = useState<PaymentPurposeSelection>('')
    const [paymentFixtureId, setPaymentFixtureId] = useState('')
    const [paymentBillingMonth, setPaymentBillingMonth] = useState(monthKey())
    const [paymentExpectedAmount, setPaymentExpectedAmount] = useState('')
    const [paymentDescription, setPaymentDescription] = useState('')
    const [paymentPolicy, setPaymentPolicy] = useState<{ monthlyFeeAmount: number; matchdaySubAmount: number; monthlyDueDay: number; paymentModel: ClubFinanceTeamPaymentModel } | null>(null)
    const [paymentFeeRules, setPaymentFeeRules] = useState<ClubFinanceFeeRule[]>([])
    const [paymentContextLoading, setPaymentContextLoading] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
    const [paymentDate, setPaymentDate] = useState(today())
    const [paymentReference, setPaymentReference] = useState('')
    const [paymentOptionsLoading, setPaymentOptionsLoading] = useState(false)
    const [matchingPayment, setMatchingPayment] = useState<ClubFinancePayment | null>(null)
    const [matchCharges, setMatchCharges] = useState<ClubFinanceCharge[]>([])
    const [matchChargeId, setMatchChargeId] = useState('')
    const [matchAmount, setMatchAmount] = useState('')
    const [matchOptionsLoading, setMatchOptionsLoading] = useState(false)

    const [expenseCategoryId, setExpenseCategoryId] = useState('')
    const [expenseSupplier, setExpenseSupplier] = useState('')
    const [expenseDescription, setExpenseDescription] = useState('')
    const [expenseAmount, setExpenseAmount] = useState('')
    const [expenseDate, setExpenseDate] = useState(today())
    const [expenseTeamId, setExpenseTeamId] = useState('')
    const [expenseReceiptFile, setExpenseReceiptFile] =
        useState<File | null>(null)
    const [receiptOpeningId, setReceiptOpeningId] = useState<string | null>(null)

    const [incomeCategoryId, setIncomeCategoryId] = useState('')
    const [incomeSource, setIncomeSource] = useState('')
    const [incomeDescription, setIncomeDescription] = useState('')
    const [incomeExpected, setIncomeExpected] = useState('')
    const [incomeReceived, setIncomeReceived] = useState('')
    const [incomeDate, setIncomeDate] = useState(today())
    const [incomeTeamId, setIncomeTeamId] = useState('')

    const [chargeSeasonId, setChargeSeasonId] = useState('')
    const [chargeTeamIds, setChargeTeamIds] = useState<string[]>([])
    const [feeRuleKind, setFeeRuleKind] = useState<'dues' | 'match_sub' | ''>('')
    const [feeRuleFrequency, setFeeRuleFrequency] = useState<'monthly' | 'once_per_season'>('monthly')
    const [feeRuleDueDay, setFeeRuleDueDay] = useState(1)
    const [chargeAmount, setChargeAmount] = useState('')
    const [chargeDescription, setChargeDescription] = useState('')
    const [editingFeeRuleId, setEditingFeeRuleId] = useState<string | null>(null)
    const [removingFeeRule, setRemovingFeeRule] = useState<ClubFinanceFeeRule | null>(null)
    const [removeRuleUnpaidCharges, setRemoveRuleUnpaidCharges] = useState(false)

    const [reportFromDate, setReportFromDate] = useState('')
    const [reportToDate, setReportToDate] = useState(today())

    const currency = dashboard?.summary.currency ?? 'GBP'

    const availableTeams = useMemo(() => {
        if (!selectedSeasonId) return referenceData.teams
        return referenceData.teams.filter((team) =>
            team.seasonIds.includes(selectedSeasonId),
        )
    }, [referenceData.teams, selectedSeasonId])

    const paymentPlayers = useMemo(() =>
        referenceData.players.filter((player) =>
            (!selectedSeasonId || player.seasonId === selectedSeasonId) &&
            (!selectedTeamId || player.teamId === selectedTeamId),
        ),
    [referenceData.players, selectedSeasonId, selectedTeamId])

    const paymentPlayer = useMemo(
        () => paymentPlayers.find((player) => paymentPlayerSelectionValue(player) === paymentPlayerId) ?? null,
        [paymentPlayerId, paymentPlayers],
    )

    const paymentChargesForPlayer = useMemo(
        () => charges.filter((charge) =>
            paymentPlayer !== null &&
            charge.playerId === paymentPlayer.id &&
            charge.seasonId === paymentPlayer.seasonId &&
            charge.teamId === paymentPlayer.teamId &&
            charge.outstandingAmount > 0,
        ),
        [charges, paymentPlayer],
    )

    const paymentFixtures = useMemo(
        () => referenceData.fixtures.filter((fixture) =>
            ['scheduled', 'confirmed', 'played'].includes(fixture.status) &&
            (!paymentPlayer || (
                fixture.seasonId === paymentPlayer.seasonId &&
                fixture.teamId === paymentPlayer.teamId
            )),
        ),
        [paymentPlayer, referenceData.fixtures],
    )

    const filteredCharges = useMemo(() => {
        const term = search.trim().toLowerCase()
        if (!term) return charges
        return charges.filter((charge) =>
            [
                charge.playerName,
                charge.chargeType,
                charge.description ?? '',
                charge.status,
            ].some((value) => value.toLowerCase().includes(term)),
        )
    }, [charges, search])

    const fullFinanceAccess =
        dashboard?.access.role === 'platform_admin' ||
        dashboard?.access.role === 'super_admin' ||
        dashboard?.access.role === 'treasurer' ||
        dashboard?.access.role === 'finance_admin'

    const canCollectPayments =
        fullFinanceAccess ||
        (
            dashboard?.access.role === 'team_manager' &&
            selectedTeamId !== null
        )

    const communicationPlayer = useCallback(
        (playerId: string) =>
            referenceData.players.find(
                (player) => player.id === playerId,
            ) ?? null,
        [referenceData.players],
    )

    const hasCommunicationContact = useCallback(
        (playerId: string): boolean => {
            const player = communicationPlayer(playerId)
            return Boolean(
                player?.email?.trim() ||
                player?.phone?.trim(),
            )
        },
        [communicationPlayer],
    )

    const overdueCommunicationStats = useMemo(() => {
        const overduePlayers = new Set<string>()

        for (const item of dashboard?.owing ?? []) {
            if (item.overdue && item.outstandingAmount > 0) {
                overduePlayers.add(item.playerId)
            }
        }

        let email = 0
        let mobile = 0
        let contactable = 0

        for (const playerId of overduePlayers) {
            const player = communicationPlayer(playerId)
            const hasEmail = Boolean(player?.email?.trim())
            const hasMobile = Boolean(player?.phone?.trim())

            if (hasEmail) email += 1
            if (hasMobile) mobile += 1
            if (hasEmail || hasMobile) contactable += 1
        }

        return {
            total: overduePlayers.size,
            email,
            mobile,
            contactable,
            missingContact: overduePlayers.size - contactable,
        }
    }, [communicationPlayer, dashboard?.owing])

    const openFinanceReminder = useCallback((item: {
        id: string
        playerId: string
        playerName: string
        chargeType: string
        description: string | null
        outstandingAmount: number
        dueDate: string | null
        overdue?: boolean
        teamId?: string | null
    }) => {
        const player = communicationPlayer(item.playerId)

        if (
            !player?.email?.trim() &&
            !player?.phone?.trim()
        ) {
            setNotice(
                `No email address or mobile number is stored for ${item.playerName}. Add contact details before sending a reminder.`,
            )
            return
        }

        const overdue = item.overdue ?? (
            Boolean(item.dueDate) &&
            (item.dueDate ?? '') < today()
        )
        const feeDescription =
            item.description?.trim() ||
            chargeTypeLabel(item.chargeType)
        const dueLine = item.dueDate
            ? overdue
                ? ` Payment was due on ${shortDate(item.dueDate)}.`
                : ` Payment is due on ${shortDate(item.dueDate)}.`
            : ''

        setCommunicationRecipients([{
            recipientName: item.playerName,
            email: player?.email ?? null,
            phone: player?.phone ?? null,
            whatsappPhone: player?.phone ?? null,
            playerId: item.playerId,
            teamId: item.teamId ?? player?.teamId ?? null,
            variables: {
                amount_outstanding: money(
                    item.outstandingAmount,
                    currency,
                ),
                fee_description: feeDescription,
                due_line: dueLine,
            },
        }])
        setCommunicationTemplateCode(
            overdue
                ? 'finance_overdue_reminder'
                : 'finance_payment_reminder',
        )
        setCommunicationSourceType('club_finance_charge')
        setCommunicationSourceId(item.id)
        setCommunicationTitle(
            overdue
                ? 'Send overdue payment reminder'
                : 'Send payment reminder',
        )
        setCommunicationOpen(true)
    }, [communicationPlayer, currency])

    const openAllOverdueReminders = useCallback(() => {
        if (!dashboard) return

        type Aggregate = {
            playerId: string
            playerName: string
            outstandingAmount: number
            descriptions: Set<string>
            oldestDueDate: string | null
        }

        const grouped = new Map<string, Aggregate>()

        for (const item of dashboard.owing) {
            if (!item.overdue || item.outstandingAmount <= 0) {
                continue
            }

            const existing = grouped.get(item.playerId)
            const description =
                item.description?.trim() ||
                chargeTypeLabel(item.chargeType)

            if (existing) {
                existing.outstandingAmount += item.outstandingAmount
                existing.descriptions.add(description)
                if (
                    item.dueDate &&
                    (
                        !existing.oldestDueDate ||
                        item.dueDate < existing.oldestDueDate
                    )
                ) {
                    existing.oldestDueDate = item.dueDate
                }
            } else {
                grouped.set(item.playerId, {
                    playerId: item.playerId,
                    playerName: item.playerName,
                    outstandingAmount: item.outstandingAmount,
                    descriptions: new Set([description]),
                    oldestDueDate: item.dueDate,
                })
            }
        }

        const recipients = [...grouped.values()].map((item) => {
            const player = communicationPlayer(item.playerId)
            const descriptions = [...item.descriptions]
            const feeDescription = descriptions.length === 1
                ? descriptions[0]
                : `${descriptions.length} outstanding fees`

            return {
                recipientName: item.playerName,
                email: player?.email ?? null,
                phone: player?.phone ?? null,
                whatsappPhone: player?.phone ?? null,
                playerId: item.playerId,
                teamId: player?.teamId ?? null,
                variables: {
                    amount_outstanding: money(
                        item.outstandingAmount,
                        currency,
                    ),
                    fee_description: feeDescription,
                    due_line: item.oldestDueDate
                        ? ` The oldest balance was due on ${shortDate(item.oldestDueDate)}.`
                        : '',
                },
            } satisfies CommunicationRecipientDraft
        })

        if (recipients.length === 0) {
            setNotice('There are no overdue member balances to remind.')
            return
        }

        if (
            !recipients.some((recipient) =>
                Boolean(
                    recipient.email?.trim() ||
                    recipient.phone?.trim() ||
                    recipient.whatsappPhone?.trim(),
                ),
            )
        ) {
            setNotice(
                'None of the overdue members currently has an email address or mobile number. Add contact details before sending reminders.',
            )
            return
        }

        setCommunicationRecipients(recipients)
        setCommunicationTemplateCode('finance_overdue_reminder')
        setCommunicationSourceType('club_finance_overdue_batch')
        setCommunicationSourceId(null)
        setCommunicationTitle(
            `Remind ${recipients.length} overdue member${recipients.length === 1 ? '' : 's'}`,
        )
        setCommunicationOpen(true)
    }, [communicationPlayer, currency, dashboard])

    const loadCore = useCallback(async (soft = false) => {
        if (!organisationId) return

        try {
            if (soft) setRefreshing(true)
            else setLoading(true)
            setError(null)

            const refs = await clubFinanceService.getReferenceData(
                organisationId,
            )
            setReferenceData(refs)

            if (!selectedSeasonId && refs.seasons.length > 0) {
                const active = refs.seasons.find(
                    (season) => season.status === 'active',
                ) ?? refs.seasons[0]
                setSelectedSeasonId(active.id)
            }

            const summary = await clubFinanceService.getDashboard(
                organisationId,
                selectedSeasonId,
                selectedTeamId,
            )
            setDashboard(summary)
        } catch (caughtError) {
            console.error(caughtError)
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to load Club Finance.',
            )
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [organisationId, selectedSeasonId, selectedTeamId])

    const loadTabData = useCallback(async () => {
        if (!organisationId || !dashboard) return

        try {
            setError(null)

            if (tab === 'charges') {
                if (
                    canCollectPayments &&
                    selectedSeasonId &&
                    (selectedTeamId || fullFinanceAccess)
                ) {
                    await clubFinanceService.syncFeeRules(
                        organisationId,
                        selectedSeasonId,
                        selectedTeamId,
                        today(),
                    )
                }

                const [availableRules, availableCharges] =
                    await Promise.all([
                        clubFinanceService.getFeeRules(
                            organisationId,
                            selectedSeasonId,
                            selectedTeamId,
                        ),
                        clubFinanceService.getCharges(
                            organisationId,
                            selectedSeasonId,
                            selectedTeamId,
                        ),
                    ])

                setFeeRules(availableRules)
                setCharges(availableCharges)
            }

            if (tab === 'payments') {
                setPayments(await clubFinanceService.getPayments(
                    organisationId,
                    selectedSeasonId,
                    selectedTeamId,
                ))
            }

            if ((tab === 'expenses' || tab === 'receipts') && fullFinanceAccess) {
                setExpenses(await clubFinanceService.getExpenses(
                    organisationId,
                    selectedSeasonId,
                    selectedTeamId,
                ))
            }

            if (tab === 'income' && fullFinanceAccess) {
                setIncome(await clubFinanceService.getIncome(
                    organisationId,
                    selectedSeasonId,
                    selectedTeamId,
                ))
            }
        } catch (caughtError) {
            console.error(caughtError)
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to load finance records.',
            )
        }
    }, [
        organisationId,
        dashboard,
        tab,
        selectedSeasonId,
        selectedTeamId,
        fullFinanceAccess,
        canCollectPayments,
    ])

    useEffect(() => {
        setDashboard(null)
        setReferenceData(emptyReferenceData)
        setSelectedSeasonId(null)
        setSelectedTeamId(null)
        setCharges([])
        setFeeRules([])
        setPayments([])
        setExpenses([])
        setIncome([])
        setReport(null)
        setError(null)
        setNotice(null)
        void loadCore()
    }, [organisationId]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!organisationId || loading) return
        void loadCore(true)
    }, [organisationId, loading, loadCore, selectedSeasonId, selectedTeamId])

    useEffect(() => {
        void loadTabData()
    }, [loadTabData])

    useEffect(() => {
        if (modal !== 'payment' || !organisationId || !paymentPlayer) {
            setPaymentPolicy(null)
            setPaymentFeeRules([])
            setPaymentContextLoading(false)
            return
        }

        let cancelled = false
        setPaymentContextLoading(true)

        void clubFinanceService.getFeeRules(
            organisationId,
            paymentPlayer.seasonId,
            paymentPlayer.teamId,
        ).then((rules) => {
            if (cancelled) return

            const activeRules = rules.filter((rule) => rule.active)
            setPaymentFeeRules(activeRules)

            const monthlyRule = activeRules.find(
                (rule) => rule.canonicalType === 'monthly_fee',
            )
            const matchdayRule = activeRules.find(
                (rule) => rule.canonicalType === 'matchday_sub',
            )

            const paymentModel: ClubFinanceTeamPaymentModel =
                monthlyRule && matchdayRule
                    ? 'hybrid'
                    : monthlyRule
                      ? 'monthly'
                      : matchdayRule
                        ? 'matchday'
                        : 'none'

            setPaymentPolicy({
                monthlyFeeAmount: monthlyRule?.amount ?? 0,
                matchdaySubAmount: matchdayRule?.amount ?? 0,
                monthlyDueDay: monthlyRule?.dueDay ?? 1,
                paymentModel,
            })
        }).catch(() => {
            if (!cancelled) {
                setPaymentPolicy(null)
                setPaymentFeeRules([])
            }
        }).finally(() => {
            if (!cancelled) {
                setPaymentContextLoading(false)
            }
        })

        return () => {
            cancelled = true
        }
    }, [modal, organisationId, paymentPlayer])

    useEffect(() => {
        if (modal !== 'payment' || !paymentPlayer) return

        let suggested = 0
        if (paymentPurpose === 'sign_on') {
            suggested = paymentFeeRules.find(
                (rule) => rule.canonicalType === 'sign_on',
            )?.amount ?? paymentPlayer.signOnFeeAmount
        } else if (paymentPurpose === 'monthly_fee') {
            suggested = paymentFeeRules.find(
                (rule) => rule.canonicalType === 'monthly_fee',
            )?.amount ?? 0
        } else if (paymentPurpose === 'matchday_sub') {
            suggested = paymentFeeRules.find(
                (rule) => rule.canonicalType === 'matchday_sub',
            )?.amount ?? 0
        }

        if (suggested > 0 && !paymentExpectedAmount) {
            const formatted = suggested.toFixed(2)
            setPaymentExpectedAmount(formatted)
            setPaymentAmount((current) => current || formatted)
        }
    }, [
        modal,
        paymentExpectedAmount,
        paymentFeeRules,
        paymentPlayer,
        paymentPolicy,
        paymentPurpose,
    ])

    function changePaymentPlayer(value: string): void {
        setPaymentPolicy(null)
        setPaymentFeeRules([])
        setPaymentPlayerId(value)
        setPaymentPurpose('')
        setPaymentChargeId('')
        setPaymentFixtureId('')
        setPaymentExpectedAmount('')
        setPaymentAmount('')
        setError(null)
    }

    function changePaymentPurpose(value: PaymentPurposeSelection): void {
        setPaymentPurpose(value)
        setPaymentChargeId('')
        setPaymentFixtureId('')
        setPaymentExpectedAmount('')
        setPaymentDescription('')
        setPaymentAmount('')
        if (value === 'monthly_fee') {
            setPaymentBillingMonth(monthKey())
        }
        setError(null)
    }

    function closeModal(): void {
        if (saving) return
        setModal(null)
        setLedger(null)
        setLedgerPlayerId(null)
        setMatchingPayment(null)
        setMatchCharges([])
        setMatchChargeId('')
        setMatchAmount('')
        setRemovingFeeRule(null)
        setRemoveRuleUnpaidCharges(false)
        setError(null)
    }

    async function openPayment(charge?: ClubFinanceCharge | null): Promise<void> {
        setPaymentChargeId(charge?.id ?? '')
        const initialMember = charge
            ? referenceData.players.find((player) =>
                player.id === charge.playerId &&
                player.seasonId === charge.seasonId &&
                (!charge.teamId || player.teamId === charge.teamId),
            ) ?? null
            : null
        setPaymentPlayerId(initialMember ? paymentPlayerSelectionValue(initialMember) : '')
        setPaymentPurpose(charge ? 'existing_fee' : '')
        setPaymentFixtureId('')
        setPaymentBillingMonth(monthKey())
        setPaymentExpectedAmount('')
        setPaymentDescription('')
        setPaymentPolicy(null)
        setPaymentFeeRules([])
        setPaymentAmount(
            charge ? charge.outstandingAmount.toFixed(2) : '',
        )
        setPaymentMethod('bank_transfer')
        setPaymentDate(today())
        setPaymentReference('')
        setError(null)
        setModal('payment')

        if (!organisationId) return

        setCharges([])

        try {
            setPaymentOptionsLoading(true)

            const targetSeasonId = charge?.seasonId ?? selectedSeasonId
            const targetTeamId = charge?.teamId ?? selectedTeamId

            if (targetSeasonId && targetTeamId) {
                await clubFinanceService.syncFeeRules(
                    organisationId,
                    targetSeasonId,
                    targetTeamId,
                    today(),
                )
            }

            const availableFees = await clubFinanceService.getCharges(
                organisationId,
                targetSeasonId,
                targetTeamId,
            )
            setCharges(availableFees)

            if (charge) {
                const selectedFee =
                    availableFees.find((item) => item.id === charge.id) ?? charge
                setPaymentChargeId(selectedFee.id)
                const selectedMember = referenceData.players.find((player) =>
                    player.id === selectedFee.playerId &&
                    player.seasonId === selectedFee.seasonId &&
                    player.teamId === selectedFee.teamId,
                ) ?? null
                setPaymentPlayerId(selectedMember ? paymentPlayerSelectionValue(selectedMember) : '')
                setPaymentAmount(selectedFee.outstandingAmount.toFixed(2))
            }
        } catch (caughtError) {
            console.error(caughtError)
            // Recording money must remain available even if the fee list cannot
            // be refreshed. The payment can be matched later if necessary.
            setPaymentPurpose(charge ? 'existing_fee' : '')
            setError(
                'The latest fee list could not be loaded. You can still record the payment and match it later.',
            )
        } finally {
            setPaymentOptionsLoading(false)
        }
    }

    async function savePayment(): Promise<void> {
        if (!organisationId) return

        const player = paymentPlayers.find(
            (item) => paymentPlayerSelectionValue(item) === paymentPlayerId,
        )
        if (!player) {
            setError('Select the player or member this payment is for.')
            return
        }

        const amount = Number(paymentAmount)
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Enter a valid payment amount.')
            return
        }

        if (!paymentDate) {
            setError('Select the date the payment was received.')
            return
        }

        if (!paymentPurpose) {
            setError('Select what this payment is for.')
            return
        }

        const configuredRule = paymentFeeRules.find(
            (rule) => rule.active && rule.canonicalType === paymentPurpose,
        ) ?? null

        if (
            (paymentPurpose === 'sign_on' ||
                paymentPurpose === 'monthly_fee' ||
                paymentPurpose === 'matchday_sub') &&
            !configuredRule
        ) {
            setError(
                'This payment type is not configured for the player’s team. Add the team payment rule first, or choose Other payment / match later.',
            )
            return
        }

        if (paymentPurpose === 'existing_fee' && !paymentChargeId) {
            setError('Select the unpaid fee, or choose another payment purpose.')
            return
        }

        if (paymentPurpose === 'monthly_fee' && !paymentBillingMonth) {
            setError('Select the month this payment is for.')
            return
        }

        if (paymentPurpose === 'matchday_sub' && !paymentFixtureId) {
            setError('Select the match this payment relates to.')
            return
        }

        if (paymentPurpose === 'custom' && !paymentDescription.trim()) {
            setError('Enter a short description of what this payment is for.')
            return
        }

        try {
            setSaving(true)
            setError(null)

            let chargeToAllocate: ClubFinanceCharge | null = null
            let createdChargeId: string | null = null
            let matchingIssue: string | null = null
            let purposeNote = paymentPurposeLabel(paymentPurpose)

            const expectedInput = Number(paymentExpectedAmount)
            const expectedAmount =
                Number.isFinite(expectedInput) && expectedInput > 0
                    ? expectedInput
                    : configuredRule?.amount ?? amount

            try {
                if (paymentPurpose === 'existing_fee') {
                    chargeToAllocate = charges.find(
                        (charge) =>
                            charge.id === paymentChargeId &&
                            charge.playerId === player.id &&
                            charge.outstandingAmount > 0,
                    ) ?? null

                    if (!chargeToAllocate) {
                        matchingIssue = 'The selected fee is no longer outstanding.'
                    } else {
                        purposeNote = chargeToAllocate.description ||
                            chargeTypeLabel(chargeToAllocate.chargeType)
                    }
                }

                if (paymentPurpose === 'sign_on') {
                    const existingSigningFee = charges.find(
                        (charge) =>
                            charge.playerId === player.id &&
                            charge.seasonId === player.seasonId &&
                            charge.teamId === player.teamId &&
                            charge.chargeType === 'sign_on',
                    ) ?? null
                    chargeToAllocate = existingSigningFee && existingSigningFee.outstandingAmount > 0
                        ? existingSigningFee
                        : null

                    if (existingSigningFee && existingSigningFee.outstandingAmount <= 0) {
                        matchingIssue = 'The existing signing-on fee is already fully paid.'
                    } else if (!chargeToAllocate) {
                        const season = referenceData.seasons.find(
                            (item) => item.id === player.seasonId,
                        )
                        createdChargeId = await clubFinanceService.createCharge({
                            organisationId,
                            seasonId: player.seasonId,
                            teamId: player.teamId,
                            playerId: player.id,
                            squadMemberId: player.squadMemberId,
                            feeRuleId: configuredRule?.id ?? null,
                            chargeTypeId: referenceData.chargeTypes.find(
                                (item) => item.canonicalType === 'sign_on',
                            )?.id ?? null,
                            chargeType: 'sign_on',
                            description: `Signing-on / season dues — ${season?.label ?? season?.name ?? 'season'}`,
                            amountDue: expectedAmount,
                            dueDate: season?.startDate ?? paymentDate,
                        })
                    }
                }

                if (paymentPurpose === 'monthly_fee') {
                    const billingPeriod = billingPeriodDate(paymentBillingMonth)
                    const existingMonthlyFee = charges.find(
                        (charge) =>
                            charge.playerId === player.id &&
                            charge.seasonId === player.seasonId &&
                            charge.teamId === player.teamId &&
                            charge.chargeType === 'monthly_fee' &&
                            charge.billingPeriod?.slice(0, 7) === paymentBillingMonth,
                    ) ?? null
                    chargeToAllocate = existingMonthlyFee && existingMonthlyFee.outstandingAmount > 0
                        ? existingMonthlyFee
                        : null

                    if (existingMonthlyFee && existingMonthlyFee.outstandingAmount <= 0) {
                        matchingIssue = `The ${monthLabel(paymentBillingMonth)} monthly dues are already fully paid.`
                    } else if (!chargeToAllocate) {
                        createdChargeId = await clubFinanceService.createCharge({
                            organisationId,
                            seasonId: player.seasonId,
                            teamId: player.teamId,
                            playerId: player.id,
                            squadMemberId: player.squadMemberId,
                            feeRuleId: configuredRule?.id ?? null,
                            chargeTypeId: referenceData.chargeTypes.find(
                                (item) => item.canonicalType === 'monthly_fee',
                            )?.id ?? null,
                            chargeType: 'monthly_fee',
                            billingPeriod,
                            description: `Monthly dues — ${monthLabel(paymentBillingMonth)}`,
                            amountDue: expectedAmount,
                            dueDate: dueDateForMonth(
                                paymentBillingMonth,
                                configuredRule?.dueDay ?? paymentPolicy?.monthlyDueDay ?? 1,
                            ),
                        })
                    }
                    purposeNote = `Monthly dues — ${monthLabel(paymentBillingMonth)}`
                }

                if (paymentPurpose === 'matchday_sub') {
                    const fixture = paymentFixtures.find(
                        (item) => item.id === paymentFixtureId,
                    )
                    if (!fixture) {
                        matchingIssue = 'The selected match could not be found.'
                    } else {
                        const existingMatchdayFee = charges.find(
                            (charge) =>
                                charge.playerId === player.id &&
                                charge.fixtureId === fixture.id &&
                                charge.chargeType === 'matchday_sub',
                        ) ?? null
                        chargeToAllocate = existingMatchdayFee && existingMatchdayFee.outstandingAmount > 0
                            ? existingMatchdayFee
                            : null

                        if (existingMatchdayFee && existingMatchdayFee.outstandingAmount <= 0) {
                            matchingIssue = 'The matchday fee for this fixture is already fully paid.'
                        } else if (!chargeToAllocate) {
                            createdChargeId = await clubFinanceService.createCharge({
                                organisationId,
                                seasonId: player.seasonId,
                                teamId: player.teamId,
                                playerId: player.id,
                                squadMemberId: player.squadMemberId,
                                feeRuleId: configuredRule?.id ?? null,
                                fixtureId: fixture.id,
                                chargeTypeId: referenceData.chargeTypes.find(
                                    (item) => item.canonicalType === 'matchday_sub',
                                )?.id ?? null,
                                chargeType: 'matchday_sub',
                                description: `Matchday subs — ${fixturePaymentLabel(fixture)}`,
                                amountDue: expectedAmount,
                                dueDate: fixture.fixtureDate,
                            })
                        }
                        purposeNote = `Matchday subs — ${fixturePaymentLabel(fixture)}`
                    }
                }

                if (paymentPurpose === 'custom') {
                    createdChargeId = await clubFinanceService.createCharge({
                        organisationId,
                        seasonId: player.seasonId,
                        teamId: player.teamId,
                        playerId: player.id,
                        squadMemberId: player.squadMemberId,
                        chargeTypeId: referenceData.chargeTypes.find(
                            (item) => item.canonicalType === 'custom',
                        )?.id ?? null,
                        chargeType: 'custom',
                        description: paymentDescription.trim(),
                        amountDue: amount,
                        dueDate: paymentDate,
                    })
                    purposeNote = paymentDescription.trim()
                }
            } catch (matchingError) {
                console.error(
                    'Payment fee matching could not be completed; recording payment for later matching:',
                    matchingError,
                )
                matchingIssue =
                    'TournamentHQ could not automatically create or match the fee.'
                chargeToAllocate = null
                createdChargeId = null
            }

            let allocationChargeId: string | null = null
            let allocationAmount = 0

            if (chargeToAllocate) {
                allocationChargeId = chargeToAllocate.id
                allocationAmount = Math.min(
                    amount,
                    chargeToAllocate.outstandingAmount,
                )
            } else if (createdChargeId) {
                allocationChargeId = createdChargeId
                allocationAmount = Math.min(amount, expectedAmount)
            }

            const unallocatedAmount = Math.max(0, amount - allocationAmount)
            const notes = [
                `Payment for: ${purposeNote}`,
                paymentPurpose === 'match_later'
                    ? 'Matching: needs review'
                    : null,
                matchingIssue
                    ? `Matching note: ${matchingIssue}`
                    : null,
            ].filter((value): value is string => Boolean(value)).join('\n')

            await clubFinanceService.recordPayment({
                organisationId,
                seasonId: player.seasonId,
                teamId: player.teamId,
                playerId: player.id,
                amount,
                paymentDate,
                method: paymentMethod as
                    | 'cash'
                    | 'bank_transfer'
                    | 'card'
                    | 'direct_debit'
                    | 'standing_order'
                    | 'other',
                status: 'cleared',
                paymentReference: paymentReference.trim() || null,
                notes,
                allocations: allocationChargeId && allocationAmount > 0
                    ? [{ chargeId: allocationChargeId, amount: allocationAmount }]
                    : [],
            })

            if (unallocatedAmount > 0 || !allocationChargeId) {
                setNotice(
                    allocationAmount > 0
                        ? `Payment recorded. ${money(allocationAmount, currency)} was matched and ${money(unallocatedAmount, currency)} is waiting to be matched.`
                        : 'Payment recorded successfully. It is waiting to be matched to a fee.',
                )
            } else {
                setNotice('Payment recorded and matched successfully.')
            }

            setModal(null)
            await loadCore(true)
            if (tab === 'charges' || tab === 'payments') {
                await loadTabData()
            }
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to record payment.',
            )
        } finally {
            setSaving(false)
        }
    }

    async function openMatchPayment(
        payment: ClubFinancePayment,
    ): Promise<void> {
        if (!organisationId || payment.unallocatedAmount <= 0) return

        setMatchingPayment(payment)
        setMatchChargeId('')
        setMatchAmount(payment.unallocatedAmount.toFixed(2))
        setMatchCharges([])
        setError(null)
        setModal('match_payment')
        setMatchOptionsLoading(true)

        try {
            const availableFees = await clubFinanceService.getCharges(
                organisationId,
                payment.seasonId,
                payment.teamId,
            )

            setMatchCharges(
                availableFees.filter(
                    (charge) =>
                        charge.outstandingAmount > 0 &&
                        (!payment.playerId || charge.playerId === payment.playerId),
                ),
            )
        } catch (caughtError) {
            console.error(caughtError)
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to load unpaid fees for matching.',
            )
        } finally {
            setMatchOptionsLoading(false)
        }
    }

    async function savePaymentMatch(): Promise<void> {
        if (!organisationId || !matchingPayment) return

        const charge = matchCharges.find(
            (item) => item.id === matchChargeId,
        )
        if (!charge) {
            setError('Select the fee this payment should be matched to.')
            return
        }

        const amount = Number(matchAmount)
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Enter a valid amount to match.')
            return
        }

        const maximum = Math.min(
            matchingPayment.unallocatedAmount,
            charge.outstandingAmount,
        )
        if (amount > maximum) {
            setError(
                `You can match up to ${money(maximum, matchingPayment.currency)} to this fee.`,
            )
            return
        }

        try {
            setSaving(true)
            setError(null)

            await clubFinanceService.matchPayment({
                organisationId,
                paymentId: matchingPayment.id,
                teamId: matchingPayment.teamId,
                chargeId: charge.id,
                amount,
            })

            const remaining = Math.max(
                0,
                matchingPayment.unallocatedAmount - amount,
            )
            setNotice(
                remaining > 0
                    ? `${money(amount, matchingPayment.currency)} matched successfully. ${money(remaining, matchingPayment.currency)} is still waiting to be matched.`
                    : 'Payment matched successfully.',
            )
            setModal(null)
            setMatchingPayment(null)
            setMatchCharges([])
            setMatchChargeId('')
            setMatchAmount('')

            await loadCore(true)
            if (tab === 'payments' || tab === 'charges') {
                await loadTabData()
            }
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to match this payment.',
            )
        } finally {
            setSaving(false)
        }
    }

    async function saveExpense(): Promise<void> {
        if (!organisationId || !expenseDescription.trim()) {
            setError('Expense description is required.')
            return
        }
        const amount = Number(expenseAmount)
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Enter a valid expense amount.')
            return
        }

        try {
            setSaving(true)
            setError(null)
            let receiptPath: string | null = null

            if (expenseReceiptFile) {
                receiptPath = await clubFinanceService.uploadExpenseReceipt(
                    organisationId,
                    expenseReceiptFile,
                )
            }

            try {
                await clubFinanceService.createExpense({
                    organisationId,
                    seasonId: selectedSeasonId,
                    teamId: expenseTeamId || null,
                    categoryId: expenseCategoryId || null,
                    supplierName: expenseSupplier.trim() || null,
                    description: expenseDescription.trim(),
                    amount,
                    expenseDate,
                    status: 'paid',
                    paymentMethod: 'bank_transfer',
                    receiptPath,
                    currency,
                })
            } catch (expenseError) {
                if (receiptPath) {
                    try {
                        await clubFinanceService.deleteExpenseReceipt(
                            receiptPath,
                        )
                    } catch (cleanupError) {
                        console.error(
                            'Failed to clean up receipt after expense failure:',
                            cleanupError,
                        )
                    }
                }
                throw expenseError
            }
            setNotice('Expense logged successfully.')
            setModal(null)
            setExpenseSupplier('')
            setExpenseDescription('')
            setExpenseAmount('')
            setExpenseReceiptFile(null)
            await loadCore(true)
            if (tab === 'expenses' || tab === 'receipts') await loadTabData()
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to log expense.',
            )
        } finally {
            setSaving(false)
        }
    }

    async function saveIncome(): Promise<void> {
        if (!organisationId || !incomeSource.trim()) {
            setError('Income source is required.')
            return
        }
        const expected = Number(incomeExpected)
        const received = Number(incomeReceived || '0')
        if (!Number.isFinite(expected) || expected < 0 ||
            !Number.isFinite(received) || received < 0) {
            setError('Enter valid income amounts.')
            return
        }

        try {
            setSaving(true)
            setError(null)
            await clubFinanceService.createIncome({
                organisationId,
                seasonId: selectedSeasonId,
                teamId: incomeTeamId || null,
                categoryId: incomeCategoryId || null,
                sourceName: incomeSource.trim(),
                description: incomeDescription.trim() || null,
                amountExpected: expected,
                amountReceived: received,
                incomeDate,
                currency,
            })
            setNotice('Income recorded successfully.')
            setModal(null)
            setIncomeSource('')
            setIncomeDescription('')
            setIncomeExpected('')
            setIncomeReceived('')
            await loadCore(true)
            if (tab === 'income') await loadTabData()
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to record income.',
            )
        } finally {
            setSaving(false)
        }
    }

    function openFeeRule(rule?: ClubFinanceFeeRule): void {
        setEditingFeeRuleId(rule?.id ?? null)
        setChargeSeasonId(
            rule?.seasonId ??
            selectedSeasonId ??
            referenceData.seasons[0]?.id ??
            '',
        )
        setChargeTeamIds(
            rule?.teamId
                ? [rule.teamId]
                : selectedTeamId
                  ? [selectedTeamId]
                  : [],
        )
        setFeeRuleKind(
            rule?.canonicalType === 'matchday_sub'
                ? 'match_sub'
                : rule
                  ? 'dues'
                  : '',
        )
        setFeeRuleFrequency(
            rule?.frequency === 'once_per_season'
                ? 'once_per_season'
                : 'monthly',
        )
        setFeeRuleDueDay(rule?.dueDay ?? 1)
        setChargeAmount(rule ? rule.amount.toFixed(2) : '')
        setChargeDescription(rule?.description ?? '')
        setError(null)
        setModal('charge')
    }

    function openRemoveFeeRule(rule: ClubFinanceFeeRule): void {
        setRemovingFeeRule(rule)
        setRemoveRuleUnpaidCharges(false)
        setError(null)
        setModal('remove_rule')
    }

    async function removeFeeRule(): Promise<void> {
        if (!organisationId || !removingFeeRule) return

        try {
            setSaving(true)
            setError(null)

            const result = await clubFinanceService.removeFeeRule({
                organisationId,
                ruleId: removingFeeRule.id,
                removeUnpaidCharges: removeRuleUnpaidCharges,
            })

            const cleanupText = removeRuleUnpaidCharges
                ? result.removedUnpaidCharges > 0
                    ? ` ${result.removedUnpaidCharges} unpaid member fee${result.removedUnpaidCharges === 1 ? '' : 's'} created by this rule ${result.removedUnpaidCharges === 1 ? 'was' : 'were'} also removed.`
                    : ' No unpaid member fees were removed.'
                : ''
            const preservedText = result.preservedCharges > 0
                ? ` ${result.preservedCharges} existing fee record${result.preservedCharges === 1 ? '' : 's'} ${result.preservedCharges === 1 ? 'was' : 'were'} kept for financial history.`
                : ''

            setNotice(`“${removingFeeRule.name}” has been removed and will no longer create new fees.${cleanupText}${preservedText}`)
            setModal(null)
            setRemovingFeeRule(null)
            setRemoveRuleUnpaidCharges(false)

            await loadCore(true)
            if (tab === 'charges') await loadTabData()
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to remove this payment rule.',
            )
        } finally {
            setSaving(false)
        }
    }

    async function saveCharge(): Promise<void> {
        if (!organisationId) return

        if (!chargeSeasonId || chargeTeamIds.length === 0) {
            setError('Select the season and at least one team this rule applies to.')
            return
        }
        if (!feeRuleKind) {
            setError('Select what you want to add.')
            return
        }

        const amount = Number(chargeAmount)
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Enter an amount greater than zero.')
            return
        }

        if (
            feeRuleKind === 'dues' &&
            feeRuleFrequency === 'monthly' &&
            (feeRuleDueDay < 1 || feeRuleDueDay > 28)
        ) {
            setError('Choose a monthly due day between 1 and 28.')
            return
        }

        const canonicalType =
            feeRuleKind === 'match_sub'
                ? 'matchday_sub'
                : feeRuleFrequency === 'monthly'
                  ? 'monthly_fee'
                  : 'sign_on'

        const frequency =
            canonicalType === 'matchday_sub'
                ? 'per_fixture'
                : canonicalType === 'monthly_fee'
                  ? 'monthly'
                  : 'once_per_season'

        const ruleName =
            canonicalType === 'matchday_sub'
                ? 'Match subs'
                : canonicalType === 'monthly_fee'
                  ? 'Monthly dues'
                  : 'Season / signing-on dues'

        try {
            setSaving(true)
            setError(null)

            const results = await Promise.all(
                chargeTeamIds.map((teamId) =>
                    clubFinanceService.saveFeeRule({
                        organisationId,
                        seasonId: chargeSeasonId,
                        teamId,
                        canonicalType,
                        frequency,
                        amount,
                        dueDay:
                            canonicalType === 'monthly_fee'
                                ? feeRuleDueDay
                                : null,
                        name: ruleName,
                        description: chargeDescription.trim() || null,
                        active: true,
                        autoApply: canonicalType !== 'matchday_sub',
                    }),
                ),
            )
            const createdCount = results.reduce(
                (total, result) => total + result.createdCount,
                0,
            )

            setNotice(
                createdCount > 0
                    ? `${ruleName} saved for ${chargeTeamIds.length} team${chargeTeamIds.length === 1 ? '' : 's'}. ${createdCount} member fee${createdCount === 1 ? '' : 's'} added automatically.`
                    : `${ruleName} saved for ${chargeTeamIds.length} team${chargeTeamIds.length === 1 ? '' : 's'}.`,
            )
            setModal(null)
            setEditingFeeRuleId(null)
            setChargeTeamIds([])
            setFeeRuleKind('')
            setChargeAmount('')
            setChargeDescription('')

            await loadCore(true)
            if (tab === 'charges') await loadTabData()
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to save this team fee rule.',
            )
        } finally {
            setSaving(false)
        }
    }

    async function openLedger(playerId: string): Promise<void> {
        if (!organisationId) return
        try {
            setSaving(true)
            setError(null)
            setLedgerPlayerId(playerId)
            setModal('ledger')
            setLedger(await clubFinanceService.getMemberLedger(
                organisationId,
                playerId,
                selectedSeasonId,
            ))
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to load member ledger.',
            )
        } finally {
            setSaving(false)
        }
    }

    async function runReport(): Promise<void> {
        if (!organisationId) return
        try {
            setSaving(true)
            setError(null)
            setReport(await clubFinanceService.getReport(
                organisationId,
                {
                    seasonId: selectedSeasonId,
                    teamId: selectedTeamId,
                    fromDate: reportFromDate || null,
                    toDate: reportToDate || null,
                },
            ))
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to generate finance report.',
            )
        } finally {
            setSaving(false)
        }
    }

    async function openReceipt(expense: ClubFinanceExpense): Promise<void> {
        if (!expense.receiptPath) return

        const receiptWindow = window.open('about:blank', '_blank')
        if (receiptWindow) {
            receiptWindow.opener = null
        }

        try {
            setReceiptOpeningId(expense.id)
            setError(null)
            const receiptUrl = await clubFinanceService.getExpenseReceiptUrl(
                expense.receiptPath,
            )

            if (receiptWindow) {
                receiptWindow.location.replace(receiptUrl)
            } else {
                window.location.assign(receiptUrl)
            }
        } catch (caughtError) {
            receiptWindow?.close()
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to open this receipt.',
            )
        } finally {
            setReceiptOpeningId(null)
        }
    }

    function submitModal(): void {
        if (modal === 'payment') {
            void savePayment()
            return
        }
        if (modal === 'match_payment') {
            void savePaymentMatch()
            return
        }
        if (modal === 'expense') {
            void saveExpense()
            return
        }
        if (modal === 'income') {
            void saveIncome()
            return
        }
        if (modal === 'charge') {
            void saveCharge()
            return
        }
        if (modal === 'remove_rule') {
            void removeFeeRule()
        }
    }

    const modalPrimaryTitle =
        modal === 'payment'
            ? 'Record payment'
            : modal === 'match_payment'
              ? 'Match payment'
              : modal === 'expense'
              ? 'Log expense'
              : modal === 'income'
                ? 'Record income'
                : modal === 'charge'
                  ? 'Save rule'
                  : modal === 'remove_rule'
                    ? 'Remove rule'
                    : ''

    const receiptExpenses = expenses.filter((expense) => Boolean(expense.receiptPath))

    if (!currentOrganisation) {
        return null
    }

    if (loading) {
        return (
            <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-white/10 bg-[#071009]">
                <div className="text-center">
                    <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#8cf566]" />
                    <p className="mt-3 text-sm font-semibold text-slate-300">
                        Loading Club Finance...
                    </p>
                </div>
            </div>
        )
    }

    const summary = dashboard?.summary
    const maxTrend = Math.max(
        1,
        ...(dashboard?.trend ?? []).flatMap((point) => [
            point.total_income,
            point.expenses,
        ]),
    )

    const intelligence = summary
        ? [
            summary.overdueTotal > 0
                ? `${money(summary.overdueTotal, currency)} is overdue across ${summary.overdueMembers} member${summary.overdueMembers === 1 ? '' : 's'}.`
                : 'There are currently no overdue member balances.',
            summary.collectionRate >= 90
                ? `Collection performance is strong at ${summary.collectionRate.toFixed(1)}%.`
                : `Collection performance is ${summary.collectionRate.toFixed(1)}%; review outstanding balances and reminder activity.`,
            summary.expensesThisMonth > summary.incomeThisMonth
                ? `This month is running at a ${money(summary.expensesThisMonth - summary.incomeThisMonth, currency)} operating deficit before other expected income.`
                : `This month is running at a ${money(summary.incomeThisMonth - summary.expensesThisMonth, currency)} positive operating margin.`,
            summary.unallocatedPayments > 0
                ? `${money(summary.unallocatedPayments, currency)} of recorded payments has not yet been matched to a player or member fee.`
                : 'All recorded member payments are matched to the correct fees.',
        ]
        : []

    return (
        <div className="space-y-5" style={{ fontFamily: "'Inter', Arial, sans-serif" }}>
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#08120c] shadow-2xl shadow-black/20">
                <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(140,245,102,0.14),transparent_35%)] px-5 py-6 lg:px-7">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#8cf566]">
                                <Banknote className="h-4 w-4" />
                                Club Finance
                            </div>
                            <h2
                                className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl"
                                style={{ fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }}
                            >
                                {currentOrganisation.name} Finance
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                                Track player fees, payments, income, expenses and member balances across your club and teams.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {canCollectPayments && (
                                <button
                                    type="button"
                                    onClick={() => void openPayment(null)}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#8cf566] px-4 text-sm font-black text-[#061008]"
                                >
                                    <CreditCard className="h-4 w-4" />
                                    Record payment
                                </button>
                            )}
                            {fullFinanceAccess && (
                                <button
                                    type="button"
                                    onClick={() => setModal('expense')}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white hover:bg-white/10"
                                >
                                    <ReceiptText className="h-4 w-4" />
                                    Log expense
                                </button>
                            )}
                            <button
                                type="button"
                                disabled={refreshing}
                                onClick={() => void loadCore(true)}
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-50"
                            >
                                <RefreshCw className={classNames('h-4 w-4', refreshing && 'animate-spin')} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 border-b border-white/10 px-5 py-4 lg:grid-cols-2 lg:px-7">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Season
                        <select
                            value={selectedSeasonId ?? ''}
                            onChange={(event) => {
                                setSelectedSeasonId(event.target.value || null)
                                setSelectedTeamId(null)
                            }}
                            className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#050d08] px-3 text-sm font-semibold text-white outline-none focus:border-[#8cf566]/60"
                        >
                            <option value="">All seasons</option>
                            {referenceData.seasons.map((season) => (
                                <option key={season.id} value={season.id}>
                                    {season.label} {season.status === 'active' ? '• Active' : ''}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Team
                        <select
                            value={selectedTeamId ?? ''}
                            onChange={(event) => setSelectedTeamId(event.target.value || null)}
                            className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#050d08] px-3 text-sm font-semibold text-white outline-none focus:border-[#8cf566]/60"
                        >
                            <option value="">Club-wide</option>
                            {availableTeams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}{team.ageGroup ? ` • ${team.ageGroup}` : ''}
                                </option>
                            ))}
                        </select>
                    </label>

                </div>

                <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:px-5">
                    {([
                        ['overview', 'Overview'],
                        ['charges', 'Fees & Dues'],
                        ['payments', 'Payments'],
                        ['income', 'Income'],
                        ['expenses', 'Expenses'],
                        ['receipts', 'Receipts'],
                        ['reports', 'Reports'],
                        ['intelligence', 'AI Finance'],
                    ] as const)
                        .filter(([value]) =>
                            fullFinanceAccess ||
                            !(
                                value === 'income' ||
                                value === 'expenses' ||
                                value === 'receipts' ||
                                value === 'reports'
                            ),
                        )
                        .map(([value, title]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setTab(value)}
                            className={classNames(
                                'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-black transition',
                                tab === value
                                    ? 'bg-[#8cf566] text-[#061008]'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white',
                            )}
                        >
                            {title}
                        </button>
                    ))}
                </nav>
            </section>

            {notice && (
                <div className="flex items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                    <span className="flex items-center gap-2">
                        <CircleCheck className="h-4 w-4" />
                        {notice}
                    </span>
                    <button type="button" onClick={() => setNotice(null)}>
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-100">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {tab === 'overview' && summary && (
                <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[
                            {
                                title: 'Fees collected',
                                value: money(summary.totalCollected, currency),
                                detail: selectedTeamId
                                    ? 'Player fees collected for this team'
                                    : 'Player fees collected in the selected season',
                                icon: WalletCards,
                            },
                            {
                                title: 'Income this month',
                                value: money(summary.incomeThisMonth, currency),
                                detail: `Collection rate ${summary.collectionRate.toFixed(1)}%`,
                                icon: TrendingUp,
                            },
                            {
                                title: 'Expenses this month',
                                value: money(summary.expensesThisMonth, currency),
                                detail: 'Club and team expenditure',
                                icon: TrendingDown,
                            },
                            {
                                title: 'Outstanding',
                                value: money(summary.outstandingTotal, currency),
                                detail: `${summary.membersOwing} member${summary.membersOwing === 1 ? '' : 's'} owing`,
                                icon: HandCoins,
                            },
                        ].map((card) => (
                            <article key={card.title} className="rounded-2xl border border-white/10 bg-[#08120c] p-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                        {card.title}
                                    </span>
                                    <card.icon className="h-5 w-5 text-[#8cf566]" />
                                </div>
                                <div className="mt-3 text-2xl font-black text-white">
                                    {card.value}
                                </div>
                                <p className="mt-2 text-xs text-slate-400">
                                    {card.detail}
                                </p>
                            </article>
                        ))}
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                        <section className="rounded-2xl border border-white/10 bg-[#08120c] p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8cf566]">
                                        Collections
                                    </p>
                                    <h3 className="mt-1 text-lg font-black text-white">
                                        Players / members owing
                                    </h3>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <span className="rounded-lg bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                                        Overdue {money(summary.overdueTotal, currency)}
                                    </span>
                                    {overdueCommunicationStats.total > 0 && (
                                        <span
                                            className="rounded-lg border border-sky-300/10 bg-sky-300/5 px-3 py-1 text-xs font-bold text-sky-200"
                                            title={`${overdueCommunicationStats.email} with email · ${overdueCommunicationStats.mobile} with mobile · ${overdueCommunicationStats.missingContact} without contact details`}
                                        >
                                            Contactable {overdueCommunicationStats.contactable}/{overdueCommunicationStats.total}
                                        </span>
                                    )}
                                    {fullFinanceAccess && overdueCommunicationStats.total > 0 && (
                                        <button
                                            type="button"
                                            onClick={openAllOverdueReminders}
                                            disabled={overdueCommunicationStats.contactable === 0}
                                            className="inline-flex items-center gap-2 rounded-lg border border-[#8cf566]/25 bg-[#8cf566]/10 px-3 py-1.5 text-xs font-black text-[#8cf566] transition hover:bg-[#8cf566]/15 disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            <BellRing className="h-3.5 w-3.5" />
                                            Remind all overdue ({overdueCommunicationStats.total})
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="pb-3 pr-4">Member</th>
                                            <th className="pb-3 pr-4">Fee</th>
                                            <th className="pb-3 pr-4">Due</th>
                                            <th className="pb-3 pr-4">Outstanding</th>
                                            <th className="pb-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {dashboard.owing.slice(0, 8).map((item) => (
                                            <tr key={item.id}>
                                                <td className="py-3 pr-4 font-bold text-white">
                                                    {fullFinanceAccess ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => void openLedger(item.playerId)}
                                                            className="hover:text-[#8cf566]"
                                                        >
                                                            {item.playerName}
                                                        </button>
                                                    ) : item.playerName}
                                                </td>
                                                <td className="py-3 pr-4 text-slate-300">
                                                    {chargeTypeLabel(item.chargeType)}
                                                </td>
                                                <td className={classNames('py-3 pr-4', item.overdue ? 'font-bold text-red-300' : 'text-slate-400')}>
                                                    {shortDate(item.dueDate)}
                                                </td>
                                                <td className="py-3 pr-4 font-black text-white">
                                                    {money(item.outstandingAmount, currency)}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                                        {fullFinanceAccess && (
                                                            hasCommunicationContact(item.playerId) ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openFinanceReminder(item)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-xs font-black text-sky-200 transition hover:bg-sky-300/15"
                                                                >
                                                                    <MessageSquareText className="h-3.5 w-3.5" />
                                                                    Notify
                                                                </button>
                                                            ) : (
                                                                <span
                                                                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-500"
                                                                    title="Add an email address or mobile number to this member before sending a reminder."
                                                                >
                                                                    No contact
                                                                </span>
                                                            )
                                                        )}
                                                        {canCollectPayments && (
                                                            <button
                                                                type="button"
                                                                onClick={() => void openPayment({
                                                                    ...item,
                                                                    organisationId: organisationId ?? '',
                                                                    seasonId: selectedSeasonId ?? '',
                                                                    teamId: selectedTeamId ?? '',
                                                                    squadMemberId: null,
                                                                    fixtureId: null,
                                                                    matchEventId: null,
                                                                    payerId: null,
                                                                    chargeTypeId: null,
                                                                    feeRuleId: null,
                                                                    billingPeriod: null,
                                                                    currency,
                                                                    createdAt: '',
                                                                })}
                                                                className="rounded-lg border border-[#8cf566]/20 bg-[#8cf566]/10 px-3 py-1.5 text-xs font-black text-[#8cf566]"
                                                            >
                                                                Record payment
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {dashboard.owing.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-10 text-center text-slate-500">
                                                    No outstanding member balances.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-white/10 bg-[#08120c] p-5">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8cf566]">
                                Recent expenditure
                            </p>
                            <h3 className="mt-1 text-lg font-black text-white">
                                Latest expenses
                            </h3>
                            <div className="mt-4 space-y-3">
                                {dashboard.recentExpenses.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-white/5 bg-black/20 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-bold text-white">
                                                    {item.description}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {item.categoryName ?? 'Uncategorised'} • {shortDate(item.expenseDate)}
                                                </p>
                                            </div>
                                            <span className="font-black text-white">
                                                {money(item.amount + item.taxAmount, currency)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {dashboard.recentExpenses.length === 0 && (
                                    <p className="py-8 text-center text-sm text-slate-500">
                                        No expenses recorded yet.
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>

                    <section className="rounded-2xl border border-white/10 bg-[#08120c] p-5">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-[#8cf566]" />
                            <h3 className="text-lg font-black text-white">
                                Income vs expenses — last 6 months
                            </h3>
                        </div>
                        <div className="mt-6 grid grid-cols-6 gap-3">
                            {(dashboard.trend ?? []).map((point) => (
                                <div key={point.month_start} className="min-w-0">
                                    <div className="flex h-44 items-end justify-center gap-1 rounded-xl bg-black/20 px-2 py-3">
                                        <div
                                            title={`Income ${money(point.total_income, currency)}`}
                                            className="w-3 rounded-t bg-[#8cf566]"
                                            style={{ height: `${Math.max(3, (point.total_income / maxTrend) * 100)}%` }}
                                        />
                                        <div
                                            title={`Expenses ${money(point.expenses, currency)}`}
                                            className="w-3 rounded-t bg-amber-300"
                                            style={{ height: `${Math.max(3, (point.expenses / maxTrend) * 100)}%` }}
                                        />
                                    </div>
                                    <p className="mt-2 truncate text-center text-xs font-bold text-slate-500">
                                        {new Date(`${point.month_start}T12:00:00`).toLocaleDateString('en-GB', { month: 'short' })}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 flex gap-4 text-xs font-bold text-slate-400">
                            <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#8cf566]" /> Income</span>
                            <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-amber-300" /> Expenses</span>
                        </div>
                    </section>
                </div>
            )}

            {tab === 'charges' && (
                <section className="rounded-2xl border border-white/10 bg-[#08120c] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8cf566]">Collections ledger</p>
                            <h3 className="mt-1 text-xl font-black text-white">Member fees & dues</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <label className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search fees..."
                                    className="min-h-10 rounded-xl border border-white/10 bg-[#050d08] pl-9 pr-3 text-sm text-white"
                                />
                            </label>
                            {fullFinanceAccess && (
                                <button
                                    type="button"
                                    onClick={() => openFeeRule()}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#8cf566] px-4 text-sm font-black text-[#061008]"
                                >
                                    <Plus className="h-4 w-4" /> Add
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Team payment rules</p>
                                <p className="mt-1 text-sm text-slate-400">Set the standard dues and match subs for each team. Member balances are created from these rules automatically.</p>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            {feeRules.filter((rule) => rule.active).map((rule) => {
                                const teamName = referenceData.teams.find((team) => team.id === rule.teamId)?.name ?? 'Team'
                                const frequency = rule.frequency === 'monthly'
                                    ? `Monthly • due day ${rule.dueDay ?? 1}`
                                    : rule.frequency === 'once_per_season'
                                      ? 'Once per season'
                                      : 'Per fixture'

                                return (
                                    <article key={rule.id} className="rounded-xl border border-white/10 bg-[#050d08] p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-black text-white">{rule.name}</p>
                                                <p className="mt-1 text-xs text-slate-500">{teamName} • {frequency}</p>
                                            </div>
                                            <p className="text-lg font-black text-[#8cf566]">{money(rule.amount, currency)}</p>
                                        </div>
                                        {rule.description && <p className="mt-3 text-xs leading-5 text-slate-400">{rule.description}</p>}
                                        {fullFinanceAccess && (
                                            <div className="mt-3 flex flex-wrap items-center gap-4">
                                                <button type="button" onClick={() => openFeeRule(rule)} className="text-xs font-black text-[#8cf566] hover:text-[#b7ff9c]">
                                                    Edit rule
                                                </button>
                                                <button type="button" onClick={() => openRemoveFeeRule(rule)} className="inline-flex items-center gap-1.5 text-xs font-black text-red-300 hover:text-red-200">
                                                    <Trash2 className="h-3.5 w-3.5" /> Remove rule
                                                </button>
                                            </div>
                                        )}
                                    </article>
                                )
                            })}
                            {feeRules.filter((rule) => rule.active).length === 0 && (
                                <div className="lg:col-span-2 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
                                    No team payment rules are configured for this selection. Use <strong className="text-slate-300">+ Add</strong> to set monthly/season dues or match subs.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="pb-3 pr-4">Member</th>
                                    <th className="pb-3 pr-4">Type</th>
                                    <th className="pb-3 pr-4">Due</th>
                                    <th className="pb-3 pr-4">Amount due</th>
                                    <th className="pb-3 pr-4">Paid</th>
                                    <th className="pb-3 pr-4">Outstanding</th>
                                    <th className="pb-3 pr-4">Status</th>
                                    <th className="pb-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredCharges.map((charge) => (
                                    <tr key={charge.id}>
                                        <td className="py-3 pr-4 font-bold text-white">
                                            {fullFinanceAccess ? (
                                                <button type="button" onClick={() => void openLedger(charge.playerId)} className="hover:text-[#8cf566]">
                                                    {charge.playerName}
                                                </button>
                                            ) : charge.playerName}
                                        </td>
                                        <td className="py-3 pr-4 text-slate-300">{chargeTypeLabel(charge.chargeType)}</td>
                                        <td className="py-3 pr-4 text-slate-400">{shortDate(charge.dueDate)}</td>
                                        <td className="py-3 pr-4 text-slate-300">{money(charge.amountDue, currency)}</td>
                                        <td className="py-3 pr-4 text-emerald-300">{money(charge.amountPaid, currency)}</td>
                                        <td className="py-3 pr-4 font-black text-white">{money(charge.outstandingAmount, currency)}</td>
                                        <td className="py-3 pr-4"><span className={classNames('rounded-full border px-2 py-1 text-xs font-black', statusBadge(charge.status))}>{label(charge.status)}</span></td>
                                        <td className="py-3 text-right">
                                            <div className="flex flex-wrap items-center justify-end gap-3">
                                                {fullFinanceAccess && charge.outstandingAmount > 0 && (
                                                    hasCommunicationContact(charge.playerId) ? (
                                                        <button type="button" onClick={() => openFinanceReminder(charge)} className="inline-flex items-center gap-1.5 text-xs font-black text-sky-200 hover:text-sky-100">
                                                            <MessageSquareText className="h-3.5 w-3.5" /> Notify
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className="text-xs font-bold text-slate-600"
                                                            title="Add an email address or mobile number to this member before sending a reminder."
                                                        >
                                                            No contact
                                                        </span>
                                                    )
                                                )}
                                                {canCollectPayments && charge.outstandingAmount > 0 && (
                                                    <button type="button" onClick={() => void openPayment(charge)} className="text-xs font-black text-[#8cf566] hover:underline">Payment</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCharges.length === 0 && (
                                    <tr><td colSpan={8} className="py-12 text-center text-slate-500">No fees match this view.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {tab === 'payments' && (
                <section className="rounded-2xl border border-white/10 bg-[#08120c] p-5">
                    <div className="flex items-center justify-between gap-4">
                        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#8cf566]">Collections</p><h3 className="mt-1 text-xl font-black text-white">Payments received</h3></div>
                        {canCollectPayments && <button type="button" onClick={() => void openPayment(null)} className="inline-flex items-center gap-2 rounded-xl bg-[#8cf566] px-4 py-2 text-sm font-black text-[#061008]"><Plus className="h-4 w-4" /> Record payment</button>}
                    </div>
                    <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="pb-3 pr-4">Date</th>
                                    <th className="pb-3 pr-4">Player / member</th>
                                    <th className="pb-3 pr-4">Amount</th>
                                    <th className="pb-3 pr-4">Method</th>
                                    <th className="pb-3 pr-4">Reference</th>
                                    <th className="pb-3 pr-4">Matching</th>
                                    <th className="pb-3 pr-4">Status</th>
                                    <th className="pb-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {payments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="py-3 pr-4 text-slate-300">{shortDate(payment.paymentDate)}</td>
                                        <td className="py-3 pr-4 font-bold text-white">{payment.playerName ?? '—'}</td>
                                        <td className="py-3 pr-4 font-black text-white">{money(payment.amount, payment.currency)}</td>
                                        <td className="py-3 pr-4 text-slate-300">{label(payment.method)}</td>
                                        <td className="py-3 pr-4 text-slate-400">{payment.paymentReference ?? '—'}</td>
                                        <td className="py-3 pr-4">
                                            {payment.unallocatedAmount > 0 ? (
                                                <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-xs font-black text-amber-200">
                                                    Needs matching · {money(payment.unallocatedAmount, payment.currency)}
                                                </span>
                                            ) : (
                                                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-xs font-black text-emerald-200">
                                                    Matched
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 pr-4"><span className={classNames('rounded-full border px-2 py-1 text-xs font-black', statusBadge(payment.status))}>{label(payment.status)}</span></td>
                                        <td className="py-3 text-right">
                                            {payment.unallocatedAmount > 0 && canCollectPayments ? (
                                                <button
                                                    type="button"
                                                    onClick={() => void openMatchPayment(payment)}
                                                    className="rounded-lg border border-[#8cf566]/30 px-3 py-2 text-xs font-black text-[#8cf566] hover:bg-[#8cf566]/10"
                                                >
                                                    Match payment
                                                </button>
                                            ) : (
                                                <span className="text-slate-600">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {payments.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-slate-500">No payments recorded yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {tab === 'income' && (
                <section className="rounded-2xl border border-white/10 bg-[#08120c] p-5">
                    <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#8cf566]">Non-member income</p><h3 className="mt-1 text-xl font-black text-white">Sponsorship, grants & fundraising</h3></div>{fullFinanceAccess && <button type="button" onClick={() => setModal('income')} className="inline-flex items-center gap-2 rounded-xl bg-[#8cf566] px-4 py-2 text-sm font-black text-[#061008]"><Plus className="h-4 w-4" /> Add income</button>}</div>
                    {!fullFinanceAccess ? <p className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4 text-sm text-amber-100">Club-wide income is restricted to treasurers, finance administrators and club super administrators.</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Source</th><th className="pb-3 pr-4">Category</th><th className="pb-3 pr-4">Expected</th><th className="pb-3 pr-4">Received</th><th className="pb-3">Status</th></tr></thead><tbody className="divide-y divide-white/5">{income.map((item) => <tr key={item.id}><td className="py-3 pr-4 text-slate-400">{shortDate(item.incomeDate)}</td><td className="py-3 pr-4 font-bold text-white">{item.sourceName}</td><td className="py-3 pr-4 text-slate-300">{item.categoryName ?? 'Uncategorised'}</td><td className="py-3 pr-4 text-slate-300">{money(item.amountExpected, item.currency)}</td><td className="py-3 pr-4 font-black text-emerald-300">{money(item.amountReceived, item.currency)}</td><td className="py-3"><span className={classNames('rounded-full border px-2 py-1 text-xs font-black', statusBadge(item.status))}>{label(item.status)}</span></td></tr>)}{income.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-slate-500">No other income recorded yet.</td></tr>}</tbody></table></div>}
                </section>
            )}

            {tab === 'expenses' && (
                <section className="rounded-2xl border border-white/10 bg-[#08120c] p-5">
                    <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#8cf566]">Expenditure</p><h3 className="mt-1 text-xl font-black text-white">Club & team expenses</h3></div>{fullFinanceAccess && <button type="button" onClick={() => setModal('expense')} className="inline-flex items-center gap-2 rounded-xl bg-[#8cf566] px-4 py-2 text-sm font-black text-[#061008]"><Plus className="h-4 w-4" /> Log expense</button>}</div>
                    {!fullFinanceAccess ? <p className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4 text-sm text-amber-100">Club-wide expenditure is private and restricted to full finance roles.</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Description</th><th className="pb-3 pr-4">Supplier</th><th className="pb-3 pr-4">Category</th><th className="pb-3 pr-4">Amount</th><th className="pb-3">Status</th></tr></thead><tbody className="divide-y divide-white/5">{expenses.map((item) => <tr key={item.id}><td className="py-3 pr-4 text-slate-400">{shortDate(item.expenseDate)}</td><td className="py-3 pr-4 font-bold text-white">{item.description}</td><td className="py-3 pr-4 text-slate-300">{item.supplierName ?? '—'}</td><td className="py-3 pr-4 text-slate-300">{item.categoryName ?? 'Uncategorised'}</td><td className="py-3 pr-4 font-black text-white">{money(item.amount + item.taxAmount, item.currency)}</td><td className="py-3"><span className={classNames('rounded-full border px-2 py-1 text-xs font-black', statusBadge(item.status))}>{label(item.status)}</span></td></tr>)}{expenses.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-slate-500">No expenses recorded yet.</td></tr>}</tbody></table></div>}
                </section>
            )}

            {tab === 'receipts' && (
                <section className="rounded-2xl border border-white/10 bg-[#08120c] p-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8cf566]">Receipts folder</p>
                        <h3 className="mt-1 text-xl font-black text-white">Expense receipts</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-400">Receipts uploaded with expenses are kept here so they are easy to find when reviewing club finances.</p>
                    </div>
                    {!fullFinanceAccess ? (
                        <p className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4 text-sm text-amber-100">Receipts are restricted to authorised club finance roles.</p>
                    ) : (
                        <div className="mt-5 overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead className="text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="pb-3 pr-4">Date</th>
                                        <th className="pb-3 pr-4">Expense</th>
                                        <th className="pb-3 pr-4">For</th>
                                        <th className="pb-3 pr-4">Supplier</th>
                                        <th className="pb-3 pr-4">Amount</th>
                                        <th className="pb-3 text-right">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {receiptExpenses.map((expense) => {
                                        const teamName = expense.teamId
                                            ? referenceData.teams.find((team) => team.id === expense.teamId)?.name ?? 'Team'
                                            : 'Entire club'
                                        return (
                                            <tr key={expense.id}>
                                                <td className="py-3 pr-4 text-slate-400">{shortDate(expense.expenseDate)}</td>
                                                <td className="py-3 pr-4 font-bold text-white">{expense.description}</td>
                                                <td className="py-3 pr-4 text-slate-300">{teamName}</td>
                                                <td className="py-3 pr-4 text-slate-300">{expense.supplierName ?? '—'}</td>
                                                <td className="py-3 pr-4 font-black text-white">{money(expense.amount + expense.taxAmount, expense.currency)}</td>
                                                <td className="py-3 text-right">
                                                    <button
                                                        type="button"
                                                        disabled={receiptOpeningId === expense.id}
                                                        onClick={() => void openReceipt(expense)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-[#8cf566] hover:bg-white/10 disabled:opacity-50"
                                                    >
                                                        {receiptOpeningId === expense.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
                                                        View receipt
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {receiptExpenses.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-500">No receipts have been uploaded yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {tab === 'reports' && (
                <section className="space-y-5 rounded-2xl border border-white/10 bg-[#08120c] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#8cf566]">Finance reporting</p><h3 className="mt-1 text-xl font-black text-white">Income, expenses & outstanding balances</h3></div>
                        <div className="flex flex-wrap items-end gap-2"><label className="text-xs font-bold text-slate-400">From<input type="date" value={reportFromDate} onChange={(event) => setReportFromDate(event.target.value)} className="mt-1 block min-h-10 rounded-xl border border-white/10 bg-[#050d08] px-3 text-white" /></label><label className="text-xs font-bold text-slate-400">To<input type="date" value={reportToDate} onChange={(event) => setReportToDate(event.target.value)} className="mt-1 block min-h-10 rounded-xl border border-white/10 bg-[#050d08] px-3 text-white" /></label><button type="button" onClick={() => void runReport()} disabled={saving} className="min-h-10 rounded-xl bg-[#8cf566] px-4 text-sm font-black text-[#061008]">Generate report</button>{report && <button type="button" onClick={() => exportReportCsv(report)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white"><Download className="h-4 w-4" /> CSV</button>}</div>
                    </div>
                    {report ? <div className="grid gap-5 lg:grid-cols-3"><ReportCard title="Income by category" rows={report.incomeByCategory.map((item) => ({ label: item.category, value: money(item.amount, report.currency) }))} /><ReportCard title="Expenses by category" rows={report.expensesByCategory.map((item) => ({ label: item.category, value: money(item.amount, report.currency) }))} /><ReportCard title="Outstanding balances" rows={report.outstandingBalances.slice(0, 10).map((item) => ({ label: item.playerName, value: money(item.outstandingAmount, report.currency) }))} /></div> : <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center"><FileText className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 text-sm font-semibold text-slate-400">Generate a report for the selected club, season and team scope.</p></div>}
                </section>
            )}

            {tab === 'intelligence' && summary && (
                <section className="overflow-hidden rounded-3xl border border-[#8cf566]/20 bg-[radial-gradient(circle_at_top_right,rgba(140,245,102,0.12),transparent_40%),#08120c]">
                    <div className="border-b border-white/10 p-6 lg:p-7">
                        <div className="flex items-start gap-4">
                            <div className="rounded-2xl bg-[#8cf566] p-3 text-[#061008]"><BrainCircuit className="h-6 w-6" /></div>
                            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#8cf566]">AI Finance briefing</p><h3 className="mt-1 text-2xl font-black text-white">Your finance snapshot</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">A quick summary of member payments, money coming in and club spending, highlighting anything that may need your attention.</p></div>
                        </div>
                    </div>
                    <div className="grid gap-4 p-6 lg:grid-cols-2 lg:p-7">
                        {intelligence.map((item, index) => <article key={item} className="rounded-2xl border border-white/10 bg-black/20 p-5"><div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#8cf566]/10 text-xs font-black text-[#8cf566]">{index + 1}</span><p className="text-sm font-semibold leading-6 text-slate-200">{item}</p></div></article>)}
                    </div>
                </section>
            )}

            {modal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#08120c] shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-[#08120c]/95 px-5 py-4 backdrop-blur">
                            <div className="flex min-w-0 items-center gap-4">
                                <img src="/assets/tournamenthq-logo.png" alt="TournamentHQ" className="h-10 w-auto shrink-0 object-contain" />
                                <div className="min-w-0">
                                    <h3
                                        className="text-xl font-semibold tracking-[-0.02em] text-white"
                                        style={{ fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }}
                                    >
                                        {modal === 'payment' ? 'Record payment' : modal === 'match_payment' ? 'Match payment' : modal === 'expense' ? 'Log expense' : modal === 'income' ? 'Record income' : modal === 'charge' ? (editingFeeRuleId ? 'Edit payment rule' : 'Add payment rule') : modal === 'remove_rule' ? 'Remove payment rule' : 'Member ledger'}
                                    </h3>
                                </div>
                            </div>
                            <button type="button" onClick={closeModal} aria-label="Close finance window" className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-4 p-5">
                            {modal === 'payment' && <PaymentForm
                                players={paymentPlayers}
                                teams={referenceData.teams}
                                selectedPlayerId={paymentPlayerId}
                                onPlayerChange={changePaymentPlayer}
                                purpose={paymentPurpose}
                                onPurposeChange={changePaymentPurpose}
                                charges={paymentChargesForPlayer}
                                rules={paymentFeeRules}
                                optionsLoading={paymentOptionsLoading}
                                contextLoading={paymentContextLoading}
                                currency={currency}
                                chargeId={paymentChargeId}
                                setChargeId={(value) => {
                                    setPaymentChargeId(value)
                                    const selected = paymentChargesForPlayer.find((charge) => charge.id === value)
                                    if (selected) {
                                        setPaymentAmount(selected.outstandingAmount.toFixed(2))
                                    }
                                }}
                                fixtures={paymentFixtures}
                                fixtureId={paymentFixtureId}
                                setFixtureId={setPaymentFixtureId}
                                billingMonth={paymentBillingMonth}
                                setBillingMonth={setPaymentBillingMonth}
                                expectedAmount={paymentExpectedAmount}
                                setExpectedAmount={setPaymentExpectedAmount}
                                description={paymentDescription}
                                setDescription={setPaymentDescription}
                                amount={paymentAmount}
                                setAmount={setPaymentAmount}
                                method={paymentMethod}
                                setMethod={setPaymentMethod}
                                date={paymentDate}
                                setDate={setPaymentDate}
                                reference={paymentReference}
                                setReference={setPaymentReference}
                                policy={paymentPolicy}
                            />}
                            {modal === 'match_payment' && matchingPayment && <MatchPaymentForm
                                payment={matchingPayment}
                                charges={matchCharges}
                                chargeId={matchChargeId}
                                setChargeId={(value) => {
                                    setMatchChargeId(value)
                                    const selected = matchCharges.find((charge) => charge.id === value)
                                    if (selected) {
                                        setMatchAmount(
                                            Math.min(
                                                matchingPayment.unallocatedAmount,
                                                selected.outstandingAmount,
                                            ).toFixed(2),
                                        )
                                    }
                                }}
                                amount={matchAmount}
                                setAmount={setMatchAmount}
                                loading={matchOptionsLoading}
                            />}
                            {modal === 'expense' && <ExpenseForm referenceData={referenceData} categoryId={expenseCategoryId} setCategoryId={setExpenseCategoryId} supplier={expenseSupplier} setSupplier={setExpenseSupplier} description={expenseDescription} setDescription={setExpenseDescription} amount={expenseAmount} setAmount={setExpenseAmount} date={expenseDate} setDate={setExpenseDate} teamId={expenseTeamId} setTeamId={setExpenseTeamId} receiptFile={expenseReceiptFile} setReceiptFile={setExpenseReceiptFile} />}
                            {modal === 'income' && <IncomeForm referenceData={referenceData} categoryId={incomeCategoryId} setCategoryId={setIncomeCategoryId} source={incomeSource} setSource={setIncomeSource} description={incomeDescription} setDescription={setIncomeDescription} expected={incomeExpected} setExpected={setIncomeExpected} received={incomeReceived} setReceived={setIncomeReceived} date={incomeDate} setDate={setIncomeDate} teamId={incomeTeamId} setTeamId={setIncomeTeamId} />}
                            {modal === 'charge' && <ChargeForm
                                referenceData={referenceData}
                                seasonId={chargeSeasonId}
                                setSeasonId={(value) => {
                                    setChargeSeasonId(value)
                                    setChargeTeamIds([])
                                }}
                                teamIds={chargeTeamIds}
                                setTeamIds={setChargeTeamIds}
                                kind={feeRuleKind}
                                setKind={(value) => {
                                    setFeeRuleKind(value)
                                    if (value === 'match_sub') {
                                        setFeeRuleFrequency('monthly')
                                    }
                                    setChargeAmount('')
                                }}
                                frequency={feeRuleFrequency}
                                setFrequency={setFeeRuleFrequency}
                                dueDay={feeRuleDueDay}
                                setDueDay={setFeeRuleDueDay}
                                amount={chargeAmount}
                                setAmount={setChargeAmount}
                                description={chargeDescription}
                                setDescription={setChargeDescription}
                                currency={currency}
                                editing={Boolean(editingFeeRuleId)}
                            />}
                            {modal === 'remove_rule' && removingFeeRule && (
                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
                                        <p className="font-black text-white">Remove {removingFeeRule.name}?</p>
                                        <p className="mt-2 text-sm leading-6 text-slate-300">
                                            This stops the rule from creating any new member fees. Payments and fees that have already been paid, partly paid or waived are always kept as part of the club's financial history.
                                        </p>
                                    </div>
                                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/15 p-4">
                                        <input
                                            type="checkbox"
                                            checked={removeRuleUnpaidCharges}
                                            onChange={(event) => setRemoveRuleUnpaidCharges(event.target.checked)}
                                            className="mt-1 h-4 w-4 accent-[#8cf566]"
                                        />
                                        <span>
                                            <span className="block text-sm font-black text-white">Also remove unpaid fees created by this rule</span>
                                            <span className="mt-1 block text-xs leading-5 text-slate-400">
                                                Useful when cleaning up test data or a rule that was created by mistake. Only completely unpaid fees with no payment activity are removed; financial history is preserved.
                                            </span>
                                        </span>
                                    </label>
                                </div>
                            )}
                            {modal === 'ledger' && <LedgerView ledger={ledger} loading={saving} playerId={ledgerPlayerId} />}
                            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-100">{error}</div>}
                            <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
                                <button type="button" disabled={saving} onClick={closeModal} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-black text-white hover:bg-white/10 disabled:opacity-50">
                                    {modal === 'ledger' ? 'Close' : 'Cancel'}
                                </button>
                                {modal !== 'ledger' && (
                                    <button
                                        type="button"
                                        disabled={
                                            saving ||
                                            (modal === 'charge' && (
                                                !chargeSeasonId ||
                                                chargeTeamIds.length === 0 ||
                                                !feeRuleKind ||
                                                !chargeAmount ||
                                                Number(chargeAmount) <= 0 ||
                                                (feeRuleKind === 'dues' &&
                                                    feeRuleFrequency === 'monthly' &&
                                                    (feeRuleDueDay < 1 || feeRuleDueDay > 28))
                                            )) ||
                                            (modal === 'match_payment' && (
                                                matchOptionsLoading ||
                                                !matchChargeId ||
                                                !matchAmount ||
                                                Number(matchAmount) <= 0
                                            ))
                                        }
                                        onClick={submitModal}
                                        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${modal === 'remove_rule' ? 'bg-red-400 text-[#160606] hover:bg-red-300' : 'bg-[#8cf566] text-[#061008]'}`}
                                    >
                                        {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                        {saving ? 'Saving...' : modalPrimaryTitle}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {organisationId && currentOrganisation && (
                <CommunicationComposerModal
                    open={communicationOpen}
                    organisationId={organisationId}
                    organisationName={currentOrganisation.name}
                    recipients={communicationRecipients}
                    defaultTemplateCode={communicationTemplateCode}
                    sourceType={communicationSourceType}
                    sourceId={communicationSourceId}
                    title={communicationTitle}
                    onClose={() => setCommunicationOpen(false)}
                    onSent={(result) => {
                        setNotice(
                            `${result.accepted} reminder${result.accepted === 1 ? '' : 's'} accepted for delivery${result.skipped > 0 ? ` · ${result.skipped} skipped` : ''}${result.failed > 0 ? ` · ${result.failed} failed` : ''}.`,
                        )
                    }}
                />
            )}
        </div>
    )
}

function Field({ title, children }: { title: string; children: ReactNode }) {
    return <label className="block text-sm font-bold text-slate-300">{title}<div className="mt-1">{children}</div></label>
}

const inputClass = 'min-h-11 w-full rounded-xl border border-white/10 bg-[#050d08] px-3 text-sm text-white outline-none focus:border-[#8cf566]/60'

function PaymentForm(props: {
    players: ClubFinanceReferenceData['players']
    teams: ClubFinanceReferenceData['teams']
    selectedPlayerId: string
    onPlayerChange: (value: string) => void
    purpose: PaymentPurposeSelection
    onPurposeChange: (value: PaymentPurposeSelection) => void
    charges: ClubFinanceCharge[]
    rules: ClubFinanceFeeRule[]
    optionsLoading: boolean
    contextLoading: boolean
    currency: string
    chargeId: string
    setChargeId: (value: string) => void
    fixtures: ClubFinanceReferenceData['fixtures']
    fixtureId: string
    setFixtureId: (value: string) => void
    billingMonth: string
    setBillingMonth: (value: string) => void
    expectedAmount: string
    setExpectedAmount: (value: string) => void
    description: string
    setDescription: (value: string) => void
    amount: string
    setAmount: (value: string) => void
    method: string
    setMethod: (value: string) => void
    date: string
    setDate: (value: string) => void
    reference: string
    setReference: (value: string) => void
    policy: {
        monthlyFeeAmount: number
        matchdaySubAmount: number
        monthlyDueDay: number
        paymentModel: ClubFinanceTeamPaymentModel
    } | null
}) {
    const selectedPlayer = props.players.find(
        (player) => paymentPlayerSelectionValue(player) === props.selectedPlayerId,
    ) ?? null
    const activeRules = props.rules.filter((rule) => rule.active)
    const hasSigningRule = activeRules.some(
        (rule) => rule.canonicalType === 'sign_on',
    )
    const hasMonthlyRule = activeRules.some(
        (rule) => rule.canonicalType === 'monthly_fee',
    )
    const hasMatchdayRule = activeRules.some(
        (rule) => rule.canonicalType === 'matchday_sub',
    )
    const hasCustomRule = activeRules.some(
        (rule) => rule.canonicalType === 'custom',
    )

    return <>
        <div className="grid gap-4 sm:grid-cols-2">
            <Field title="Player / member *">
                <select
                    value={props.selectedPlayerId}
                    required
                    aria-required="true"
                    onChange={(event) => props.onPlayerChange(event.target.value)}
                    className={inputClass}
                >
                    <option value="">Select player or member...</option>
                    {props.players.map((player) => (
                        <option key={`${player.seasonId}-${player.teamId}-${player.id}`} value={paymentPlayerSelectionValue(player)}>
                            {player.fullName} • {props.teams.find((team) => team.id === player.teamId)?.name ?? 'Team'}
                        </option>
                    ))}
                </select>
            </Field>

            <Field title="Payment for *">
                <select
                    value={props.purpose}
                    required
                    aria-required="true"
                    onChange={(event) => props.onPurposeChange(event.target.value as PaymentPurposeSelection)}
                    className={inputClass}
                >
                    <option value="">{props.contextLoading && selectedPlayer ? 'Loading payment options...' : 'Select payment purpose...'}</option>
                    {props.charges.length > 0 && (
                        <option value="existing_fee">Existing amount due</option>
                    )}
                    {hasSigningRule && (
                        <option value="sign_on">Signing-on / season dues</option>
                    )}
                    {hasMonthlyRule && (
                        <option value="monthly_fee">Monthly dues</option>
                    )}
                    {hasMatchdayRule && props.fixtures.length > 0 && (
                        <option value="matchday_sub">Match subs</option>
                    )}
                    {hasCustomRule && (
                        <option value="custom">Other configured fee</option>
                    )}
                    <option value="match_later">Other payment / match later</option>
                </select>
            </Field>
        </div>

        {props.purpose === 'existing_fee' && (
            <div>
                <Field title="Fee to pay">
                    <select
                        value={props.chargeId}
                        disabled={props.optionsLoading || !selectedPlayer}
                        onChange={(event) => props.setChargeId(event.target.value)}
                        className={inputClass}
                    >
                        <option value="">
                            {props.optionsLoading
                                ? 'Loading fees...'
                                : !selectedPlayer
                                  ? 'Select a player first'
                                  : props.charges.length === 0
                                    ? 'No unpaid fees for this player'
                                    : 'Select an unpaid fee...'}
                        </option>
                        {props.charges.map((item) => (
                            <option key={item.id} value={item.id}>
                                {chargeTypeLabel(item.chargeType)} • {money(item.outstandingAmount, props.currency)} due
                                {item.dueDate ? ` • due ${shortDate(item.dueDate)}` : ''}
                            </option>
                        ))}
                    </select>
                </Field>
                {selectedPlayer && !props.optionsLoading && props.charges.length === 0 && (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        There is no unpaid balance waiting for this player. Choose one of the payment types configured for the team, or record the money as “Other payment / match later”.
                    </p>
                )}
            </div>
        )}

        {props.purpose === 'sign_on' && (
            <div className="grid gap-4 sm:grid-cols-2">
                <Field title="Season / signing-on dues *">
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={props.expectedAmount}
                        onChange={(event) => props.setExpectedAmount(event.target.value)}
                        placeholder="e.g. 30.00"
                        className={inputClass}
                    />
                </Field>
                <div className="flex items-end pb-2 text-xs leading-5 text-slate-500">
                    This amount comes from the team’s season dues rule. You can still record a partial payment.
                </div>
            </div>
        )}

        {props.purpose === 'monthly_fee' && (
            <div className="grid gap-4 sm:grid-cols-2">
                <Field title="Fee month *">
                    <input
                        type="month"
                        required
                        value={props.billingMonth}
                        onChange={(event) => props.setBillingMonth(event.target.value)}
                        className={inputClass}
                    />
                </Field>
                <Field title="Monthly dues amount *">
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={props.expectedAmount}
                        onChange={(event) => props.setExpectedAmount(event.target.value)}
                        placeholder={props.contextLoading ? 'Loading team rate...' : 'Enter monthly fee'}
                        className={inputClass}
                    />
                </Field>
                <p className="sm:col-span-2 text-xs leading-5 text-slate-500">
                    {props.policy?.monthlyFeeAmount
                        ? `The team’s current monthly rate is ${money(props.policy.monthlyFeeAmount, props.currency)}. You can adjust this member’s fee if an agreed exception applies.`
                        : 'The configured monthly dues amount will be used for this member.'}
                </p>
            </div>
        )}

        {props.purpose === 'matchday_sub' && (
            <div className="space-y-4">
                <Field title="Match *">
                    <select
                        value={props.fixtureId}
                        required
                        onChange={(event) => props.setFixtureId(event.target.value)}
                        className={inputClass}
                    >
                        <option value="">Select fixture...</option>
                        {props.fixtures.map((fixture) => (
                            <option key={fixture.id} value={fixture.id}>
                                {fixturePaymentLabel(fixture)}
                            </option>
                        ))}
                    </select>
                </Field>
                {selectedPlayer && props.fixtures.length === 0 && (
                    <p className="text-xs leading-5 text-slate-500">
                        No fixtures are available for this player’s team and season. You can choose “Other payment / match later” and still record the money now.
                    </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field title="Match subs amount *">
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={props.expectedAmount}
                            onChange={(event) => props.setExpectedAmount(event.target.value)}
                            placeholder={props.contextLoading ? 'Loading team rate...' : 'e.g. 10.00'}
                            className={inputClass}
                        />
                    </Field>
                    <div className="flex items-end pb-2 text-xs leading-5 text-slate-500">
                        {props.policy?.matchdaySubAmount
                            ? `Team rate: ${money(props.policy.matchdaySubAmount, props.currency)}. Change it when a player owes a different amount, for example a half-game contribution.`
                            : 'The configured match subs amount will be used. You can adjust it for an agreed exception.'}
                    </div>
                </div>
            </div>
        )}

        {props.purpose === 'custom' && (
            <Field title="What is this payment for? *">
                <input
                    value={props.description}
                    onChange={(event) => props.setDescription(event.target.value)}
                    placeholder="e.g. Training kit contribution"
                    className={inputClass}
                />
            </Field>
        )}

        {props.purpose === 'match_later' && (
            <div className="rounded-xl border border-amber-300/15 bg-amber-300/5 px-4 py-3 text-sm leading-6 text-amber-100">
                Record the money now even if you are not sure what it relates to. It will appear in Payments as <strong>Needs matching</strong> so the treasurer can link it later.
            </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
            <Field title="Payment amount *"><input type="number" min="0.01" step="0.01" required value={props.amount} onChange={(event) => props.setAmount(event.target.value)} className={inputClass} /></Field>
            <Field title="Payment date *"><input type="date" required value={props.date} onChange={(event) => props.setDate(event.target.value)} className={inputClass} /></Field>
            <Field title="Method"><select value={props.method} onChange={(event) => props.setMethod(event.target.value)} className={inputClass}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="card">Card</option><option value="direct_debit">Direct debit</option><option value="standing_order">Standing order</option><option value="other">Other</option></select></Field>
            <Field title="Reference"><input value={props.reference} onChange={(event) => props.setReference(event.target.value)} placeholder="Optional reference" className={inputClass} /></Field>
        </div>
        <p className="text-xs leading-5 text-slate-500">
            The payment date defaults to today and can be changed to the actual date the money was received. Partial payments are supported.
        </p>
    </>
}

function MatchPaymentForm(props: {
    payment: ClubFinancePayment
    charges: ClubFinanceCharge[]
    chargeId: string
    setChargeId: (value: string) => void
    amount: string
    setAmount: (value: string) => void
    loading: boolean
}) {
    const selectedCharge = props.charges.find(
        (charge) => charge.id === props.chargeId,
    ) ?? null
    const maximum = selectedCharge
        ? Math.min(
            props.payment.unallocatedAmount,
            selectedCharge.outstandingAmount,
        )
        : props.payment.unallocatedAmount

    return <>
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8cf566]">Payment received</p>
            <p className="mt-1 text-lg font-black text-white">{money(props.payment.unallocatedAmount, props.payment.currency)} waiting to be matched</p>
            <p className="mt-1 text-sm text-slate-400">{props.payment.playerName ?? 'Member payment'} • received {shortDate(props.payment.paymentDate)}</p>
        </div>

        <Field title="Match to fee *">
            <select
                value={props.chargeId}
                disabled={props.loading}
                onChange={(event) => props.setChargeId(event.target.value)}
                className={inputClass}
            >
                <option value="">{props.loading ? 'Loading unpaid fees...' : props.charges.length === 0 ? 'No unpaid fees available' : 'Select an unpaid fee...'}</option>
                {props.charges.map((charge) => (
                    <option key={charge.id} value={charge.id}>
                        {chargeTypeLabel(charge.chargeType)} • {money(charge.outstandingAmount, props.payment.currency)} due
                        {charge.description ? ` • ${charge.description}` : ''}
                    </option>
                ))}
            </select>
        </Field>

        {!props.loading && props.charges.length === 0 && (
            <p className="rounded-xl border border-amber-300/15 bg-amber-300/5 px-4 py-3 text-sm leading-6 text-amber-100">
                There is no unpaid fee for this member yet. Add or generate the fee first, then return here to match this payment.
            </p>
        )}

        <Field title="Amount to match *">
            <input
                type="number"
                min="0.01"
                max={maximum > 0 ? maximum : undefined}
                step="0.01"
                value={props.amount}
                onChange={(event) => props.setAmount(event.target.value)}
                className={inputClass}
            />
        </Field>

        <p className="text-xs leading-5 text-slate-500">
            Matching connects money already received to the fee it pays. It does not create another payment.
        </p>
    </>
}

function ExpenseForm(props: { referenceData: ClubFinanceReferenceData; categoryId: string; setCategoryId: (value: string) => void; supplier: string; setSupplier: (value: string) => void; description: string; setDescription: (value: string) => void; amount: string; setAmount: (value: string) => void; date: string; setDate: (value: string) => void; teamId: string; setTeamId: (value: string) => void; receiptFile: File | null; setReceiptFile: (value: File | null) => void }) {
    return <>
        <div className="grid gap-4 sm:grid-cols-2">
            <Field title="Category"><select value={props.categoryId} onChange={(event) => props.setCategoryId(event.target.value)} className={inputClass}><option value="">Uncategorised</option>{props.referenceData.expenseCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <div>
                <Field title="Expense for"><select value={props.teamId} onChange={(event) => props.setTeamId(event.target.value)} className={inputClass}><option value="">Entire club</option>{props.referenceData.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field>
                <p className="mt-1 text-xs leading-5 text-slate-500">Choose the whole club or the team this expense relates to.</p>
            </div>
            <Field title="Supplier / payee"><input value={props.supplier} onChange={(event) => props.setSupplier(event.target.value)} className={inputClass} /></Field>
            <Field title="Expense date"><input type="date" value={props.date} onChange={(event) => props.setDate(event.target.value)} className={inputClass} /></Field>
        </div>
        <Field title="Description"><input value={props.description} onChange={(event) => props.setDescription(event.target.value)} className={inputClass} /></Field>
        <Field title="Amount"><input type="number" min="0" step="0.01" value={props.amount} onChange={(event) => props.setAmount(event.target.value)} className={inputClass} /></Field>
        <Field title="Receipt (optional)"><input type="file" accept="image/*,application/pdf" onChange={(event) => props.setReceiptFile(event.target.files?.[0] ?? null)} className="block w-full rounded-xl border border-white/10 bg-[#050d08] px-3 py-3 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#8cf566] file:px-3 file:py-2 file:text-xs file:font-black file:text-[#061008]" />{props.receiptFile && <p className="mt-2 text-xs text-slate-500">Selected: {props.receiptFile.name}</p>}</Field>
        <p className="text-xs leading-5 text-slate-500">Any receipt you upload will be saved with this expense and available in the Receipts section.</p>
    </>
}

function IncomeForm(props: { referenceData: ClubFinanceReferenceData; categoryId: string; setCategoryId: (value: string) => void; source: string; setSource: (value: string) => void; description: string; setDescription: (value: string) => void; expected: string; setExpected: (value: string) => void; received: string; setReceived: (value: string) => void; date: string; setDate: (value: string) => void; teamId: string; setTeamId: (value: string) => void }) {
    return <>
        <div className="grid gap-4 sm:grid-cols-2">
            <Field title="Category"><select value={props.categoryId} onChange={(event) => props.setCategoryId(event.target.value)} className={inputClass}><option value="">Uncategorised</option>{props.referenceData.incomeCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <div>
                <Field title="Income for"><select value={props.teamId} onChange={(event) => props.setTeamId(event.target.value)} className={inputClass}><option value="">Entire club</option>{props.referenceData.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field>
                <p className="mt-1 text-xs leading-5 text-slate-500">Choose the whole club or the team this income relates to.</p>
            </div>
            <Field title="Source"><input value={props.source} onChange={(event) => props.setSource(event.target.value)} placeholder="Sponsor, grant provider, fundraiser..." className={inputClass} /></Field>
            <Field title="Income date"><input type="date" value={props.date} onChange={(event) => props.setDate(event.target.value)} className={inputClass} /></Field>
            <Field title="Expected amount"><input type="number" min="0" step="0.01" value={props.expected} onChange={(event) => props.setExpected(event.target.value)} className={inputClass} /></Field>
            <Field title="Amount received"><input type="number" min="0" step="0.01" value={props.received} onChange={(event) => props.setReceived(event.target.value)} className={inputClass} /></Field>
        </div>
        <Field title="Description"><input value={props.description} onChange={(event) => props.setDescription(event.target.value)} className={inputClass} /></Field>
    </>
}

function ChargeForm(props: {
    referenceData: ClubFinanceReferenceData
    seasonId: string
    setSeasonId: (value: string) => void
    teamIds: string[]
    setTeamIds: (value: string[]) => void
    kind: 'dues' | 'match_sub' | ''
    setKind: (value: 'dues' | 'match_sub' | '') => void
    frequency: 'monthly' | 'once_per_season'
    setFrequency: (value: 'monthly' | 'once_per_season') => void
    dueDay: number
    setDueDay: (value: number) => void
    amount: string
    setAmount: (value: string) => void
    description: string
    setDescription: (value: string) => void
    currency: string
    editing: boolean
}) {
    const teams = props.referenceData.teams.filter(
        (team) => !props.seasonId || team.seasonIds.includes(props.seasonId),
    )

    const amountLabel = props.kind === 'match_sub'
        ? 'Default amount per player *'
        : props.frequency === 'monthly'
          ? 'Monthly amount per player *'
          : 'Season fee per player *'

    return (
        <>
            <div>
                <p className="text-sm font-black text-white">What are you adding?</p>
                {props.editing && (
                    <p className="mt-1 text-xs leading-5 text-slate-500">The rule type, season and team stay fixed when editing. Update the amount, due day or notes below.</p>
                )}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => props.setKind('dues')}
                        disabled={props.editing}
                        className={classNames(
                            'rounded-2xl border p-4 text-left transition',
                            props.kind === 'dues'
                                ? 'border-[#8cf566]/60 bg-[#8cf566]/10'
                                : 'border-white/10 bg-black/15 hover:border-white/20',
                            props.editing && 'cursor-not-allowed opacity-70',
                        )}
                    >
                        <p className="font-black text-white">Monthly or season dues</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">Membership fees that apply to every active member of the team.</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => props.setKind('match_sub')}
                        disabled={props.editing}
                        className={classNames(
                            'rounded-2xl border p-4 text-left transition',
                            props.kind === 'match_sub'
                                ? 'border-[#8cf566]/60 bg-[#8cf566]/10'
                                : 'border-white/10 bg-black/15 hover:border-white/20',
                            props.editing && 'cursor-not-allowed opacity-70',
                        )}
                    >
                        <p className="font-black text-white">Match subs</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">The normal contribution expected when a player takes part in a fixture.</p>
                    </button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field title="Season *">
                    <select
                        value={props.seasonId}
                        required
                        disabled={props.editing}
                        onChange={(event) => props.setSeasonId(event.target.value)}
                        className={inputClass}
                    >
                        <option value="">Select season...</option>
                        {props.referenceData.seasons.map((season) => (
                            <option key={season.id} value={season.id}>{season.label}</option>
                        ))}
                    </select>
                </Field>
                <div>
                    <p className="block text-sm font-bold text-slate-300">Team(s) *</p>
                    <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-[#050d08] p-2">
                        {teams.map((team) => {
                            const checked = props.teamIds.includes(team.id)
                            return (
                                <label key={team.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-white/5">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={props.editing}
                                        onChange={() => props.setTeamIds(
                                            checked
                                                ? props.teamIds.filter((id) => id !== team.id)
                                                : [...props.teamIds, team.id],
                                        )}
                                        className="h-4 w-4 accent-[#8cf566]"
                                    />
                                    <span>{team.name}</span>
                                </label>
                            )
                        })}
                        {teams.length === 0 && (
                            <p className="px-2 py-3 text-xs text-slate-500">Select a season with configured teams.</p>
                        )}
                    </div>
                </div>
            </div>

            {props.kind === 'dues' && (
                <Field title="How often is it due? *">
                    <select
                        value={props.frequency}
                        disabled={props.editing}
                        onChange={(event) => props.setFrequency(
                            event.target.value as 'monthly' | 'once_per_season',
                        )}
                        className={inputClass}
                    >
                        <option value="monthly">Every month</option>
                        <option value="once_per_season">Once per season / signing-on</option>
                    </select>
                </Field>
            )}

            {props.kind && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field title={amountLabel}>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                                {props.currency === 'GBP' ? '£' : props.currency}
                            </span>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                required
                                value={props.amount}
                                onChange={(event) => props.setAmount(event.target.value)}
                                placeholder={props.kind === 'match_sub' ? 'e.g. 10.00' : 'e.g. 65.00'}
                                className={`${inputClass} pl-10`}
                            />
                        </div>
                    </Field>

                    {props.kind === 'dues' && props.frequency === 'monthly' ? (
                        <Field title="Due day each month *">
                            <input
                                type="number"
                                min="1"
                                max="28"
                                step="1"
                                required
                                value={props.dueDay}
                                onChange={(event) => props.setDueDay(Number(event.target.value))}
                                className={inputClass}
                            />
                        </Field>
                    ) : (
                        <div className="flex items-end pb-2 text-xs leading-5 text-slate-500">
                            {props.kind === 'match_sub'
                                ? 'This is the team default. The amount can be changed for an individual payment, for example £5 for a half.'
                                : 'This one-off fee applies to the team for the selected season.'}
                        </div>
                    )}
                </div>
            )}

            {props.kind && (
                <Field title="Notes">
                    <input
                        value={props.description}
                        onChange={(event) => props.setDescription(event.target.value)}
                        placeholder="Optional note for club administrators"
                        className={inputClass}
                    />
                </Field>
            )}

            {props.kind === 'dues' && (
                <div className="rounded-xl border border-[#8cf566]/15 bg-[#8cf566]/5 p-4 text-xs leading-5 text-slate-300">
                    Saving this rule applies it to the team, not to one selected player. Current member balances are created automatically and new payments are matched to the appropriate member afterwards.
                </div>
            )}
            {props.kind === 'match_sub' && (
                <div className="rounded-xl border border-[#8cf566]/15 bg-[#8cf566]/5 p-4 text-xs leading-5 text-slate-300">
                    The rule sets the normal match contribution for this team. A specific fixture and player are linked when a payment or matchday obligation is recorded.
                </div>
            )}
        </>
    )
}

function LedgerView({ ledger, loading, playerId }: { ledger: ClubFinanceLedger | null; loading: boolean; playerId: string | null }) {
    if (loading && !ledger) return <div className="py-16 text-center"><LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#8cf566]" /><p className="mt-3 text-sm text-slate-400">Loading member ledger...</p></div>
    if (!ledger) return <p className="py-12 text-center text-slate-500">No ledger available for {playerId ?? 'this member'}.</p>
    return <div className="space-y-5"><div className="rounded-2xl border border-white/10 bg-black/20 p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-lg font-black text-white">{ledger.player.fullName}</p><p className="mt-1 text-xs text-slate-500">{ledger.player.email ?? ledger.player.phone ?? 'No contact details'}</p></div><div className="text-right"><p className="text-xs font-bold uppercase text-slate-500">Outstanding</p><p className="mt-1 text-2xl font-black text-white">{money(ledger.summary.outstanding, ledger.summary.currency)}</p></div></div></div><div className="grid gap-3 sm:grid-cols-3"><MiniMetric title="Total due" value={money(ledger.summary.totalDue, ledger.summary.currency)} /><MiniMetric title="Paid" value={money(ledger.summary.totalPaid, ledger.summary.currency)} /><MiniMetric title="Waived" value={money(ledger.summary.totalWaived, ledger.summary.currency)} /></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Entry</th><th className="pb-3 pr-4">Debit</th><th className="pb-3 pr-4">Credit</th><th className="pb-3">Balance</th></tr></thead><tbody className="divide-y divide-white/5">{ledger.ledger.map((entry) => <tr key={`${entry.kind}-${entry.referenceId}-${entry.date}`}><td className="py-3 pr-4 text-slate-400">{shortDate(entry.date)}</td><td className="py-3 pr-4"><p className="font-bold text-white">{entry.description}</p><p className="text-xs text-slate-500">{label(entry.kind)}</p></td><td className="py-3 pr-4 text-slate-300">{entry.debit > 0 ? money(entry.debit, ledger.summary.currency) : '—'}</td><td className="py-3 pr-4 text-emerald-300">{entry.credit > 0 ? money(entry.credit, ledger.summary.currency) : '—'}</td><td className="py-3 font-black text-white">{money(entry.runningBalance, ledger.summary.currency)}</td></tr>)}{ledger.ledger.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-slate-500">No ledger entries yet.</td></tr>}</tbody></table></div></div>
}

function MiniMetric({ title, value }: { title: string; value: string }) {
    return <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-bold uppercase text-slate-500">{title}</p><p className="mt-1 text-lg font-black text-white">{value}</p></div>
}

function ReportCard({ title, rows }: { title: string; rows: Array<{ label: string; value: string }> }) {
    return <article className="rounded-2xl border border-white/10 bg-black/20 p-5"><h4 className="font-black text-white">{title}</h4><div className="mt-4 space-y-3">{rows.map((row, index) => <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-sm"><span className="text-slate-400">{row.label}</span><strong className="text-white">{row.value}</strong></div>)}{rows.length === 0 && <p className="text-sm text-slate-500">No data for this period.</p>}</div></article>
}
