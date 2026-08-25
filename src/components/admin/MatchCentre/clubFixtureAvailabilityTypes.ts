export type ClubFixtureAvailabilityResponse =
    | 'available'
    | 'unavailable'
    | 'maybe'

export type ClubFixtureAvailabilityRequestStatus =
    | 'active'
    | 'closed'
    | 'cancelled'

export type ClubFixtureAvailabilityDeliveryStatus =
    | 'queued'
    | 'accepted'
    | 'sent'
    | 'delivery_delayed'
    | 'delivered'
    | 'read'
    | 'bounced'
    | 'complained'
    | 'failed'
    | 'skipped'

export interface ClubFixtureAvailabilityRecipient {
    id: string
    requestId: string
    squadMemberId: string
    playerId: string
    playerName: string
    recipientEmail: string | null
    recipientPhone: string | null
    response: ClubFixtureAvailabilityResponse | null
    responseNote: string | null
    respondedByName: string | null
    respondedAt: string | null
    deliveryStatus: ClubFixtureAvailabilityDeliveryStatus
    statusDetail: string | null
    sentAt: string | null
    deliveredAt: string | null
    lastReminderAt: string | null
}

export interface ClubFixtureAvailabilitySummary {
    total: number
    available: number
    unavailable: number
    maybe: number
    awaiting: number
    missingContact: number
    phoneOnly: number
}

export interface ClubFixtureAvailability {
    id: string
    organisationId: string
    seasonId: string
    teamId: string
    fixtureId: string
    responseDeadline: string | null
    messageNote: string | null
    status: ClubFixtureAvailabilityRequestStatus
    sentAt: string | null
    lastReminderAt: string | null
    recipients: ClubFixtureAvailabilityRecipient[]
    summary: ClubFixtureAvailabilitySummary
}

export interface ClubFixtureAvailabilityPreview {
    fixtureId: string
    teamId: string
    teamName: string
    ageGroup: string | null
    playersPerSide: number
    minimumToSend: number
    eligiblePlayers: number
    registeredPlayers: number
    trialists: number
    contactablePlayers: number
    emailReadyPlayers: number
    phoneOnlyPlayers: number
    missingContactPlayers: number
    alreadySent: number
    responded: number
    awaitingResponse: number
    newSendablePlayers: number
    requestExists: boolean
    canSend: boolean
    canSendNew: boolean
    message: string
}

export interface SendClubFixtureAvailabilityInput {
    organisationId: string
    fixtureId: string
    responseDeadline: string | null
    messageNote: string
}

export interface ClubFixtureAvailabilityActionResult {
    ok: boolean
    action: 'send' | 'remind'
    requestId: string
    attempted: number
    accepted: number
    failed: number
    missingContact: number
    phoneOnly: number
    newRecipients: number
    message: string
}
