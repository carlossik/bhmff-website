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

type ChargeRow = {
    id: string
    charge_type: string
    description: string | null
    amount_due: number | string
    amount_paid: number | string
    waived_amount: number | string
    due_date: string | null
    billing_period: string | null
    payment_status: string
    currency: string
    created_at: string
}

type AllocationRow = {
    id: string
    charge_id: string
    amount: number | string
    refunded_amount: number | string
    created_at: string
    club_finance_payments: {
        id: string
        payment_date: string
        method: string
        status: string
        payment_reference: string | null
    } | null
}

type PlayerRow = {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
}

type PayerLinkRow = {
    relationship: string
    is_primary: boolean
    club_finance_payers: {
        id: string
        payer_type: string
        full_name: string
        email: string | null
        phone: string | null
        whatsapp_number: string | null
        whatsapp_opt_in: boolean
        email_opt_in: boolean
    } | null
}

type LedgerEntry = {
    date: string
    kind: 'charge' | 'payment' | 'refund' | 'waiver'
    referenceId: string
    description: string
    debit: number
    credit: number
    runningBalance: number
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
        const playerId = requiredString(body, 'playerId')
        const seasonId = optionalString(body, 'seasonId')

        context = await requireClubFinanceAccess(
            request,
            organisationId,
            { full: true },
        )

        const playerQuery = context.client
            .from('club_players')
            .select('id, first_name, last_name, email, phone')
            .eq('id', playerId)
            .eq('organisation_id', organisationId)
            .maybeSingle()

        let chargesQuery = context.client
            .from('club_player_charges')
            .select(`
                id, charge_type, description, amount_due, amount_paid,
                waived_amount, due_date, billing_period, payment_status,
                currency, created_at
            `)
            .eq('organisation_id', organisationId)
            .eq('player_id', playerId)

        if (seasonId) {
            chargesQuery = chargesQuery.eq('season_id', seasonId)
        }

        const payerQuery = context.client
            .from('club_finance_payer_links')
            .select(`
                relationship,
                is_primary,
                club_finance_payers (
                    id, payer_type, full_name, email, phone,
                    whatsapp_number, whatsapp_opt_in, email_opt_in
                )
            `)
            .eq('organisation_id', organisationId)
            .eq('player_id', playerId)
            .order('is_primary', { ascending: false })

        const [playerResponse, chargesResponse, payerResponse] =
            await Promise.all([
                playerQuery,
                chargesQuery.order('created_at', { ascending: true }),
                payerQuery,
            ])

        const firstError =
            playerResponse.error ??
            chargesResponse.error ??
            payerResponse.error

        if (firstError) {
            throw new ClubFinanceError(500, firstError.message)
        }

        const player = playerResponse.data as PlayerRow | null
        if (!player) {
            throw new ClubFinanceError(
                404,
                'The selected player does not exist.',
            )
        }

        const charges = (chargesResponse.data ?? []) as ChargeRow[]
        const chargeIds = charges.map((charge) => charge.id)

        let allocations: AllocationRow[] = []

        if (chargeIds.length > 0) {
            const { data, error } = await context.client
                .from('club_finance_payment_allocations')
                .select(`
                    id, charge_id, amount, refunded_amount, created_at,
                    club_finance_payments!club_finance_payment_allocations_payment_id_fkey (
                        id, payment_date, method, status, payment_reference
                    )
                `)
                .in('charge_id', chargeIds)
                .order('created_at', { ascending: true })

            if (error) {
                throw new ClubFinanceError(500, error.message)
            }

            allocations = (data ?? []) as unknown as AllocationRow[]
        }

        const entries: Omit<LedgerEntry, 'runningBalance'>[] = []

        for (const charge of charges) {
            entries.push({
                date: charge.created_at,
                kind: 'charge',
                referenceId: charge.id,
                description:
                    charge.description ??
                    charge.charge_type.replaceAll('_', ' '),
                debit: money(charge.amount_due),
                credit: 0,
            })

            const waived = money(charge.waived_amount)
            if (waived > 0) {
                entries.push({
                    date: charge.created_at,
                    kind: 'waiver',
                    referenceId: charge.id,
                    description: 'Charge waiver',
                    debit: 0,
                    credit: waived,
                })
            }
        }

        for (const allocation of allocations) {
            const payment = allocation.club_finance_payments
            const amount = money(allocation.amount)
            const refunded = money(allocation.refunded_amount)

            if (payment && amount > 0) {
                entries.push({
                    date: payment.payment_date,
                    kind: 'payment',
                    referenceId: payment.id,
                    description:
                        payment.payment_reference
                            ? `Payment ${payment.payment_reference}`
                            : `Payment (${payment.method.replaceAll('_', ' ')})`,
                    debit: 0,
                    credit: amount,
                })
            }

            if (payment && refunded > 0) {
                entries.push({
                    date: allocation.created_at,
                    kind: 'refund',
                    referenceId: allocation.id,
                    description: 'Payment refund',
                    debit: refunded,
                    credit: 0,
                })
            }
        }

        entries.sort((left, right) =>
            left.date.localeCompare(right.date),
        )

        let runningBalance = 0
        const ledger: LedgerEntry[] = entries.map((entry) => {
            runningBalance += entry.debit - entry.credit
            return {
                ...entry,
                runningBalance,
            }
        })

        const totalDue = charges.reduce(
            (sum, charge) => sum + money(charge.amount_due),
            0,
        )
        const totalPaid = charges.reduce(
            (sum, charge) => sum + money(charge.amount_paid),
            0,
        )
        const totalWaived = charges.reduce(
            (sum, charge) => sum + money(charge.waived_amount),
            0,
        )

        return jsonResponse(
            {
                player: {
                    id: player.id,
                    fullName:
                        `${player.first_name} ${player.last_name}`.trim(),
                    email: player.email,
                    phone: player.phone,
                },
                payers: (
                    (payerResponse.data ?? []) as unknown as PayerLinkRow[]
                ).map((link) => ({
                    relationship: link.relationship,
                    isPrimary: link.is_primary,
                    payer: link.club_finance_payers,
                })),
                summary: {
                    totalDue,
                    totalPaid,
                    totalWaived,
                    outstanding: Math.max(
                        0,
                        totalDue - totalPaid - totalWaived,
                    ),
                    currency:
                        charges[0]?.currency ?? context.currency,
                },
                charges,
                allocations,
                ledger,
            },
            200,
            context.correlationId,
        )
    } catch (error) {
        await logClubFinanceFailure(
            context,
            'club_finance_ledger_failed',
            error,
            performance.now() - startedAt,
        )
        return errorResponse(error, context?.correlationId)
    }
})
