import {
    ClubFinanceError,
    errorResponse,
    jsonResponse,
    logClubFinanceFailure,
    optionalDate,
    optionalNumber,
    optionalString,
    optionsResponse,
    readJsonBody,
    requiredNumber,
    requiredString,
    requireClubFinanceAccess,
    type ClubFinanceAccessContext,
} from '../_shared/clubFinance.ts'

type IncomeRow = {
    id: string
    season_id: string | null
    team_id: string | null
    account_id: string | null
    category_id: string | null
    source_name: string
    description: string | null
    amount_expected: number | string
    amount_received: number | string
    income_date: string
    due_date: string | null
    status: string
    currency: string
    reference: string | null
    notes: string | null
    created_at: string
    club_finance_income_categories: { name: string } | null
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
        const action = requiredString(body, 'action')
        const organisationId = requiredString(body, 'organisationId')

        context = await requireClubFinanceAccess(
            request,
            organisationId,
            { full: true },
        )

        if (action === 'list') {
            let query = context.client
                .from('club_finance_income')
                .select(`
                    id, season_id, team_id, account_id, category_id,
                    source_name, description, amount_expected,
                    amount_received, income_date, due_date, status,
                    currency, reference, notes, created_at,
                    club_finance_income_categories (name)
                `)
                .eq('organisation_id', organisationId)

            const seasonId = optionalString(body, 'seasonId')
            const teamId = optionalString(body, 'teamId')
            if (seasonId) query = query.eq('season_id', seasonId)
            if (teamId) query = query.eq('team_id', teamId)

            const [{ data, error }, categories] = await Promise.all([
                query.order('income_date', { ascending: false }),
                context.client
                    .from('club_finance_income_categories')
                    .select('id, code, name, active, system_defined')
                    .eq('organisation_id', organisationId)
                    .order('name'),
            ])

            if (error) throw new ClubFinanceError(500, error.message)
            if (categories.error) {
                throw new ClubFinanceError(500, categories.error.message)
            }

            const rows = (data ?? []) as unknown as IncomeRow[]

            return jsonResponse(
                {
                    income: rows.map((row) => ({
                        id: row.id,
                        seasonId: row.season_id,
                        teamId: row.team_id,
                        accountId: row.account_id,
                        categoryId: row.category_id,
                        categoryName:
                            row.club_finance_income_categories?.name ?? null,
                        sourceName: row.source_name,
                        description: row.description,
                        amountExpected: Number(row.amount_expected),
                        amountReceived: Number(row.amount_received),
                        incomeDate: row.income_date,
                        dueDate: row.due_date,
                        status: row.status,
                        currency: row.currency,
                        reference: row.reference,
                        notes: row.notes,
                        createdAt: row.created_at,
                    })),
                    categories: categories.data ?? [],
                },
                200,
                context.correlationId,
            )
        }

        if (action === 'create') {
            const expected = requiredNumber(body, 'amountExpected')
            const received = optionalNumber(body, 'amountReceived') ?? 0

            if (expected < 0 || received < 0 || received > expected) {
                throw new ClubFinanceError(
                    400,
                    'Income amounts are invalid.',
                )
            }

            const status =
                received >= expected && expected > 0
                    ? 'received'
                    : received > 0
                        ? 'part_received'
                        : 'expected'

            const { data, error } = await context.client
                .from('club_finance_income')
                .insert({
                    organisation_id: organisationId,
                    season_id: optionalString(body, 'seasonId'),
                    team_id: optionalString(body, 'teamId'),
                    account_id: optionalString(body, 'accountId'),
                    category_id: optionalString(body, 'categoryId'),
                    source_name: requiredString(body, 'sourceName'),
                    description: optionalString(body, 'description'),
                    amount_expected: expected,
                    amount_received: received,
                    income_date: optionalDate(body, 'incomeDate') ??
                        new Date().toISOString().slice(0, 10),
                    due_date: optionalDate(body, 'dueDate'),
                    status,
                    currency: optionalString(body, 'currency') ??
                        context.currency,
                    reference: optionalString(body, 'reference'),
                    notes: optionalString(body, 'notes'),
                    created_by: context.user.id,
                })
                .select('id')
                .single()

            if (error) throw new ClubFinanceError(400, error.message)

            return jsonResponse(
                { incomeId: data.id },
                201,
                context.correlationId,
            )
        }

        if (action === 'delete') {
            const incomeId = requiredString(body, 'incomeId')
            const { error } = await context.client
                .from('club_finance_income')
                .delete()
                .eq('id', incomeId)
                .eq('organisation_id', organisationId)

            if (error) throw new ClubFinanceError(400, error.message)

            return jsonResponse(
                { success: true },
                200,
                context.correlationId,
            )
        }

        throw new ClubFinanceError(
            400,
            `Unsupported income action: ${action}`,
        )
    } catch (error) {
        await logClubFinanceFailure(
            context,
            'club_finance_income_failed',
            error,
            performance.now() - startedAt,
        )
        return errorResponse(error, context?.correlationId)
    }
})
