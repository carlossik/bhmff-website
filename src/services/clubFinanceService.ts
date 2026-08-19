import {
    supabase,
} from '../lib/supabaseClient'

import type {
    ClubFinanceCategoryOption,
    ClubFinanceCharge,
    ClubFinanceChargeType,
    ClubFinanceChargeTypeOption,
    ClubFinanceDashboard,
    ClubFinanceExpense,
    ClubFinanceFeeRule,
    ClubFinanceFixtureOption,
    ClubFinanceIncome,
    ClubFinanceLedger,
    ClubFinancePayment,
    ClubFinancePlayerOption,
    ClubFinanceReferenceData,
    ClubFinanceReport,
    ClubFinanceSeasonOption,
    ClubFinanceTeamOption,
    ClubFinanceTeamPaymentModel,
    ClubFinanceTeamPaymentPolicy,
    CreateClubFinanceChargeInput,
    CreateClubFinanceExpenseInput,
    CreateClubFinanceIncomeInput,
    RecordClubFinancePaymentInput,
    RemoveClubFinanceFeeRuleInput,
    RemoveClubFinanceFeeRuleResult,
    SaveClubFinanceFeeRuleInput,
} from '../types/clubFinanceTypes'

type FunctionErrorResponse = {
    error?: unknown
}

class ClubFinanceTransportError extends Error {
    readonly functionName: string

    constructor(functionName: string) {
        super('The Club Finance service is temporarily unavailable.')
        this.name = 'ClubFinanceTransportError'
        this.functionName = functionName
    }
}

type SeasonRow = {
    id: string
    name: string
    season_label: string
    status: string
    start_date: string | null
    end_date: string | null
}

type TeamRow = {
    id: string
    name: string
    age_group: string | null
}

type TeamSeasonRow = {
    season_id: string
    team_id: string
}

type TeamPaymentPolicyRow = {
    organisation_id: string
    season_id: string
    team_id: string
    payment_model: string
    monthly_fee_amount: number | string
    matchday_sub_amount: number | string
    monthly_due_day: number
}

type SquadRow = {
    id: string
    season_id: string
    team_id: string
    player_id: string
    sign_on_fee_amount: number | string
    club_players: {
        id: string
        first_name: string
        last_name: string
        email: string | null
        phone: string | null
    } | null
}


type FixtureRow = {
    id: string
    season_id: string
    team_id: string
    fixture_date: string
    kickoff_time: string | null
    home_away: string
    fixture_type: string
    status: string
    club_opponents:
        | { name: string }
        | Array<{ name: string }>
        | null
}

function fixtureOpponentName(row: FixtureRow): string {
    const relation = row.club_opponents
    if (Array.isArray(relation)) {
        return relation[0]?.name?.trim() || 'Opponent TBC'
    }
    return relation?.name?.trim() || 'Opponent TBC'
}

type CategoryRow = {
    id: string
    code: string
    name: string
    active: boolean
    system_defined: boolean
}

type ChargeTypeRow = CategoryRow & {
    canonical_type: string | null
    default_amount: number | string | null
}

function responseError(
    data: FunctionErrorResponse | null,
    fallback: string,
): string {
    return data && typeof data.error === 'string'
        ? data.error
        : fallback
}

async function invoke<T>(
    functionName: string,
    body: Record<string, unknown>,
): Promise<T> {
    const { data, error } =
        await supabase.functions.invoke<T & FunctionErrorResponse>(
            functionName,
            { body },
        )

    if (error) {
        const context =
            'context' in error
                ? error.context
                : null

        if (context instanceof Response) {
            try {
                const payload =
                    await context.clone().json() as FunctionErrorResponse

                if (typeof payload.error === 'string') {
                    throw new Error(payload.error)
                }
            } catch (contextError) {
                if (
                    contextError instanceof Error &&
                    contextError.name === 'Error'
                ) {
                    throw contextError
                }
            }
        }

        console.error(
            `Club Finance function ${functionName} failed:`,
            error,
        )

        throw new ClubFinanceTransportError(
            functionName,
        )
    }

    if (!data) {
        throw new Error(
            `TournamentHQ returned no data from ${functionName}.`,
        )
    }

    if (typeof data.error === 'string') {
        throw new Error(
            responseError(data, 'Club Finance request failed.'),
        )
    }

    return data
}

