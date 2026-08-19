import {
    ClubFinanceError,
    errorResponse,
    jsonResponse,
    logClubFinanceFailure,
    optionalString,
    optionsResponse,
    readJsonBody,
    requiredString,
    requireClubFinanceAccess,
    type ClubFinanceAccessContext,
} from '../_shared/clubFinance.ts'

type PlayerJoin = {
    first_name: string
    last_name: string
}

type ChargeRow = {
    id: string
    player_id: string
    charge_type: string
    description: string | null
    amount_due: number | string
    amount_paid: number | string
    waived_amount: number | string
    due_date: string | null
    payment_status: string
    club_players: PlayerJoin | null
}

type ExpenseCategoryJoin = {
    name: string
}

type ExpenseRow = {
    id: string
    team_id: string | null
    description: string
    supplier_name: string | null
    amount: number | string
    tax_amount: number | string
    expense_date: string
    status: string
    club_finance_expense_categories: ExpenseCategoryJoin | null
}

type AccountRow = {
    id: string
    name: string
    account_type: string
    currency: string
    opening_balance: number | string
    opening_balance_date: string
    is_default: boolean
    active: boolean
}

function numeric(value: number | string): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return optionsResponse()
    }

    const startedAt = performance.now()
    let context: ClubFinanceAccessContext | null = null

    try {
        if (request.method !== 'POST') {
            throw new ClubFinanceError(
                405,
                'Method not allowed.',
            )
        }

        const body = await readJsonBody(request)
        const organisationId =
            requiredString(body, 'organisationId')
        const seasonId = optionalString(body, 'seasonId')
        const teamId = optionalString(body, 'teamId')

        context = await requireClubFinanceAccess(
            request,
            organisationId,
            {
                full: teamId === null,
                teamId,
            },
        )

        let chargesQuery = context.client
            .from('club_player_charges')
            .select(`
                id,
                player_id,
                charge_type,
                description,
                amount_due,
                amount_paid,
                waived_amount,
                due_date,
                payment_status,
                club_players!club_player_charges_player_id_fkey (
                    first_name,
                    last_name
                )
            `)
            .eq('organisation_id', organisationId)

        if (seasonId) {
            chargesQuery = chargesQuery.eq('season_id', seasonId)
        }

        if (teamId) {
            chargesQuery = chargesQuery.eq('team_id', teamId)
        }

        let expensesQuery = context.client
            .from('club_finance_expenses')
            .select(`
                id,
                team_id,
                description,
                supplier_name,
                amount,
                tax_amount,
                expense_date,
                status,
                club_finance_expense_categories (
                    name
                )
            `)
            .eq('organisation_id', organisationId)

        if (seasonId) {
            expensesQuery = expensesQuery.eq('season_id', seasonId)
        }

        if (teamId) {
            expensesQuery = expensesQuery.eq('team_id', teamId)
        }

        const [
            summaryResponse,
            trendResponse,
            chargesResponse,
            expensesResponse,
            accountsResponse,
        ] = await Promise.all([
            context.client.rpc(
                'club_finance_dashboard_summary',
                {
                    p_organisation_id: organisationId,
                    p_season_id: seasonId,
                    p_team_id: teamId,
                },
            ),
            context.client.rpc(
                'club_finance_monthly_trend',
                {
                    p_organisation_id: organisationId,
                    p_season_id: seasonId,
                    p_team_id: teamId,
                    p_months: 6,
                },
            ),
            chargesQuery
                .order('due_date', {
                    ascending: true,
                    nullsFirst: false,
                })
                .limit(200),
            expensesQuery
                .neq('status', 'void')
                .order('expense_date', {
                    ascending: false,
                })
                .limit(8),
            context.client
                .from('club_finance_accounts')
                .select(`
                    id,
                    name,
                    account_type,
                    currency,
                    opening_balance,
                    opening_balance_date,
                    is_default,
                    active
                `)
                .eq('organisation_id', organisationId)
                .eq('active', true)
                .order('is_default', {
                    ascending: false,
                })
                .order('name'),
        ])
        const firstError =
            summaryResponse.error ??
            trendResponse.error ??
            chargesResponse.error ??
            expensesResponse.error ??
            accountsResponse.error

        if (firstError) {
            throw new ClubFinanceError(
                500,
                firstError.message,
            )
        }

        const chargeRows = (
            chargesResponse.data ?? []
        ) as unknown as ChargeRow[]

        const owing = chargeRows
            .map((charge) => {
                const amountDue = numeric(charge.amount_due)
                const amountPaid = numeric(charge.amount_paid)
                const waived = numeric(charge.waived_amount)
                const outstanding = Math.max(
                    0,
                    amountDue - amountPaid - waived,
                )

                return {
                    id: charge.id,
                    playerId: charge.player_id,
                    playerName: charge.club_players
                        ? `${charge.club_players.first_name} ${charge.club_players.last_name}`.trim()
                        : 'Player',
                    chargeType: charge.charge_type,
                    description: charge.description,
                    amountDue,
                    amountPaid,
                    waivedAmount: waived,
                    outstandingAmount: outstanding,
                    dueDate: charge.due_date,
                    status: charge.payment_status,
                    overdue:
                        outstanding > 0 &&
                        Boolean(charge.due_date) &&
                        String(charge.due_date) <
                            new Date().toISOString().slice(0, 10),
                }
            })
            .filter((charge) => charge.outstandingAmount > 0)
            .sort((left, right) => {
                if (left.overdue !== right.overdue) {
                    return left.overdue ? -1 : 1
                }

                return right.outstandingAmount -
                    left.outstandingAmount
            })
            .slice(0, 12)

        const recentExpenses = (
            expensesResponse.data ?? []
        ) as unknown as ExpenseRow[]

        const accounts = (
            accountsResponse.data ?? []
        ) as unknown as AccountRow[]

        return jsonResponse(
            {
                summary: summaryResponse.data,
                trend: trendResponse.data ?? [],
                owing,
                recentExpenses: recentExpenses.map(
                    (expense) => ({
                        id: expense.id,
                        teamId: expense.team_id,
                        description: expense.description,
                        supplierName: expense.supplier_name,
                        amount: numeric(expense.amount),
                        taxAmount: numeric(expense.tax_amount),
                        expenseDate: expense.expense_date,
                        status: expense.status,
                        categoryName:
                            expense.club_finance_expense_categories?.name ??
                            null,
                    }),
                ),
                accounts: accounts.map((account) => ({
                    id: account.id,
                    name: account.name,
                    accountType: account.account_type,
                    currency: account.currency,
                    openingBalance: numeric(account.opening_balance),
                    openingBalanceDate: account.opening_balance_date,
                    isDefault: account.is_default,
                })),
                access: {
                    role: context.role,
                    teamId: context.teamId,
                },
            },
            200,
            context.correlationId,
        )
    } catch (error) {
        await logClubFinanceFailure(
            context,
            'club_finance_dashboard_failed',
            error,
            performance.now() - startedAt,
        )

        return errorResponse(
            error,
            context?.correlationId,
        )
    }
})
