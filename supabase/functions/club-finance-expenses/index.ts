import {
    ClubFinanceError,
    errorResponse,
    jsonResponse,
    logClubFinanceFailure,
    optionalBoolean,
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

type ExpenseRow = {
    id: string
    organisation_id: string
    season_id: string | null
    team_id: string | null
    fixture_id: string | null
    official_payment_id: string | null
    account_id: string | null
    category_id: string | null
    supplier_name: string | null
    description: string
    amount: number | string
    tax_amount: number | string
    expense_date: string
    status: string
    payment_method: string | null
    payment_reference: string | null
    receipt_url: string | null
    recurring: boolean
    currency: string
    notes: string | null
    approved_by: string | null
    approved_at: string | null
    created_at: string
    club_finance_expense_categories: {
        name: string
    } | null
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
        const action = requiredString(body, 'action')
        const organisationId = requiredString(body, 'organisationId')

        context = await requireClubFinanceAccess(
            request,
            organisationId,
            { full: true },
        )

        if (action === 'list') {
            const seasonId = optionalString(body, 'seasonId')
            const teamId = optionalString(body, 'teamId')
            const fromDate = optionalDate(body, 'fromDate')
            const toDate = optionalDate(body, 'toDate')

            let query = context.client
                .from('club_finance_expenses')
                .select(`
                    id,
                    organisation_id,
                    season_id,
                    team_id,
                    fixture_id,
                    official_payment_id,
                    account_id,
                    category_id,
                    supplier_name,
                    description,
                    amount,
                    tax_amount,
                    expense_date,
                    status,
                    payment_method,
                    payment_reference,
                    receipt_url,
                    recurring,
                    currency,
                    notes,
                    approved_by,
                    approved_at,
                    created_at,
                    club_finance_expense_categories (name)
                `)
                .eq('organisation_id', organisationId)

            if (seasonId) query = query.eq('season_id', seasonId)
            if (teamId) query = query.eq('team_id', teamId)
            if (fromDate) query = query.gte('expense_date', fromDate)
            if (toDate) query = query.lte('expense_date', toDate)

            const { data, error } = await query.order(
                'expense_date',
                { ascending: false },
            )

            if (error) throw new ClubFinanceError(500, error.message)

            const { data: categoryData, error: categoryError } =
                await context.client
                    .from('club_finance_expense_categories')
                    .select('id, code, name, active, system_defined')
                    .eq('organisation_id', organisationId)
                    .order('name')

            if (categoryError) {
                throw new ClubFinanceError(500, categoryError.message)
            }

            const rows = (data ?? []) as unknown as ExpenseRow[]

            return jsonResponse(
                {
                    expenses: rows.map((row) => ({
                        id: row.id,
                        seasonId: row.season_id,
                        teamId: row.team_id,
                        fixtureId: row.fixture_id,
                        officialPaymentId: row.official_payment_id,
                        accountId: row.account_id,
                        categoryId: row.category_id,
                        categoryName:
                            row.club_finance_expense_categories?.name ?? null,
                        supplierName: row.supplier_name,
                        description: row.description,
                        amount: money(row.amount),
                        taxAmount: money(row.tax_amount),
                        expenseDate: row.expense_date,
                        status: row.status,
                        paymentMethod: row.payment_method,
                        paymentReference: row.payment_reference,
                        receiptPath: row.receipt_url,
                        recurring: row.recurring,
                        currency: row.currency,
                        notes: row.notes,
                        approvedBy: row.approved_by,
                        approvedAt: row.approved_at,
                        createdAt: row.created_at,
                    })),
                    categories: categoryData ?? [],
                },
                200,
                context.correlationId,
            )
        }

        if (action === 'create') {
            const amount = requiredNumber(body, 'amount')
            const taxAmount = optionalNumber(body, 'taxAmount') ?? 0

            if (amount < 0 || taxAmount < 0) {
                throw new ClubFinanceError(
                    400,
                    'Expense amounts cannot be negative.',
                )
            }

            const payload = {
                organisation_id: organisationId,
                season_id: optionalString(body, 'seasonId'),
                team_id: optionalString(body, 'teamId'),
                fixture_id: optionalString(body, 'fixtureId'),
                official_payment_id: optionalString(
                    body,
                    'officialPaymentId',
                ),
                account_id: optionalString(body, 'accountId'),
                category_id: optionalString(body, 'categoryId'),
                supplier_name: optionalString(body, 'supplierName'),
                description: requiredString(body, 'description'),
                amount,
                tax_amount: taxAmount,
                expense_date: optionalDate(body, 'expenseDate') ??
                    new Date().toISOString().slice(0, 10),
                status: optionalString(body, 'status') ?? 'recorded',
                payment_method: optionalString(body, 'paymentMethod'),
                payment_reference: optionalString(
                    body,
                    'paymentReference',
                ),
                receipt_url: optionalString(body, 'receiptPath'),
                recurring: optionalBoolean(body, 'recurring') ?? false,
                currency: optionalString(body, 'currency') ??
                    context.currency,
                notes: optionalString(body, 'notes'),
                created_by: context.user.id,
            }

            const { data, error } = await context.client
                .from('club_finance_expenses')
                .insert(payload)
                .select('id')
                .single()

            if (error) throw new ClubFinanceError(400, error.message)

            return jsonResponse(
                { expenseId: data.id },
                201,
                context.correlationId,
            )
        }

        if (action === 'update') {
            const expenseId = requiredString(body, 'expenseId')
            const updates: Record<string, unknown> = {}

            const mappings: Array<[
                string,
                string,
                'string' | 'number' | 'date' | 'boolean'
            ]> = [
                ['seasonId', 'season_id', 'string'],
                ['teamId', 'team_id', 'string'],
                ['fixtureId', 'fixture_id', 'string'],
                ['officialPaymentId', 'official_payment_id', 'string'],
                ['accountId', 'account_id', 'string'],
                ['categoryId', 'category_id', 'string'],
                ['supplierName', 'supplier_name', 'string'],
                ['description', 'description', 'string'],
                ['amount', 'amount', 'number'],
                ['taxAmount', 'tax_amount', 'number'],
                ['expenseDate', 'expense_date', 'date'],
                ['status', 'status', 'string'],
                ['paymentMethod', 'payment_method', 'string'],
                ['paymentReference', 'payment_reference', 'string'],
                ['receiptPath', 'receipt_url', 'string'],
                ['recurring', 'recurring', 'boolean'],
                ['notes', 'notes', 'string'],
            ]

            for (const [inputKey, column, kind] of mappings) {
                if (!(inputKey in body)) continue

                if (kind === 'number') {
                    const value = optionalNumber(body, inputKey)
                    if (value === null || value < 0) {
                        throw new ClubFinanceError(
                            400,
                            `${inputKey} must be a non-negative number.`,
                        )
                    }
                    updates[column] = value
                } else if (kind === 'date') {
                    updates[column] = optionalDate(body, inputKey)
                } else if (kind === 'boolean') {
                    updates[column] = optionalBoolean(body, inputKey)
                } else {
                    updates[column] = optionalString(body, inputKey)
                }
            }

            if (Object.keys(updates).length === 0) {
                throw new ClubFinanceError(
                    400,
                    'No expense changes were provided.',
                )
            }

            const { error } = await context.client
                .from('club_finance_expenses')
                .update(updates)
                .eq('id', expenseId)
                .eq('organisation_id', organisationId)

            if (error) throw new ClubFinanceError(400, error.message)

            return jsonResponse(
                { success: true },
                200,
                context.correlationId,
            )
        }

        if (action === 'delete') {
            const expenseId = requiredString(body, 'expenseId')
            const { error } = await context.client
                .from('club_finance_expenses')
                .delete()
                .eq('id', expenseId)
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
            `Unsupported expense action: ${action}`,
        )
    } catch (error) {
        await logClubFinanceFailure(
            context,
            'club_finance_expenses_failed',
            error,
            performance.now() - startedAt,
        )
        return errorResponse(error, context?.correlationId)
    }
})
