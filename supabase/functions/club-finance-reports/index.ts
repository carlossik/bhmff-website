import {
    ClubFinanceError,
    errorResponse,
    jsonResponse,
    logClubFinanceFailure,
    optionalDate,
    optionalString,
    optionsResponse,
    readJsonBody,
    requiredString,
    requireClubFinanceAccess,
    type ClubFinanceAccessContext,
} from '../_shared/clubFinance.ts'

type ExpenseRow = {
    amount: number | string
    tax_amount: number | string
    category_id: string | null
    club_finance_expense_categories: { name: string } | null
}

type IncomeRow = {
    amount_received: number | string
    category_id: string | null
    club_finance_income_categories: { name: string } | null
}

type OutstandingRow = {
    id: string
    player_id: string
    charge_type: string
    description: string | null
    amount_due: number | string
    amount_paid: number | string
    waived_amount: number | string
    due_date: string | null
    payment_status: string
    club_players: { first_name: string; last_name: string } | null
}

function money(value: number | string): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') return optionsResponse()

    const startedAt = performance.now()
    let context: ClubFinanceAccessContext | null = null

    try {
        if (request.method !== 'POST') {
            throw new ClubFinanceError(405, 'Method not allowed.')
        }

        const body = await readJsonBody(request)
        const organisationId = requiredString(body, 'organisationId')
        const seasonId = optionalString(body, 'seasonId')
        const teamId = optionalString(body, 'teamId')
        const fromDate = optionalDate(body, 'fromDate')
        const toDate = optionalDate(body, 'toDate')

        context = await requireClubFinanceAccess(
            request,
            organisationId,
            { full: true },
        )

        let expenseQuery = context.client
            .from('club_finance_expenses')
            .select(`
                amount, tax_amount, category_id,
                club_finance_expense_categories (name)
            `)
            .eq('organisation_id', organisationId)
            .not('status', 'in', '(draft,void)')

        let incomeQuery = context.client
            .from('club_finance_income')
            .select(`
                amount_received, category_id,
                club_finance_income_categories (name)
            `)
            .eq('organisation_id', organisationId)
            .neq('status', 'cancelled')

        let outstandingQuery = context.client
            .from('club_player_charges')
            .select(`
                id, player_id, charge_type, description, amount_due,
                amount_paid, waived_amount, due_date, payment_status,
                club_players!club_player_charges_player_id_fkey (
                    first_name, last_name
                )
            `)
            .eq('organisation_id', organisationId)
            .in('payment_status', ['not_due', 'due', 'part_paid'])

        if (seasonId) {
            expenseQuery = expenseQuery.eq('season_id', seasonId)
            incomeQuery = incomeQuery.eq('season_id', seasonId)
            outstandingQuery = outstandingQuery.eq('season_id', seasonId)
        }
        if (teamId) {
            expenseQuery = expenseQuery.eq('team_id', teamId)
            incomeQuery = incomeQuery.eq('team_id', teamId)
            outstandingQuery = outstandingQuery.eq('team_id', teamId)
        }
        if (fromDate) {
            expenseQuery = expenseQuery.gte('expense_date', fromDate)
            incomeQuery = incomeQuery.gte('income_date', fromDate)
        }
        if (toDate) {
            expenseQuery = expenseQuery.lte('expense_date', toDate)
            incomeQuery = incomeQuery.lte('income_date', toDate)
        }

        const [expenses, income, outstanding, trend] =
            await Promise.all([
                expenseQuery,
                incomeQuery,
                outstandingQuery.order('due_date', {
                    ascending: true,
                    nullsFirst: false,
                }),
                context.client.rpc('club_finance_monthly_trend', {
                    p_organisation_id: organisationId,
                    p_season_id: seasonId,
                    p_team_id: teamId,
                    p_months: 6,
                }),
            ])

        const firstError =
            expenses.error ??
            income.error ??
            outstanding.error ??
            trend.error
        if (firstError) {
            throw new ClubFinanceError(500, firstError.message)
        }

        const expenseByCategory = new Map<string, number>()
        for (const row of (expenses.data ?? []) as unknown as ExpenseRow[]) {
            const name =
                row.club_finance_expense_categories?.name ??
                'Uncategorised'
            expenseByCategory.set(
                name,
                (expenseByCategory.get(name) ?? 0) +
                    money(row.amount) +
                    money(row.tax_amount),
            )
        }

        const incomeByCategory = new Map<string, number>()
        for (const row of (income.data ?? []) as unknown as IncomeRow[]) {
            const name =
                row.club_finance_income_categories?.name ??
                'Uncategorised'
            incomeByCategory.set(
                name,
                (incomeByCategory.get(name) ?? 0) +
                    money(row.amount_received),
            )
        }

        const outstandingRows = (
            outstanding.data ?? []
        ) as unknown as OutstandingRow[]

        return jsonResponse(
            {
                period: { fromDate, toDate },
                incomeByCategory: [...incomeByCategory.entries()]
                    .map(([category, amount]) => ({ category, amount }))
                    .sort((a, b) => b.amount - a.amount),
                expensesByCategory: [...expenseByCategory.entries()]
                    .map(([category, amount]) => ({ category, amount }))
                    .sort((a, b) => b.amount - a.amount),
                outstandingBalances: outstandingRows
                    .map((row) => {
                        const outstandingAmount = Math.max(
                            0,
                            money(row.amount_due) -
                                money(row.amount_paid) -
                                money(row.waived_amount),
                        )
                        return {
                            chargeId: row.id,
                            playerId: row.player_id,
                            playerName: row.club_players
                                ? `${row.club_players.first_name} ${row.club_players.last_name}`.trim()
                                : 'Player',
                            chargeType: row.charge_type,
                            description: row.description,
                            dueDate: row.due_date,
                            status: row.payment_status,
                            outstandingAmount,
                        }
                    })
                    .filter((row) => row.outstandingAmount > 0),
                trend: trend.data ?? [],
                currency: context.currency,
            },
            200,
            context.correlationId,
        )
    } catch (error) {
        await logClubFinanceFailure(
            context,
            'club_finance_reports_failed',
            error,
            performance.now() - startedAt,
        )
        return errorResponse(error, context?.correlationId)
    }
})