async function invokeRead<T>(
    functionName: string,
    body: Record<string, unknown>,
): Promise<T> {
    try {
        return await invoke<T>(functionName, body)
    } catch (caughtError) {
        if (!(caughtError instanceof ClubFinanceTransportError)) {
            throw caughtError
        }

        // Read-only Finance requests are safe to retry once. Supabase Edge
        // Functions can occasionally return a transient relay/gateway failure
        // during a cold start. Never use this helper for writes.
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 350)
        })

        return invoke<T>(functionName, body)
    }
}

function mapCategory(row: CategoryRow): ClubFinanceCategoryOption {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        active: row.active,
        systemDefined: row.system_defined,
    }
}

function isCanonicalChargeType(
    value: string | null,
): value is ClubFinanceChargeType {
    return (
        value === 'sign_on' ||
        value === 'monthly_fee' ||
        value === 'matchday_sub' ||
        value === 'yellow_card_fine' ||
        value === 'red_card_fine' ||
        value === 'custom'
    )
}

function isTeamPaymentModel(
    value: string,
): value is ClubFinanceTeamPaymentModel {
    return (
        value === 'none' ||
        value === 'matchday' ||
        value === 'monthly' ||
        value === 'hybrid'
    )
}

async function requireRows<T>(
    promise: PromiseLike<{
        data: unknown
        error: { message: string } | null
    }>,
    fallback: string,
): Promise<T[]> {
    const { data, error } = await promise

    if (error) {
        throw new Error(error.message || fallback)
    }

    return Array.isArray(data)
        ? data as T[]
        : []
}


function safeFileName(name: string): string {
    const cleaned = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

    return cleaned || 'receipt'
}

