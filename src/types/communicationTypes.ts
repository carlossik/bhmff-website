export type CommunicationChannel =
    | 'email'
    | 'sms'
    | 'whatsapp'

export type CommunicationProvider =
    | 'resend'
    | 'twilio'
    | 'sent'
    | 'sendmode'
    | 'mock'
    | 'unconfigured'

export type CommunicationMessageClass =
    | 'service'
    | 'marketing'

export type CommunicationDeliveryStatus =
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

export type CommunicationRoutingMode =
    | 'auto'
    | 'explicit'

export type CommunicationTemplate = {
    id: string
    organisationId: string | null
    code: string
    name: string
    category: string
    messageClass: CommunicationMessageClass
    subjectTemplate: string | null
    bodyTemplate: string
    variables: string[]
    providerTemplateRefs: Record<string, Record<string, string>>
    systemDefined: boolean
    active: boolean
}

export type CommunicationRecipientDraft = {
    recipientName: string
    email?: string | null
    phone?: string | null
    whatsappPhone?: string | null
    playerId?: string | null
    teamId?: string | null
    contactId?: string | null
    variables?: Record<string, string | number | boolean | null>
}

export type CommunicationDirectoryRecipient = {
    key: string
    kind: 'player' | 'contact'
    recipientName: string
    email: string | null
    phone: string | null
    whatsappPhone: string | null
    playerId: string | null
    teamId: string | null
    contactId: string | null
    teamNames: string[]
    relationshipLabel: string | null
}

export type SendCommunicationInput = {
    organisationId: string
    templateCode?: string | null
    messageClass?: CommunicationMessageClass
    sourceType?: string | null
    sourceId?: string | null
    routingMode?: CommunicationRoutingMode
    /**
     * Explicit user-selected delivery channels. TournamentHQ does not silently
     * switch channels when the sender has chosen a method.
     */
    channels?: CommunicationChannel[]
    recipients: CommunicationRecipientDraft[]
    subject?: string | null
    body?: string | null
}

export type SendCommunicationResult = {
    messageId: string
    requestedRecipients: number
    requestedDeliveries: number
    accepted: number
    skipped: number
    failed: number
    status:
        | 'sent'
        | 'part_sent'
        | 'failed'
}

export type CommunicationProviderStatus = {
    channel: CommunicationChannel
    provider: CommunicationProvider
    configured: boolean
    dryRun: boolean
    detail: string
}

export type CommunicationHistoryItem = {
    deliveryId: string
    messageId: string
    recipientName: string
    channel: CommunicationChannel
    provider: CommunicationProvider
    status: CommunicationDeliveryStatus
    templateCode: string | null
    sourceType: string | null
    providerMessageId: string | null
    errorMessage: string | null
    statusDetail: string | null
    queuedAt: string
    sentAt: string | null
    delayedAt: string | null
    deliveredAt: string | null
    readAt: string | null
    bouncedAt: string | null
    complainedAt: string | null
    failedAt: string | null
    updatedAt: string
}
