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
    stringArray,
    type ClubFinanceAccessContext,
} from '../_shared/clubFinance.ts'

type ChargeRow = {
    id: string
    organisation_id: string
    season_id: string
    team_id: string
    player_id: string
    squad_member_id: string | null
    fixture_id: string | null
    match_event_id: string | null
    payer_id: string | null
    charge_type_id: string | null
    fee_rule_id: string | null
    charge_type: string
    billing_period: string | null
    description: string | null
    amount_due: number | string
    amount_paid: number | string
    waived_amount: number | string
    payment_status: string
    due_date: string | null
    currency: string
    created_at: string
    club_players: {
        first_name: string
        last_name: string
    } | null
}



type FeeRuleRow = {
    id: string
    organisation_id: string
    season_id: string
    team_id: string
    charge_type_id: string
    canonical_type: string
    frequency: string
    amount: number | string
    due_day: number | null
    name: string
    description: string | null
    active: boolean
    auto_apply: boolean
    created_at: string
    updated_at: string
}

const canonicalTypes = new Set([
    'sign_on',
    'monthly_fee',
    'matchday_sub',
    'yellow_card_fine',
    'red_card_fine',
    'custom',
])

function numberValue(value: number | string): number {
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
                full:
                    action === 'waive' ||
                    action === 'delete' ||
                    action === 'save_rule' ||
                    action === 'remove_rule' ||
                    teamId === null,
                teamId,
            },
        )

        if (action === 'list_rules') {
            const seasonId = optionalString(body, 'seasonId')

            let query = context.client
                .from('club_finance_fee_rules')
                .select(`
                    id,
                    organisation_id,
                    season_id,
                    team_id,
                    charge_type_id,
                    canonical_type,
                    frequency,
                    amount,
                    due_day,
                    name,
                    description,
                    active,
                    auto_apply,
                    created_at,
                    updated_at
                `)
                .eq('organisation_id', organisationId)

            if (seasonId) {
                query = query.eq('season_id', seasonId)
            }
            if (teamId) {
                query = query.eq('team_id', teamId)
            }

            const { data, error } = await query
                .order('active', { ascending: false })
                .order('name', { ascending: true })

            if (error) {
                throw new ClubFinanceError(500, error.message)
            }

            const rows = (data ?? []) as FeeRuleRow[]

            return jsonResponse(
                {
                    rules: rows.map((row) => ({
                        id: row.id,
                        organisationId: row.organisation_id,
                        seasonId: row.season_id,
                        teamId: row.team_id,
                        chargeTypeId: row.charge_type_id,
                        canonicalType: row.canonical_type,
                        frequency: row.frequency,
                        amount: numberValue(row.amount),
                        dueDay: row.due_day,
                        name: row.name,
                        description: row.description,
                        active: row.active,
                        autoApply: row.auto_apply,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                    })),
                },
                200,
                context.correlationId,
            )
        }

        if (action === 'save_rule') {
            const seasonId = requiredString(body, 'seasonId')
            const resolvedTeamId = requiredString(body, 'teamId')
            const canonicalType = requiredString(body, 'canonicalType')
            const frequency = requiredString(body, 'frequency')
            const amount = requiredNumber(body, 'amount')
            const dueDayValue = optionalNumber(body, 'dueDay')
            const name = requiredString(body, 'name')
            const description = optionalString(body, 'description')
            const active = optionalBoolean(body, 'active') ?? true
            const autoApply = optionalBoolean(body, 'autoApply') ?? true

            const allowedRuleTypes = new Set([
                'sign_on',
                'monthly_fee',
                'matchday_sub',
            ])
            const expectedFrequency: Record<string, string> = {
                sign_on: 'once_per_season',
                monthly_fee: 'monthly',
                matchday_sub: 'per_fixture',
            }

            if (!allowedRuleTypes.has(canonicalType)) {
                throw new ClubFinanceError(
                    400,
                    'Select a supported team fee type.',
                )
            }
            if (frequency !== expectedFrequency[canonicalType]) {
                throw new ClubFinanceError(
                    400,
                    'The selected frequency does not match this fee type.',
                )
            }
            if (!Number.isFinite(amount) || amount <= 0) {
                throw new ClubFinanceError(
                    400,
                    'Enter an amount greater than zero.',
                )
            }

            const dueDay = canonicalType === 'monthly_fee'
                ? Math.trunc(dueDayValue ?? 1)
                : null

            if (
                canonicalType === 'monthly_fee' &&
                (dueDay === null || dueDay < 1 || dueDay > 28)
            ) {
                throw new ClubFinanceError(
                    400,
                    'Monthly due day must be between 1 and 28.',
                )
            }

            const { data: teamSeason, error: teamSeasonError } =
                await context.client
                    .from('club_team_seasons')
                    .select('organisation_id,season_id,team_id,payment_model,monthly_fee_amount,matchday_sub_amount,monthly_due_day')
                    .eq('organisation_id', organisationId)
                    .eq('season_id', seasonId)
                    .eq('team_id', resolvedTeamId)
                    .maybeSingle()

            if (teamSeasonError) {
                throw new ClubFinanceError(500, teamSeasonError.message)
            }
            if (!teamSeason) {
                throw new ClubFinanceError(
                    400,
                    'The selected team is not configured for this season.',
                )
            }

            const { data: chargeType, error: chargeTypeError } =
                await context.client
                    .from('club_finance_charge_types')
                    .select('id')
                    .eq('organisation_id', organisationId)
                    .eq('canonical_type', canonicalType)
                    .eq('active', true)
                    .order('system_defined', { ascending: false })
                    .limit(1)
                    .maybeSingle()

            if (chargeTypeError) {
                throw new ClubFinanceError(500, chargeTypeError.message)
            }
            if (!chargeType) {
                throw new ClubFinanceError(
                    400,
                    'The required payment type is not configured for this club.',
                )
            }

            const { data: savedRule, error: ruleError } =
                await context.client
                    .from('club_finance_fee_rules')
                    .upsert(
                        {
                            organisation_id: organisationId,
                            season_id: seasonId,
                            team_id: resolvedTeamId,
                            charge_type_id: chargeType.id,
                            canonical_type: canonicalType,
                            frequency,
                            amount,
                            due_day: dueDay,
                            name,
                            description,
                            active,
                            auto_apply: autoApply,
                            created_by: context.user.id,
                        },
                        {
                            onConflict:
                                'organisation_id,season_id,team_id,charge_type_id',
                        },
                    )
                    .select('id')
                    .single()

            if (ruleError) {
                throw new ClubFinanceError(400, ruleError.message)
            }

            if (canonicalType === 'monthly_fee') {
                const hasMatchday =
                    Number(teamSeason.matchday_sub_amount ?? 0) > 0 &&
                    (teamSeason.payment_model === 'matchday' ||
                        teamSeason.payment_model === 'hybrid')

                const { error: updateError } = await context.client
                    .from('club_team_seasons')
                    .update({
                        monthly_fee_amount: amount,
                        monthly_due_day: dueDay,
                        payment_model: hasMatchday ? 'hybrid' : 'monthly',
                    })
                    .eq('organisation_id', organisationId)
                    .eq('season_id', seasonId)
                    .eq('team_id', resolvedTeamId)

                if (updateError) {
                    throw new ClubFinanceError(400, updateError.message)
                }
            }

            if (canonicalType === 'matchday_sub') {
                const hasMonthly =
                    Number(teamSeason.monthly_fee_amount ?? 0) > 0 &&
                    (teamSeason.payment_model === 'monthly' ||
                        teamSeason.payment_model === 'hybrid')

                const { error: updateError } = await context.client
                    .from('club_team_seasons')
                    .update({
                        matchday_sub_amount: amount,
                        payment_model: hasMonthly ? 'hybrid' : 'matchday',
                    })
                    .eq('organisation_id', organisationId)
                    .eq('season_id', seasonId)
                    .eq('team_id', resolvedTeamId)

                if (updateError) {
                    throw new ClubFinanceError(400, updateError.message)
                }
            }

            let createdCount = 0
            if (active && autoApply && frequency !== 'per_fixture') {
                const { data, error } = await context.client.rpc(
                    'club_finance_apply_fee_rule',
                    {
                        p_rule_id: savedRule.id,
                        p_period: optionalDate(body, 'period'),
                    },
                )

                if (error) {
                    throw new ClubFinanceError(400, error.message)
                }
                createdCount = Number(data ?? 0)
            }

            return jsonResponse(
                {
                    ruleId: savedRule.id,
                    createdCount,
                },
                200,
                context.correlationId,
            )
        }

        if (action === 'remove_rule') {
            const ruleId = requiredString(body, 'ruleId')
            const removeUnpaidCharges =
                optionalBoolean(body, 'removeUnpaidCharges') ?? false

            const { data: ruleData, error: ruleError } =
                await context.client
                    .from('club_finance_fee_rules')
                    .select(`
                        id,
                        organisation_id,
                        season_id,
                        team_id,
                        canonical_type,
                        active
                    `)
                    .eq('organisation_id', organisationId)
                    .eq('id', ruleId)
                    .maybeSingle()

            if (ruleError) {
                throw new ClubFinanceError(500, ruleError.message)
            }
            if (!ruleData) {
                throw new ClubFinanceError(
                    404,
                    'This payment rule could not be found.',
                )
            }

            const rule = ruleData as {
                id: string
                organisation_id: string
                season_id: string
                team_id: string
                canonical_type: string
                active: boolean
            }

            const { error: deactivateError } = await context.client
                .from('club_finance_fee_rules')
                .update({
                    active: false,
                    auto_apply: false,
                })
                .eq('organisation_id', organisationId)
                .eq('id', ruleId)

            if (deactivateError) {
                throw new ClubFinanceError(400, deactivateError.message)
            }

            const { data: remainingRuleData, error: remainingRuleError } =
                await context.client
                    .from('club_finance_fee_rules')
                    .select('canonical_type,amount,due_day')
                    .eq('organisation_id', organisationId)
                    .eq('season_id', rule.season_id)
                    .eq('team_id', rule.team_id)
                    .eq('active', true)
                    .in('canonical_type', ['monthly_fee', 'matchday_sub'])

            if (remainingRuleError) {
                throw new ClubFinanceError(500, remainingRuleError.message)
            }

            const remainingRules = (remainingRuleData ?? []) as Array<{
                canonical_type: string
                amount: number | string
                due_day: number | null
            }>
            const monthlyRule = remainingRules.find(
                (item) => item.canonical_type === 'monthly_fee',
            )
            const matchdayRule = remainingRules.find(
                (item) => item.canonical_type === 'matchday_sub',
            )
            const paymentModel = monthlyRule && matchdayRule
                ? 'hybrid'
                : monthlyRule
                  ? 'monthly'
                  : matchdayRule
                    ? 'matchday'
                    : 'none'

            const { error: teamSeasonUpdateError } = await context.client
                .from('club_team_seasons')
                .update({
                    payment_model: paymentModel,
                    monthly_fee_amount: monthlyRule
                        ? numberValue(monthlyRule.amount)
                        : 0,
                    matchday_sub_amount: matchdayRule
                        ? numberValue(matchdayRule.amount)
                        : 0,
                    monthly_due_day: monthlyRule?.due_day ?? 1,
                })
                .eq('organisation_id', organisationId)
                .eq('season_id', rule.season_id)
                .eq('team_id', rule.team_id)

            if (teamSeasonUpdateError) {
                throw new ClubFinanceError(
                    400,
                    teamSeasonUpdateError.message,
                )
            }

            const { data: chargeData, error: chargeError } =
                await context.client
                    .from('club_player_charges')
                    .select('id,amount_paid,waived_amount,payment_status')
                    .eq('organisation_id', organisationId)
                    .eq('fee_rule_id', ruleId)

            if (chargeError) {
                throw new ClubFinanceError(500, chargeError.message)
            }

            const relatedCharges = (chargeData ?? []) as Array<{
                id: string
                amount_paid: number | string
                waived_amount: number | string
                payment_status: string
            }>

            let removedUnpaidCharges = 0

            if (removeUnpaidCharges) {
                const eligibleIds = relatedCharges
                    .filter((charge) =>
                        numberValue(charge.amount_paid) === 0 &&
                        numberValue(charge.waived_amount) === 0 &&
                        (charge.payment_status === 'due' ||
                            charge.payment_status === 'not_due'),
                    )
                    .map((charge) => charge.id)

                if (eligibleIds.length > 0) {
                    const { data: allocationData, error: allocationError } =
                        await context.client
                            .from('club_finance_payment_allocations')
                            .select('charge_id')
                            .eq('organisation_id', organisationId)
                            .in('charge_id', eligibleIds)

                    if (allocationError) {
                        throw new ClubFinanceError(
                            500,
                            allocationError.message,
                        )
                    }

                    const allocatedChargeIds = new Set(
                        (allocationData ?? []).map((allocation) =>
                            String(allocation.charge_id),
                        ),
                    )
                    const deletableIds = eligibleIds.filter(
                        (chargeId) => !allocatedChargeIds.has(chargeId),
                    )

                    if (deletableIds.length > 0) {
                        const { error: deleteError } = await context.client
                            .from('club_player_charges')
                            .delete()
                            .eq('organisation_id', organisationId)
                            .in('id', deletableIds)

                        if (deleteError) {
                            throw new ClubFinanceError(
                                400,
                                deleteError.message,
                            )
                        }

                        removedUnpaidCharges = deletableIds.length
                    }
                }
            }

            return jsonResponse(
                {
                    ruleId,
                    removedUnpaidCharges,
                    preservedCharges:
                        relatedCharges.length - removedUnpaidCharges,
                },
                200,
                context.correlationId,
            )
        }

        if (action === 'sync_rules') {
            const seasonId = requiredString(body, 'seasonId')
            const resolvedTeamId = optionalString(body, 'teamId')
            const period = optionalDate(body, 'period')

            let rulesQuery = context.client
                .from('club_finance_fee_rules')
                .select('id,frequency')
                .eq('organisation_id', organisationId)
                .eq('season_id', seasonId)
                .eq('active', true)
                .eq('auto_apply', true)
                .in('frequency', ['monthly', 'once_per_season'])

            if (resolvedTeamId) {
                rulesQuery = rulesQuery.eq('team_id', resolvedTeamId)
            }

            const { data: rules, error: rulesError } = await rulesQuery

            if (rulesError) {
                throw new ClubFinanceError(500, rulesError.message)
            }

            let createdCount = 0
            for (const rule of rules ?? []) {
                const { data, error } = await context.client.rpc(
                    'club_finance_apply_fee_rule',
                    {
                        p_rule_id: rule.id,
                        p_period: period,
                    },
                )
                if (error) {
                    throw new ClubFinanceError(400, error.message)
                }
                createdCount += Number(data ?? 0)
            }

            return jsonResponse(
                { createdCount },
                200,
                context.correlationId,
            )
        }

        if (action === 'list') {
            const seasonId = optionalString(body, 'seasonId')
            const status = optionalString(body, 'status')
            const playerId = optionalString(body, 'playerId')

            let query = context.client
                .from('club_player_charges')
                .select(`
                    id,
                    organisation_id,
                    season_id,
                    team_id,
                    player_id,
                    squad_member_id,
                    fixture_id,
                    match_event_id,
                    payer_id,
                    charge_type_id,
                    fee_rule_id,
                    charge_type,
                    billing_period,
                    description,
                    amount_due,
                    amount_paid,
                    waived_amount,
                    payment_status,
                    due_date,
                    currency,
                    created_at,
                    club_players!club_player_charges_player_id_fkey (
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
            if (status) {
                query = query.eq('payment_status', status)
            }
            if (playerId) {
                query = query.eq('player_id', playerId)
            }

            const { data, error } = await query
                .order('due_date', {
                    ascending: true,
                    nullsFirst: false,
                })
                .order('created_at', {
                    ascending: false,
                })

            if (error) {
                throw new ClubFinanceError(500, error.message)
            }

            const rows = (data ?? []) as unknown as ChargeRow[]

            return jsonResponse(
                {
                    charges: rows.map((row) => {
                        const due = numberValue(row.amount_due)
                        const paid = numberValue(row.amount_paid)
                        const waived = numberValue(row.waived_amount)

                        return {
                            id: row.id,
                            organisationId: row.organisation_id,
                            seasonId: row.season_id,
                            teamId: row.team_id,
                            playerId: row.player_id,
                            squadMemberId: row.squad_member_id,
                            fixtureId: row.fixture_id,
                            matchEventId: row.match_event_id,
                            payerId: row.payer_id,
                            chargeTypeId: row.charge_type_id,
                            feeRuleId: row.fee_rule_id,
                            chargeType: row.charge_type,
                            billingPeriod: row.billing_period,
                            description: row.description,
                            amountDue: due,
                            amountPaid: paid,
                            waivedAmount: waived,
                            outstandingAmount: Math.max(
                                0,
                                due - paid - waived,
                            ),
                            status: row.payment_status,
                            dueDate: row.due_date,
                            currency: row.currency,
                            createdAt: row.created_at,
                            playerName: row.club_players
                                ? `${row.club_players.first_name} ${row.club_players.last_name}`.trim()
                                : 'Player',
                        }
                    }),
                },
                200,
                context.correlationId,
            )
        }

        if (action === 'create') {
            const seasonId = requiredString(body, 'seasonId')
            const resolvedTeamId = requiredString(body, 'teamId')
            const playerId = requiredString(body, 'playerId')
            const chargeType = requiredString(body, 'chargeType')
            const chargeTypeId = optionalString(body, 'chargeTypeId')
            const feeRuleId = optionalString(body, 'feeRuleId')
            const amountDue = requiredNumber(body, 'amountDue')
            const dueDate = optionalDate(body, 'dueDate')
            const billingPeriod = optionalDate(
                body,
                'billingPeriod',
            )
            const description = optionalString(
                body,
                'description',
            )
            const payerId = optionalString(body, 'payerId')
            const fixtureId = optionalString(body, 'fixtureId')
            const squadMemberId = optionalString(
                body,
                'squadMemberId',
            )

            if (!canonicalTypes.has(chargeType)) {
                throw new ClubFinanceError(
                    400,
                    'chargeType is invalid.',
                )
            }

            if (amountDue < 0) {
                throw new ClubFinanceError(
                    400,
                    'amountDue cannot be negative.',
                )
            }

            const { data: player, error: playerError } =
                await context.client
                    .from('club_players')
                    .select('id')
                    .eq('id', playerId)
                    .eq('organisation_id', organisationId)
                    .maybeSingle()

            if (playerError) {
                throw new ClubFinanceError(
                    500,
                    playerError.message,
                )
            }
            if (!player) {
                throw new ClubFinanceError(
                    400,
                    'The selected player is invalid.',
                )
            }

            if (feeRuleId) {
                const { data: feeRule, error: feeRuleError } =
                    await context.client
                        .from('club_finance_fee_rules')
                        .select('id,canonical_type')
                        .eq('id', feeRuleId)
                        .eq('organisation_id', organisationId)
                        .eq('season_id', seasonId)
                        .eq('team_id', resolvedTeamId)
                        .eq('active', true)
                        .maybeSingle()

                if (feeRuleError) {
                    throw new ClubFinanceError(500, feeRuleError.message)
                }
                if (!feeRule || feeRule.canonical_type !== chargeType) {
                    throw new ClubFinanceError(
                        400,
                        'The selected team payment rule does not match this fee type.',
                    )
                }
            }

            const status =
                dueDate &&
                dueDate > new Date().toISOString().slice(0, 10)
                    ? 'not_due'
                    : 'due'

            const { data, error } = await context.client
                .from('club_player_charges')
                .insert({
                    organisation_id: organisationId,
                    season_id: seasonId,
                    team_id: resolvedTeamId,
                    player_id: playerId,
                    squad_member_id: squadMemberId,
                    fixture_id: fixtureId,
                    payer_id: payerId,
                    charge_type_id: chargeTypeId,
                    fee_rule_id: feeRuleId,
                    charge_type: chargeType,
                    billing_period: billingPeriod,
                    description,
                    amount_due: amountDue,
                    amount_paid: 0,
                    payment_status: status,
                    due_date: dueDate,
                    currency: context.currency,
                    created_by: context.user.id,
                })
                .select('id')
                .single()

            if (error) {
                throw new ClubFinanceError(400, error.message)
            }

            return jsonResponse(
                { chargeId: data.id },
                201,
                context.correlationId,
            )
        }

        if (action === 'bulk_monthly') {
            const seasonId = requiredString(body, 'seasonId')
            const resolvedTeamId = requiredString(body, 'teamId')
            const billingPeriod = optionalDate(
                body,
                'billingPeriod',
            )
            const dueDate = optionalDate(body, 'dueDate')

            const { data, error } = await context.client.rpc(
                'club_finance_generate_monthly_charges',
                {
                    p_organisation_id: organisationId,
                    p_season_id: seasonId,
                    p_team_id: resolvedTeamId,
                    p_billing_period: billingPeriod,
                    p_due_date: dueDate,
                },
            )

            if (error) {
                throw new ClubFinanceError(400, error.message)
            }

            return jsonResponse(
                { createdCount: Number(data ?? 0) },
                200,
                context.correlationId,
            )
        }

        if (action === 'bulk_matchday') {
            const seasonId = requiredString(body, 'seasonId')
            const resolvedTeamId = requiredString(body, 'teamId')
            const fixtureId = requiredString(body, 'fixtureId')
            const squadMemberIds = stringArray(
                body,
                'squadMemberIds',
            )
            const dueDate = optionalDate(body, 'dueDate')

            const { data, error } = await context.client.rpc(
                'club_finance_generate_matchday_charges',
                {
                    p_organisation_id: organisationId,
                    p_season_id: seasonId,
                    p_team_id: resolvedTeamId,
                    p_fixture_id: fixtureId,
                    p_squad_member_ids: squadMemberIds,
                    p_due_date: dueDate,
                },
            )

            if (error) {
                throw new ClubFinanceError(400, error.message)
            }

            return jsonResponse(
                { createdCount: Number(data ?? 0) },
                200,
                context.correlationId,
            )
        }

        if (action === 'fine') {
            const seasonId = requiredString(body, 'seasonId')
            const resolvedTeamId = requiredString(body, 'teamId')
            const fixtureId = requiredString(body, 'fixtureId')
            const playerId = requiredString(body, 'playerId')
            const matchEventId = optionalString(
                body,
                'matchEventId',
            )
            const offence = requiredString(body, 'offence')
            const dueDate = optionalDate(body, 'dueDate')
            const description = optionalString(
                body,
                'description',
            )

            const { data, error } = await context.client.rpc(
                'club_finance_create_card_fine',
                {
                    p_organisation_id: organisationId,
                    p_season_id: seasonId,
                    p_team_id: resolvedTeamId,
                    p_fixture_id: fixtureId,
                    p_player_id: playerId,
                    p_match_event_id: matchEventId,
                    p_offence: offence,
                    p_due_date: dueDate,
                    p_description: description,
                },
            )

            if (error) {
                throw new ClubFinanceError(400, error.message)
            }

            return jsonResponse(
                { chargeId: data },
                201,
                context.correlationId,
            )
        }

        if (action === 'waive') {
            const chargeId = requiredString(body, 'chargeId')
            const amount = requiredNumber(body, 'amount')
            const reason = requiredString(body, 'reason')

            const { error } = await context.client.rpc(
                'club_finance_waive_charge',
                {
                    p_charge_id: chargeId,
                    p_amount: amount,
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
            const chargeId = requiredString(body, 'chargeId')

            const { error } = await context.client
                .from('club_player_charges')
                .delete()
                .eq('id', chargeId)
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

        if (action === 'update') {
            const chargeId = requiredString(body, 'chargeId')
            const amountDue = optionalNumber(body, 'amountDue')
            const dueDate = optionalDate(body, 'dueDate')
            const description = optionalString(
                body,
                'description',
            )

            const updates: Record<string, unknown> = {}

            if (amountDue !== null) {
                if (amountDue < 0) {
                    throw new ClubFinanceError(
                        400,
                        'amountDue cannot be negative.',
                    )
                }
                updates.amount_due = amountDue
            }

            if ('dueDate' in body) {
                updates.due_date = dueDate
            }
            if ('description' in body) {
                updates.description = description
            }

            if (Object.keys(updates).length === 0) {
                throw new ClubFinanceError(
                    400,
                    'No charge changes were provided.',
                )
            }

            const { error } = await context.client
                .from('club_player_charges')
                .update(updates)
                .eq('id', chargeId)
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
            `Unsupported charge action: ${action}`,
        )
    } catch (error) {
        await logClubFinanceFailure(
            context,
            'club_finance_charges_failed',
            error,
            performance.now() - startedAt,
        )

        return errorResponse(
            error,
            context?.correlationId,
        )
    }
})