export const clubFinanceService = {
    async getDashboard(
        organisationId: string,
        seasonId: string | null,
        teamId: string | null,
    ): Promise<ClubFinanceDashboard> {
        return invokeRead<ClubFinanceDashboard>(
            'club-finance-dashboard',
            {
                organisationId,
                seasonId,
                teamId,
            },
        )
    },

    async getReferenceData(
        organisationId: string,
    ): Promise<ClubFinanceReferenceData> {
        const [
            seasonRows,
            teamRows,
            teamSeasonRows,
            squadRows,
            fixtureRows,
            chargeTypeRows,
            incomeCategoryRows,
            expenseCategoryRows,
        ] = await Promise.all([
            requireRows<SeasonRow>(
                supabase
                    .from('club_seasons')
                    .select('id,name,season_label,status,start_date,end_date')
                    .eq('organisation_id', organisationId)
                    .order('start_date', {
                        ascending: false,
                        nullsFirst: false,
                    }),
                'Unable to load club seasons.',
            ),
            requireRows<TeamRow>(
                supabase
                    .from('teams')
                    .select('id,name,age_group')
                    .eq('organisation_id', organisationId)
                    .order('name'),
                'Unable to load club teams.',
            ),
            requireRows<TeamSeasonRow>(
                supabase
                    .from('club_team_seasons')
                    .select('season_id,team_id')
                    .eq('organisation_id', organisationId)
                    .neq('status', 'archived'),
                'Unable to load team seasons.',
            ),
            requireRows<SquadRow>(
                supabase
                    .from('club_squad_members')
                    .select(`
                        id,
                        season_id,
                        team_id,
                        player_id,
                        sign_on_fee_amount,
                        club_players!club_squad_members_player_id_fkey (
                            id,
                            first_name,
                            last_name,
                            email,
                            phone
                        )
                    `)
                    .eq('organisation_id', organisationId)
                    .eq('active', true),
                'Unable to load club players.',
            ),
            requireRows<FixtureRow>(
                supabase
                    .from('club_fixtures')
                    .select(`
                        id,
                        season_id,
                        team_id,
                        fixture_date,
                        kickoff_time,
                        home_away,
                        fixture_type,
                        status,
                        club_opponents(name)
                    `)
                    .eq('organisation_id', organisationId)
                    .neq('status', 'cancelled')
                    .order('fixture_date', { ascending: true })
                    .order('kickoff_time', { ascending: true }),
                'Unable to load club fixtures.',
            ),
            requireRows<ChargeTypeRow>(
                supabase
                    .from('club_finance_charge_types')
                    .select('id,code,name,active,system_defined,canonical_type,default_amount')
                    .eq('organisation_id', organisationId)
                    .eq('active', true)
                    .order('name'),
                'Unable to load charge types.',
            ),
            requireRows<CategoryRow>(
                supabase
                    .from('club_finance_income_categories')
                    .select('id,code,name,active,system_defined')
                    .eq('organisation_id', organisationId)
                    .eq('active', true)
                    .order('name'),
                'Unable to load income categories.',
            ),
            requireRows<CategoryRow>(
                supabase
                    .from('club_finance_expense_categories')
                    .select('id,code,name,active,system_defined')
                    .eq('organisation_id', organisationId)
                    .eq('active', true)
                    .order('name'),
                'Unable to load expense categories.',
            ),
        ])

        const teamSeasonMap = new Map<string, string[]>()
        teamSeasonRows.forEach((row) => {
            const seasonIds = teamSeasonMap.get(row.team_id) ?? []
            seasonIds.push(row.season_id)
            teamSeasonMap.set(row.team_id, seasonIds)
        })

        const seasons: ClubFinanceSeasonOption[] = seasonRows.map(
            (row) => ({
                id: row.id,
                name: row.name,
                label: row.season_label,
                status: row.status,
                startDate: row.start_date,
                endDate: row.end_date,
            }),
        )

        const teams: ClubFinanceTeamOption[] = teamRows.map((row) => ({
            id: row.id,
            name: row.name,
            ageGroup: row.age_group,
            seasonIds: teamSeasonMap.get(row.id) ?? [],
        }))

        const players: ClubFinancePlayerOption[] = squadRows
            .filter((row) => row.club_players !== null)
            .map((row) => {
                const player = row.club_players

                if (!player) {
                    throw new Error(
                        'A club squad member is missing its player record.',
                    )
                }

                return {
                    id: row.player_id,
                    squadMemberId: row.id,
                    teamId: row.team_id,
                    seasonId: row.season_id,
                    fullName:
                        `${player.first_name} ${player.last_name}`.trim(),
                    email: player.email,
                    phone: player.phone,
                    signOnFeeAmount: Number(row.sign_on_fee_amount ?? 0),
                }
            })

        const fixtures: ClubFinanceFixtureOption[] = fixtureRows.map(
            (row) => ({
                id: row.id,
                seasonId: row.season_id,
                teamId: row.team_id,
                fixtureDate: row.fixture_date,
                kickoffTime: row.kickoff_time,
                homeAway: row.home_away,
                fixtureType: row.fixture_type,
                status: row.status,
                opponentName: fixtureOpponentName(row),
            }),
        )

        const chargeTypes: ClubFinanceChargeTypeOption[] =
            chargeTypeRows.map((row) => ({
                ...mapCategory(row),
                canonicalType: isCanonicalChargeType(row.canonical_type)
                    ? row.canonical_type
                    : null,
                defaultAmount:
                    row.default_amount === null
                        ? null
                        : Number(row.default_amount),
            }))

        return {
            seasons,
            teams,
            players,
            fixtures,
            chargeTypes,
            incomeCategories: incomeCategoryRows.map(mapCategory),
            expenseCategories: expenseCategoryRows.map(mapCategory),
        }
    },

    async getTeamPaymentPolicy(
        organisationId: string,
        seasonId: string,
        teamId: string,
    ): Promise<ClubFinanceTeamPaymentPolicy> {
        const { data, error } = await supabase
            .from('club_team_seasons')
            .select(
                'organisation_id,season_id,team_id,payment_model,monthly_fee_amount,matchday_sub_amount,monthly_due_day',
            )
            .eq('organisation_id', organisationId)
            .eq('season_id', seasonId)
            .eq('team_id', teamId)
            .maybeSingle()

        if (error) {
            throw new Error(error.message)
        }

        if (!data) {
            throw new Error(
                'The selected team is not configured for this season.',
            )
        }

        const row = data as TeamPaymentPolicyRow

        if (!isTeamPaymentModel(row.payment_model)) {
            throw new Error(
                'This team has an unsupported payment setup.',
            )
        }

        return {
            organisationId: row.organisation_id,
            seasonId: row.season_id,
            teamId: row.team_id,
            paymentModel: row.payment_model,
            monthlyFeeAmount: Number(row.monthly_fee_amount),
            matchdaySubAmount: Number(row.matchday_sub_amount),
            monthlyDueDay: row.monthly_due_day,
        }
    },

    async saveMonthlyFeePolicy(
        organisationId: string,
        seasonId: string,
        teamId: string,
        monthlyFeeAmount: number,
    ): Promise<ClubFinanceTeamPaymentPolicy> {
        if (!Number.isFinite(monthlyFeeAmount) || monthlyFeeAmount <= 0) {
            throw new Error(
                'Enter a monthly fee greater than £0.00.',
            )
        }

        const existing = await this.getTeamPaymentPolicy(
            organisationId,
            seasonId,
            teamId,
        )

        const paymentModel: ClubFinanceTeamPaymentModel =
            existing.paymentModel === 'matchday'
                ? 'hybrid'
                : existing.paymentModel === 'none'
                  ? 'monthly'
                  : existing.paymentModel

        const { error } = await supabase
            .from('club_team_seasons')
            .update({
                monthly_fee_amount: monthlyFeeAmount,
                payment_model: paymentModel,
            })
            .eq('organisation_id', organisationId)
            .eq('season_id', seasonId)
            .eq('team_id', teamId)

        if (error) {
            throw new Error(error.message)
        }

        return {
            ...existing,
            paymentModel,
            monthlyFeeAmount,
        }
    },

    async getFeeRules(
        organisationId: string,
        seasonId: string | null,
        teamId: string | null,
    ): Promise<ClubFinanceFeeRule[]> {
        const response = await invokeRead<{ rules: ClubFinanceFeeRule[] }>(
            'club-finance-charges',
            {
                action: 'list_rules',
                organisationId,
                seasonId,
                teamId,
            },
        )

        return response.rules
    },

    async saveFeeRule(
        input: SaveClubFinanceFeeRuleInput,
    ): Promise<{ ruleId: string; createdCount: number }> {
        return invoke<{ ruleId: string; createdCount: number }>(
            'club-finance-charges',
            {
                action: 'save_rule',
                ...input,
            },
        )
    },

    async removeFeeRule(
        input: RemoveClubFinanceFeeRuleInput,
    ): Promise<RemoveClubFinanceFeeRuleResult> {
        return invoke<RemoveClubFinanceFeeRuleResult>(
            'club-finance-charges',
            {
                action: 'remove_rule',
                ...input,
            },
        )
    },

    async syncFeeRules(
        organisationId: string,
        seasonId: string,
        teamId: string | null,
        period?: string | null,
    ): Promise<number> {
        const response = await invoke<{ createdCount: number }>(
            'club-finance-charges',
            {
                action: 'sync_rules',
                organisationId,
                seasonId,
                teamId,
                period: period ?? null,
            },
        )

        return response.createdCount
    },

    async getCharges(
        organisationId: string,
        seasonId: string | null,
        teamId: string | null,
    ): Promise<ClubFinanceCharge[]> {
        const response = await invokeRead<{ charges: ClubFinanceCharge[] }>(
            'club-finance-charges',
            {
                action: 'list',
                organisationId,
                seasonId,
                teamId,
            },
        )

        return response.charges
    },

    async createCharge(
        input: CreateClubFinanceChargeInput,
    ): Promise<string> {
        const response = await invoke<{ chargeId: string }>(
            'club-finance-charges',
            {
                action: 'create',
                ...input,
            },
        )

        return response.chargeId
    },

    async waiveCharge(
        organisationId: string,
        chargeId: string,
        amount: number,
        reason: string,
    ): Promise<void> {
        await invoke<{ success: boolean }>(
            'club-finance-charges',
            {
                action: 'waive',
                organisationId,
                chargeId,
                amount,
                reason,
            },
        )
    },

    async generateMonthlyCharges(
        organisationId: string,
        seasonId: string,
        teamId: string,
        billingPeriod: string,
        dueDate: string | null,
    ): Promise<number> {
        const response = await invoke<{
            createdCount: number
        }>(
            'club-finance-charges',
            {
                action: 'bulk_monthly',
                organisationId,
                seasonId,
                teamId,
                billingPeriod,
                dueDate,
            },
        )

        return response.createdCount
    },

    async generateMatchdayCharges(
        organisationId: string,
        seasonId: string,
        teamId: string,
        fixtureId: string,
        squadMemberIds: string[],
        dueDate: string | null,
    ): Promise<number> {
        const response = await invoke<{
            createdCount: number
        }>(
            'club-finance-charges',
            {
                action: 'bulk_matchday',
                organisationId,
                seasonId,
                teamId,
                fixtureId,
                squadMemberIds,
                dueDate,
            },
        )

        return response.createdCount
    },

    async createCardFine(
        input: {
            organisationId: string
            seasonId: string
            teamId: string
            fixtureId: string
            playerId: string
            matchEventId?: string | null
            offence: 'yellow_card' | 'red_card'
            dueDate?: string | null
            description?: string | null
        },
    ): Promise<string> {
        const response = await invoke<{
            chargeId: string
        }>(
            'club-finance-charges',
            {
                action: 'fine',
                ...input,
            },
        )

        return response.chargeId
    },

    async getPayments(
        organisationId: string,
        seasonId: string | null,
        teamId: string | null,
    ): Promise<ClubFinancePayment[]> {
        const response = await invokeRead<{
            payments: ClubFinancePayment[]
        }>(
            'club-finance-payments',
            {
                action: 'list',
                organisationId,
                seasonId,
                teamId,
            },
        )

        return response.payments
    },

    async recordPayment(
        input: RecordClubFinancePaymentInput,
    ): Promise<string> {
        const requestReference =
            input.gatewayRef?.trim() ||
            crypto.randomUUID()

        try {
            const response = await invoke<{
                paymentId: string
            }>(
                'club-finance-payments',
                {
                    action: 'record',
                    ...input,
                    gatewayProvider:
                        input.gatewayProvider ??
                        'tournamenthq_manual',
                    gatewayRef: requestReference,
                },
            )

            return response.paymentId
        } catch (caughtError) {
            if (!(caughtError instanceof ClubFinanceTransportError)) {
                throw caughtError
            }

            // A network/gateway failure can happen after the database write has
            // completed but before the browser receives the response. Reconcile
            // using the unique request reference instead of automatically
            // repeating a financial write and risking a duplicate payment.
            try {
                const reconciliation = await invokeRead<{
                    payments: ClubFinancePayment[]
                }>(
                    'club-finance-payments',
                    {
                        action: 'list',
                        organisationId: input.organisationId,
                        seasonId: input.seasonId ?? null,
                        teamId: input.teamId ?? null,
                    },
                )

                const recordedPayment =
                    reconciliation.payments.find(
                        (payment) =>
                            payment.gatewayRef ===
                            requestReference,
                    )

                if (recordedPayment) {
                    return recordedPayment.id
                }
            } catch (reconciliationError) {
                console.error(
                    'Unable to reconcile payment after a temporary Finance service failure:',
                    reconciliationError,
                )
            }

            throw new Error(
                'We could not confirm whether this payment was saved because the Finance service briefly disconnected. Refresh the Payments list before trying again so the payment is not recorded twice.',
            )
        }
    },

    async refundAllocation(
        organisationId: string,
        allocationId: string,
        amount: number,
        reason: string,
    ): Promise<void> {
        await invoke<{ success: boolean }>(
            'club-finance-payments',
            {
                action: 'refund',
                organisationId,
                allocationId,
                amount,
                reason,
            },
        )
    },

    async matchPayment(
        input: {
            organisationId: string
            paymentId: string
            teamId: string | null
            chargeId: string
            amount: number
        },
    ): Promise<string> {
        const response = await invoke<{
            allocationId: string
        }>(
            'club-finance-payments',
            {
                action: 'allocate',
                ...input,
            },
        )

        return response.allocationId
    },

    async getExpenses(
        organisationId: string,
        seasonId: string | null,
        teamId: string | null,
    ): Promise<ClubFinanceExpense[]> {
        const response = await invokeRead<{
            expenses: ClubFinanceExpense[]
        }>(
            'club-finance-expenses',
            {
                action: 'list',
                organisationId,
                seasonId,
                teamId,
            },
        )

        return response.expenses
    },

    async uploadExpenseReceipt(
        organisationId: string,
        file: File,
    ): Promise<string> {
        const path = `${organisationId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
        const { error } = await supabase.storage
            .from('club-finance-receipts')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || undefined,
            })

        if (error) {
            throw new Error(error.message)
        }

        return path
    },

    async getExpenseReceiptUrl(path: string): Promise<string> {
        const { data, error } = await supabase.storage
            .from('club-finance-receipts')
            .createSignedUrl(path, 300)

        if (error) {
            throw new Error(error.message)
        }

        if (!data?.signedUrl) {
            throw new Error('Unable to create a secure receipt link.')
        }

        return data.signedUrl
    },

    async deleteExpenseReceipt(path: string): Promise<void> {
        const { error } = await supabase.storage
            .from('club-finance-receipts')
            .remove([path])

        if (error) {
            throw new Error(error.message)
        }
    },

    async createExpense(
        input: CreateClubFinanceExpenseInput,
    ): Promise<string> {
        const response = await invoke<{
            expenseId: string
        }>(
            'club-finance-expenses',
            {
                action: 'create',
                ...input,
            },
        )

        return response.expenseId
    },

    async getIncome(
        organisationId: string,
        seasonId: string | null,
        teamId: string | null,
    ): Promise<ClubFinanceIncome[]> {
        const response = await invokeRead<{
            income: ClubFinanceIncome[]
        }>(
            'club-finance-income',
            {
                action: 'list',
                organisationId,
                seasonId,
                teamId,
            },
        )

        return response.income
    },

    async createIncome(
        input: CreateClubFinanceIncomeInput,
    ): Promise<string> {
        const response = await invoke<{
            incomeId: string
        }>(
            'club-finance-income',
            {
                action: 'create',
                ...input,
            },
        )

        return response.incomeId
    },

    async getMemberLedger(
        organisationId: string,
        playerId: string,
        seasonId: string | null,
    ): Promise<ClubFinanceLedger> {
        return invokeRead<ClubFinanceLedger>(
            'club-finance-ledger',
            {
                organisationId,
                playerId,
                seasonId,
            },
        )
    },

    async getReport(
        organisationId: string,
        options: {
            seasonId?: string | null
            teamId?: string | null
            fromDate?: string | null
            toDate?: string | null
        },
    ): Promise<ClubFinanceReport> {
        return invokeRead<ClubFinanceReport>(
            'club-finance-reports',
            {
                organisationId,
                ...options,
            },
        )
    },
}
