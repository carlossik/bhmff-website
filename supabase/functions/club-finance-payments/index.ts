import {
    ClubFinanceError,
    errorResponse,
    isRecord,
    jsonResponse,
    logClubFinanceFailure,
    optionalDate,
    optionalString,
    optionsResponse,
    readJsonBody,
    requiredNumber,
    requiredString,
    requireClubFinanceAccess,
    type ClubFinanceAccessContext,
} from '../_shared/clubFinance.ts'

type AllocationInput = {
    chargeId: string
    amount: number
}

type PaymentRow = {
    id: string
    organisation_id: string
    season_id: string | null
    team_id: string | null
    payer_id: string | null
    player_id: string | null
    account_id: string | null
    amount: number | string
    currency: string
    payment_date: string
    method: string
    status: string
    gateway_provider: string | null
    gateway_ref: string | null
    payment_reference: string | null
    notes: string | null
    created_at: string
    club_players: { first_name: string; last_name: string } | null
}

type PaymentAllocationRow = {
    payment_id: string
    amount: number | string
    refunded_amount: number | string
}


type MatchPaymentRow = {
    id: string
    season_id: string | null
    team_id: string | null
    player_id: string | null
    amount: number | string
}

type MatchChargeRow = {
    id: string
    season_id: string
    team_id: string
    player_id: string
    amount_due: number | string
    amount_paid: number | string
    waived_amount: number | string
}

