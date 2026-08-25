import { supabase } from '../../../lib/supabaseClient'

import type {
    ClubFixtureAvailability,
    ClubFixtureAvailabilityActionResult,
    ClubFixtureAvailabilityDeliveryStatus,
    ClubFixtureAvailabilityPreview,
    ClubFixtureAvailabilityRecipient,
    ClubFixtureAvailabilityRequestStatus,
    ClubFixtureAvailabilityResponse,
    SendClubFixtureAvailabilityInput,
} from './clubFixtureAvailabilityTypes'

type SupabaseErrorLike = {
    message: string
}

type AvailabilityRequestRow = {
    id: string
    organisation_id: string
    season_id: string
    team_id: string
    fixture_id: string
    response_deadline: string | null
    message_note: string | null
    status: ClubFixtureAvailabilityRequestStatus
    sent_at: string | null
    last_reminder_at: string | null
}

type AvailabilityRecipientRow = {
    id: string
    request_id: string
    squad_member_id: string
    player_id: string
    player_name: string
    recipient_email: string | null
    recipient_phone: string | null
    response: ClubFixtureAvailabilityResponse | null
    response_note: string | null
    responded_by_name: string | null
    responded_at: string | null
    delivery_status: ClubFixtureAvailabilityDeliveryStatus
    status_detail: string | null
    sent_at: string | null
    delivered_at: string | null
    last_reminder_at: string | null
}

function throwSupabaseError(
    error: SupabaseErrorLike | null,
    context: string,
): void {
    if (!error) return
    console.error(`${context}:`, error)
    throw new Error(error.message)
}

function mapRecipient(
    row: AvailabilityRecipientRow,
): ClubFixtureAvailabilityRecipient {
    return {
        id: row.id,
        requestId: row.request_id,
        squadMemberId: row.squad_member_id,
        playerId: row.player_id,
        playerName: row.player_name,
        recipientEmail: row.recipient_email,
        recipientPhone: row.recipient_phone,
        response: row.response,
        responseNote: row.response_note,
        respondedByName: row.responded_by_name,
        respondedAt: row.responded_at,
        deliveryStatus: row.delivery_status,
        statusDetail: row.status_detail,
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at,
        lastReminderAt: row.last_reminder_at,
    }
}

function recordOf(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('TournamentHQ returned an incomplete fixture availability response.')
    }
    return value as Record<string, unknown>
}

function numberField(record: Record<string, unknown>, key: string): number {
    return typeof record[key] === 'number' ? record[key] : 0
}

function stringField(record: Record<string, unknown>, key: string): string {
    return typeof record[key] === 'string' ? record[key] : ''
}

function nullableStringField(
    record: Record<string, unknown>,
    key: string,
): string | null {
    return typeof record[key] === 'string' ? record[key] : null
}

function actionResult(value: unknown): ClubFixtureAvailabilityActionResult {
    const record = recordOf(value)
    if (record.ok !== true || typeof record.message !== 'string') {
        throw new Error('TournamentHQ returned an incomplete fixture availability response.')
    }

    return {
        ok: true,
        action: record.action === 'remind' ? 'remind' : 'send',
        requestId: stringField(record, 'requestId'),
        attempted: numberField(record, 'attempted'),
        accepted: numberField(record, 'accepted'),
        failed: numberField(record, 'failed'),
        missingContact: numberField(record, 'missingContact'),
        phoneOnly: numberField(record, 'phoneOnly'),
        newRecipients: numberField(record, 'newRecipients'),
        message: record.message,
    }
}

function previewResult(value: unknown): ClubFixtureAvailabilityPreview {
    const record = recordOf(value)
    if (record.ok !== true || record.action !== 'preview') {
        throw new Error('TournamentHQ returned an incomplete RSVP eligibility response.')
    }

    return {
        fixtureId: stringField(record, 'fixtureId'),
        teamId: stringField(record, 'teamId'),
        teamName: stringField(record, 'teamName') || 'Team',
        ageGroup: nullableStringField(record, 'ageGroup'),
        playersPerSide: numberField(record, 'playersPerSide') || 11,
        minimumToSend: numberField(record, 'minimumToSend') || 10,
        eligiblePlayers: numberField(record, 'eligiblePlayers'),
        registeredPlayers: numberField(record, 'registeredPlayers'),
        trialists: numberField(record, 'trialists'),
        contactablePlayers: numberField(record, 'contactablePlayers'),
        emailReadyPlayers: numberField(record, 'emailReadyPlayers'),
        phoneOnlyPlayers: numberField(record, 'phoneOnlyPlayers'),
        missingContactPlayers: numberField(record, 'missingContactPlayers'),
        alreadySent: numberField(record, 'alreadySent'),
        responded: numberField(record, 'responded'),
        awaitingResponse: numberField(record, 'awaitingResponse'),
        newSendablePlayers: numberField(record, 'newSendablePlayers'),
        requestExists: record.requestExists === true,
        canSend: record.canSend === true,
        canSendNew: record.canSendNew === true,
        message: stringField(record, 'message'),
    }
}