function parseAllocations(
    body: Record<string, unknown>,
): AllocationInput[] {
    const value = body.allocations

    if (value === null || value === undefined) {
        return []
    }

    if (!Array.isArray(value)) {
        throw new ClubFinanceError(
            400,
            'allocations must be an array.',
        )
    }

    return value.map((entry) => {
        if (!isRecord(entry)) {
            throw new ClubFinanceError(
                400,
                'Each allocation must be an object.',
            )
        }

        return {
            chargeId: requiredString(entry, 'chargeId'),
            amount: requiredNumber(entry, 'amount'),
        }
    })
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return optionsResponse()
    }

    const startedAt = performance.now()
    let context: ClubFinanceAccessContext | null = null

    try {
        if (request.method !== 'POST') {
            throw new ClubFinanceError(405, 'Method not allowed.')
        }

        const body = await readJsonBody(request)
        const action = requiredString(body, 'action')
        const organisationId = requiredString(
            body,
            'organisationId',
        )
        const teamId = optionalString(body, 'teamId')

        context = await requireClubFinanceAccess(
            request,
            organisationId,
            {
                full: action === 'refund' ||
                    action === 'delete' ||
                    teamId === null,
                teamId,
            },
        )

        if (action === 'list') {
            const seasonId = optionalString(body, 'seasonId')
            const playerId = optionalString(body, 'playerId')

            let query = context.client
                .from('club_finance_payments')
                .select(`
                    id,
                    organisation_id,
                    season_id,
                    team_id,
                    payer_id,
                    player_id,
                    account_id,
                    amount,
                    currency,
                    payment_date,
                    method,
                    status,
                    gateway_provider,
                    gateway_ref,
                    payment_reference,
                    notes,
                    created_at,
                    club_players!club_finance_payments_player_id_fkey (
                        first_name,
                        last_name
                    )
                `)
                .eq('organisation_id', organisationId)

            if (seasonId) {
                query = query.eq('season_id', seasonId)
            }
            if (teamId) {
                query = query.eq('team_id', teamId)
            }
            if (playerId) {
                query = query.eq('player_id', playerId)
            }

            const { data, error } = await query
                .order('payment_date', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) {
                throw new ClubFinanceError(500, error.message)
            }

            const rows = (data ?? []) as unknown as PaymentRow[]
            const allocationTotals = new Map<string, number>()

            if (rows.length > 0) {
                const { data: allocationData, error: allocationError } =
                    await context.client
                        .from('club_finance_payment_allocations')
                        .select('payment_id,amount,refunded_amount')
                        .eq('organisation_id', organisationId)
                        .in('payment_id', rows.map((row) => row.id))

                if (allocationError) {
                    throw new ClubFinanceError(500, allocationError.message)
                }

                for (const allocation of (allocationData ?? []) as unknown as PaymentAllocationRow[]) {
                    const netAmount = Math.max(
                        0,
                        Number(allocation.amount) - Number(allocation.refunded_amount),
                    )
                    allocationTotals.set(
                        allocation.payment_id,
                        (allocationTotals.get(allocation.payment_id) ?? 0) + netAmount,
                    )
                }
            }

            return jsonResponse(
                {
                    payments: rows.map((row) => ({
                        id: row.id,
                        organisationId: row.organisation_id,
                        seasonId: row.season_id,
                        teamId: row.team_id,
                        payerId: row.payer_id,
                        playerId: row.player_id,
                        accountId: row.account_id,
                        amount: Number(row.amount),
                        currency: row.currency,
                        paymentDate: row.payment_date,
                        method: row.method,
                        status: row.status,
                        gatewayProvider: row.gateway_provider,
                        gatewayRef: row.gateway_ref,
                        paymentReference: row.payment_reference,
                        notes: row.notes,
                        playerName: row.club_players
                            ? `${row.club_players.first_name} ${row.club_players.last_name}`.trim()
                            : null,
                        allocatedAmount: Math.min(
                            Number(row.amount),
                            allocationTotals.get(row.id) ?? 0,
                        ),
                        unallocatedAmount: Math.max(
                            0,
                            Number(row.amount) - (allocationTotals.get(row.id) ?? 0),
                        ),
                        createdAt: row.created_at,
                    })),
                },
                200,
                context.correlationId,
            )
        }

        if (action === 'record') {
            const seasonId = optionalString(body, 'seasonId')
            const resolvedTeamId = optionalString(body, 'teamId')
            const payerId = optionalString(body, 'payerId')
            const playerId = optionalString(body, 'playerId')
            const accountId = optionalString(body, 'accountId')
            const amount = requiredNumber(body, 'amount')
            const currency =
                optionalString(body, 'currency') ??
                context.currency
            const paymentDate = optionalDate(
                body,
                'paymentDate',
            )
            const method = requiredString(body, 'method')
            const status =
                optionalString(body, 'status') ??
                'recorded'
            const gatewayProvider = optionalString(
                body,
                'gatewayProvider',
            )
            const gatewayRef = optionalString(
                body,
                'gatewayRef',
            )
            const paymentReference = optionalString(
                body,
                'paymentReference',
            )
            const notes = optionalString(body, 'notes')
            const allocations = parseAllocations(body)

            if (amount <= 0) {
                throw new ClubFinanceError(
                    400,
                    'Payment amount must be greater than zero.',
                )
            }

            const { data, error } = await context.client.rpc(
                'club_finance_record_payment',
                {
                    p_organisation_id: organisationId,
                    p_season_id: seasonId,
                    p_team_id: resolvedTeamId,
                    p_payer_id: payerId,
                    p_player_id: playerId,
                    p_account_id: accountId,
                    p_amount: amount,
                    p_currency: currency,
                    p_payment_date: paymentDate,
                    p_method: method,
                    p_status: status,
                    p_gateway_provider: gatewayProvider,
                    p_gateway_ref: gatewayRef,
                    p_payment_reference: paymentReference,
                    p_notes: notes,
                    p_allocations: allocations,
                },
            )

            if (error) {
                throw new ClubFinanceError(400, error.message)
            }

            return jsonResponse(
                { paymentId: data },
                201,
                context.correlationId,
            )
        }

        if (action === 'allocate') {
            const paymentId = requiredString(body, 'paymentId')
            const chargeId = requiredString(body, 'chargeId')
            const amount = requiredNumber(body, 'amount')

            if (amount <= 0) {
                throw new ClubFinanceError(
                    400,
                    'Matching amount must be greater than zero.',
                )
            }

            const { data: paymentData, error: paymentError } =
                await context.client
                    .from('club_finance_payments')
                    .select('id,season_id,team_id,player_id,amount')
                    .eq('id', paymentId)
                    .eq('organisation_id', organisationId)
                    .maybeSingle()

            if (paymentError) {
                throw new ClubFinanceError(500, paymentError.message)
            }
            if (!paymentData) {
                throw new ClubFinanceError(404, 'Payment not found.')
            }

            const payment = paymentData as unknown as MatchPaymentRow

            const { data: chargeData, error: chargeError } =
                await context.client
                    .from('club_player_charges')
                    .select('id,season_id,team_id,player_id,amount_due,amount_paid,waived_amount')
                    .eq('id', chargeId)
                    .eq('organisation_id', organisationId)
                    .maybeSingle()

            if (chargeError) {
                throw new ClubFinanceError(500, chargeError.message)
            }
            if (!chargeData) {
                throw new ClubFinanceError(404, 'Fee not found.')
            }

            const charge = chargeData as unknown as MatchChargeRow

            if (
                payment.team_id !== charge.team_id ||
                payment.season_id !== charge.season_id
            ) {
                throw new ClubFinanceError(
                    400,
                    'The payment and fee must belong to the same team and season.',
                )
            }

            if (
                payment.player_id &&
                payment.player_id !== charge.player_id
            ) {
                throw new ClubFinanceError(
                    400,
                    'The payment and fee must belong to the same player.',
                )
            }

            const { data: allocationData, error: allocationError } =
                await context.client
                    .from('club_finance_payment_allocations')
                    .select('amount,refunded_amount')
                    .eq('organisation_id', organisationId)
                    .eq('payment_id', paymentId)

            if (allocationError) {
                throw new ClubFinanceError(500, allocationError.message)
            }

            const alreadyMatched = (allocationData ?? []).reduce(
                (total, allocation) =>
                    total + Math.max(
                        0,
                        Number(allocation.amount) -
                            Number(allocation.refunded_amount),
                    ),
                0,
            )
            const paymentRemaining = Math.max(
                0,
                Number(payment.amount) - alreadyMatched,
            )
            const chargeRemaining = Math.max(
                0,
                Number(charge.amount_due) -
                    Number(charge.amount_paid) -
                    Number(charge.waived_amount),
            )

            if (paymentRemaining <= 0) {
                throw new ClubFinanceError(
                    400,
                    'This payment is already fully matched.',
                )
            }
            if (chargeRemaining <= 0) {
                throw new ClubFinanceError(
                    400,
                    'This fee is already fully paid or waived.',
                )
            }
            if (amount > paymentRemaining || amount > chargeRemaining) {
                throw new ClubFinanceError(
                    400,
                    'The matching amount cannot exceed the remaining payment or fee balance.',
                )
            }

            const { data: createdAllocation, error: insertError } =
                await context.client
                    .from('club_finance_payment_allocations')
                    .insert({
                        organisation_id: organisationId,
                        payment_id: paymentId,
                        charge_id: chargeId,
                        amount,
                    })
                    .select('id')
                    .single()

            if (insertError) {
                throw new ClubFinanceError(400, insertError.message)
            }

            return jsonResponse(
                {
                    allocationId: createdAllocation.id,
                    matchedAmount: amount,
                },
                201,
                context.correlationId,
            )
        }

        if (action === 'refund') {
            const allocationId = requiredString(
                body,
                'allocationId',
            )
            const amount = requiredNumber(body, 'amount')
            const reason = requiredString(body, 'reason')

            const { error } = await context.client.rpc(
                'club_finance_refund_allocation',
                {
                    p_allocation_id: allocationId,
                    p_refund_amount: amount,
                    p_reason: reason,
                },
            )

            if (error) {
                throw new ClubFinanceError(400, error.message)
            }

            return jsonResponse(
                { success: true },
                200,
                context.correlationId,
            )
        }

        if (action === 'delete') {
            const paymentId = requiredString(body, 'paymentId')

            const { error } = await context.client
                .from('club_finance_payments')
                .delete()
                .eq('id', paymentId)
                .eq('organisation_id', organisationId)

            if (error) {
                throw new ClubFinanceError(400, error.message)
            }

            return jsonResponse(
                { success: true },
                200,
                context.correlationId,
            )
        }

        throw new ClubFinanceError(
            400,
            `Unsupported payment action: ${action}`,
        )
    } catch (error) {
        await logClubFinanceFailure(
            context,
            'club_finance_payments_failed',
            error,
            performance.now() - startedAt,
        )

        return errorResponse(
            error,
            context?.correlationId,
        )
    }
})