export const clubFixtureAvailabilityService = {
    async getPreview(
        organisationId: string,
        fixtureId: string,
    ): Promise<ClubFixtureAvailabilityPreview> {
        const { data, error } = await supabase.functions.invoke(
            'fixture-rsvp-admin',
            {
                body: {
                    action: 'preview',
                    organisationId,
                    fixtureId,
                },
            },
        )

        if (error) throw new Error(error.message)
        return previewResult(data)
    },

    async getAvailability(
        organisationId: string,
        fixtureId: string,
    ): Promise<ClubFixtureAvailability | null> {
        const { data, error } = await supabase
            .from('club_fixture_availability_requests')
            .select(
                'id,organisation_id,season_id,team_id,fixture_id,response_deadline,message_note,status,sent_at,last_reminder_at',
            )
            .eq('organisation_id', organisationId)
            .eq('fixture_id', fixtureId)
            .maybeSingle()

        throwSupabaseError(error, 'Failed to load fixture availability request')
        if (!data) return null

        const request = data as AvailabilityRequestRow
        const { data: recipientData, error: recipientError } = await supabase
            .from('club_fixture_availability_recipients')
            .select(
                'id,request_id,squad_member_id,player_id,player_name,recipient_email,recipient_phone,response,response_note,responded_by_name,responded_at,delivery_status,status_detail,sent_at,delivered_at,last_reminder_at',
            )
            .eq('request_id', request.id)
            .eq('organisation_id', organisationId)
            .order('player_name')

        throwSupabaseError(recipientError, 'Failed to load fixture availability responses')

        const recipients = ((recipientData ?? []) as AvailabilityRecipientRow[])
            .map(mapRecipient)
        const missingContact = recipients.filter(
            (recipient) => !recipient.recipientEmail && !recipient.recipientPhone,
        ).length
        const phoneOnly = recipients.filter(
            (recipient) => !recipient.recipientEmail && Boolean(recipient.recipientPhone),
        ).length
        const available = recipients.filter(
            (recipient) => recipient.response === 'available',
        ).length
        const unavailable = recipients.filter(
            (recipient) => recipient.response === 'unavailable',
        ).length
        const maybe = recipients.filter(
            (recipient) => recipient.response === 'maybe',
        ).length
        const awaiting = recipients.filter(
            (recipient) => Boolean(recipient.recipientEmail) && recipient.response === null,
        ).length

        return {
            id: request.id,
            organisationId: request.organisation_id,
            seasonId: request.season_id,
            teamId: request.team_id,
            fixtureId: request.fixture_id,
            responseDeadline: request.response_deadline,
            messageNote: request.message_note,
            status: request.status,
            sentAt: request.sent_at,
            lastReminderAt: request.last_reminder_at,
            recipients,
            summary: {
                total: recipients.length,
                available,
                unavailable,
                maybe,
                awaiting,
                missingContact,
                phoneOnly,
            },
        }
    },

    async sendRequest(
        input: SendClubFixtureAvailabilityInput,
    ): Promise<ClubFixtureAvailabilityActionResult> {
        const { data, error } = await supabase.functions.invoke(
            'fixture-rsvp-admin',
            {
                body: {
                    action: 'send',
                    organisationId: input.organisationId,
                    fixtureId: input.fixtureId,
                    responseDeadline: input.responseDeadline,
                    messageNote: input.messageNote.trim() || null,
                },
            },
        )

        if (error) throw new Error(error.message)
        return actionResult(data)
    },

    async sendReminder(
        organisationId: string,
        fixtureId: string,
    ): Promise<ClubFixtureAvailabilityActionResult> {
        const { data, error } = await supabase.functions.invoke(
            'fixture-rsvp-admin',
            {
                body: {
                    action: 'remind',
                    organisationId,
                    fixtureId,
                },
            },
        )

        if (error) throw new Error(error.message)
        return actionResult(data)
    },
}
