export type ProviderChannel =
    | 'email'
    | 'sms'
    | 'whatsapp'

export type ProviderName =
    | 'resend'
    | 'twilio'
    | 'sent'
    | 'sendmode'
    | 'mock'
    | 'unconfigured'

export type ProviderStatus = {
    channel: ProviderChannel
    provider: ProviderName
    configured: boolean
    dryRun: boolean
    detail: string
}

export type ProviderSendRequest = {
    channel: ProviderChannel
    recipientName: string
    email: string | null
    phone: string | null
    subject: string | null
    body: string
    senderName: string
    replyToEmail: string | null
    providerTemplateRef: string | null
    variables: Record<string, string>
}

export type ProviderSendResult = {
    provider: ProviderName
    status: 'accepted' | 'sent'
    providerMessageId: string | null
    providerRequestId: string | null
}

function env(name: string): string | null {
    const value = Deno.env.get(name)?.trim()
    return value ? value : null
}

function envBoolean(
    name: string,
    fallback = false,
): boolean {
    const value = env(name)
    if (!value) return fallback
    return ['1', 'true', 'yes', 'on'].includes(
        value.toLowerCase(),
    )
}

function normaliseProvider(
    value: string | null,
    fallback: ProviderName,
): ProviderName {
    const provider = value?.toLowerCase()

    if (
        provider === 'resend' ||
        provider === 'twilio' ||
        provider === 'sent' ||
        provider === 'sendmode' ||
        provider === 'mock'
    ) {
        return provider
    }

    return fallback
}

function providerForChannel(
    channel: ProviderChannel,
): ProviderName {
    if (channel === 'email') {
        return normaliseProvider(
            env('THQ_EMAIL_PROVIDER'),
            'resend',
        )
    }

    if (channel === 'sms') {
        return normaliseProvider(
            env('THQ_SMS_PROVIDER'),
            'unconfigured',
        )
    }

    return normaliseProvider(
        env('THQ_WHATSAPP_PROVIDER'),
        'unconfigured',
    )
}

function dryRunEnabled(): boolean {
    return envBoolean(
        'THQ_COMMUNICATIONS_DRY_RUN',
        false,
    )
}

function safeSenderName(value: string): string {
    return value
        .replace(/[\r\n<>]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || 'TournamentHQ'
}

function basicAuth(
    username: string,
    password: string,
): string {
    return `Basic ${btoa(`${username}:${password}`)}`
}

async function parseJsonObject(
    response: Response,
): Promise<Record<string, unknown>> {
    try {
        const value = await response.json() as unknown
        return typeof value === 'object' && value !== null
            ? value as Record<string, unknown>
            : {}
    } catch {
        return {}
    }
}

function objectValue(
    value: unknown,
): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null
        ? value as Record<string, unknown>
        : null
}

function stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim()
        ? value.trim()
        : null
}

function firstString(
    record: Record<string, unknown>,
    keys: readonly string[],
): string | null {
    for (const key of keys) {
        const value = stringValue(record[key])
        if (value) return value
    }

    return null
}

async function providerError(
    provider: ProviderName,
    response: Response,
): Promise<Error> {
    const payload = await parseJsonObject(response)
    const nestedError = objectValue(payload.error)

    const message =
        firstString(payload, [
            'message',
            'error_message',
            'error',
            'detail',
        ]) ??
        (nestedError
            ? firstString(nestedError, [
                'message',
                'detail',
                'code',
            ])
            : null) ??
        `${provider} rejected the message (${response.status}).`

    return new Error(message)
}

function toWhatsAppAddress(phone: string): string {
    return phone.startsWith('whatsapp:')
        ? phone
        : `whatsapp:${phone}`
}

async function sendResend(
    request: ProviderSendRequest,
): Promise<ProviderSendResult> {
    const apiKey = env('RESEND_API_KEY')
    const fromEmail =
        env('THQ_EMAIL_FROM') ??
        env('RESEND_FROM_EMAIL')

    if (!apiKey || !fromEmail) {
        throw new Error(
            'Resend is selected but RESEND_API_KEY and THQ_EMAIL_FROM (or RESEND_FROM_EMAIL) are not configured.',
        )
    }

    if (!request.email) {
        throw new Error(
            'The recipient does not have an email address.',
        )
    }

    const senderName = safeSenderName(
        request.senderName,
    )

    const response = await fetch(
        'https://api.resend.com/emails',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `${senderName} <${fromEmail}>`,
                to: [request.email],
                subject:
                    request.subject ??
                    `${senderName} update`,
                text: request.body,
                html: textToHtml(request.body),
                reply_to:
                    request.replyToEmail ??
                    undefined,
            }),
        },
    )

    if (!response.ok) {
        throw await providerError(
            'resend',
            response,
        )
    }

    const payload = await parseJsonObject(response)

    return {
        provider: 'resend',
        status: 'accepted',
        providerMessageId:
            firstString(payload, ['id']),
        providerRequestId:
            response.headers.get('x-request-id'),
    }
}

async function sendTwilio(
    request: ProviderSendRequest,
): Promise<ProviderSendResult> {
    const accountSid = env('TWILIO_ACCOUNT_SID')
    const authToken = env('TWILIO_AUTH_TOKEN')

    if (!accountSid || !authToken) {
        throw new Error(
            'Twilio is selected but TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are not configured.',
        )
    }

    if (!request.phone) {
        throw new Error(
            'The recipient does not have a valid phone number.',
        )
    }

    const params = new URLSearchParams()

    if (request.channel === 'sms') {
        const from = env('TWILIO_SMS_FROM')
        const messagingServiceSid =
            env('TWILIO_MESSAGING_SERVICE_SID')

        if (messagingServiceSid) {
            params.set(
                'MessagingServiceSid',
                messagingServiceSid,
            )
        } else if (from) {
            params.set('From', from)
        } else {
            throw new Error(
                'Twilio SMS requires TWILIO_SMS_FROM or TWILIO_MESSAGING_SERVICE_SID.',
            )
        }

        params.set('To', request.phone)
        params.set('Body', request.body)
    } else {
        const from = env('TWILIO_WHATSAPP_FROM')

        if (!from) {
            throw new Error(
                'Twilio WhatsApp requires TWILIO_WHATSAPP_FROM.',
            )
        }

        params.set(
            'From',
            toWhatsAppAddress(from),
        )
        params.set(
            'To',
            toWhatsAppAddress(request.phone),
        )

        if (request.providerTemplateRef) {
            params.set(
                'ContentSid',
                request.providerTemplateRef,
            )
            params.set(
                'ContentVariables',
                JSON.stringify(request.variables),
            )
        } else {
            params.set('Body', request.body)
        }
    }

    const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
        {
            method: 'POST',
            headers: {
                Authorization:
                    basicAuth(
                        accountSid,
                        authToken,
                    ),
                'Content-Type':
                    'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: params.toString(),
        },
    )

    if (!response.ok) {
        throw await providerError(
            'twilio',
            response,
        )
    }

    const payload = await parseJsonObject(response)

    return {
        provider: 'twilio',
        status: 'accepted',
        providerMessageId:
            firstString(payload, ['sid']),
        providerRequestId:
            response.headers.get('twilio-request-id'),
    }
}

async function sendSent(
    request: ProviderSendRequest,
): Promise<ProviderSendResult> {
    const apiKey = env('SENT_API_KEY')

    if (!apiKey) {
        throw new Error(
            'Sent is selected but SENT_API_KEY is not configured.',
        )
    }

    if (!request.phone) {
        throw new Error(
            'The recipient does not have a valid phone number.',
        )
    }

    if (!request.providerTemplateRef) {
        throw new Error(
            `Sent ${request.channel} requires a provider template reference for the selected TournamentHQ template.`,
        )
    }

    const headers: Record<string, string> = {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
    }

    const profileId = env('SENT_PROFILE_ID')
    if (profileId) {
        headers['x-profile-id'] = profileId
    }

    const response = await fetch(
        'https://api.sent.dm/v3/messages',
        {
            method: 'POST',
            headers,
            body: JSON.stringify({
                to: [request.phone],
                channel: [request.channel],
                sandbox: envBoolean(
                    'SENT_SANDBOX',
                    false,
                ),
                template: {
                    id: request.providerTemplateRef,
                    parameters: request.variables,
                },
            }),
        },
    )

    if (!response.ok) {
        throw await providerError(
            'sent',
            response,
        )
    }

    const payload = await parseJsonObject(response)
    const data = objectValue(payload.data)
    const recipientList =
        data && Array.isArray(data.recipients)
            ? data.recipients
            : []
    const firstRecipient =
        recipientList.length > 0
            ? objectValue(recipientList[0])
            : null

    return {
        provider: 'sent',
        status: 'accepted',
        providerMessageId:
            (firstRecipient
                ? firstString(
                    firstRecipient,
                    ['message_id', 'id'],
                )
                : null) ??
            (data
                ? firstString(
                    data,
                    ['message_id', 'id'],
                )
                : null),
        providerRequestId:
            objectValue(payload.meta)
                ? firstString(
                    objectValue(payload.meta) ?? {},
                    ['request_id'],
                )
                : null,
    }
}

async function sendSendmode(
    request: ProviderSendRequest,
): Promise<ProviderSendResult> {
    if (request.channel !== 'sms') {
        throw new Error(
            'The Sendmode adapter in Phase 4.1 is enabled for SMS only. Use Sent or Twilio for WhatsApp until Sendmode WhatsApp credentials/API are confirmed.',
        )
    }

    const apiKey = env('SENDMODE_API_KEY')
    const senderId =
        env('SENDMODE_SENDER_ID') ??
        request.senderName

    if (!apiKey) {
        throw new Error(
            'Sendmode is selected but SENDMODE_API_KEY is not configured.',
        )
    }

    if (!request.phone) {
        throw new Error(
            'The recipient does not have a valid phone number.',
        )
    }

    const message = {
        messagetext: request.body,
        senderid: safeSenderName(senderId).slice(0, 11),
        recipients: [request.phone],
        customerid: crypto.randomUUID(),
    }

    const form = new URLSearchParams()
    form.set('message', JSON.stringify(message))

    const response = await fetch(
        'https://rest.sendmode.com/v2/send',
        {
            method: 'POST',
            headers: {
                Authorization: apiKey,
                'Content-Type':
                    'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: form.toString(),
        },
    )

    if (!response.ok) {
        throw await providerError(
            'sendmode',
            response,
        )
    }

    const payload = await parseJsonObject(response)

    return {
        provider: 'sendmode',
        status: 'accepted',
        providerMessageId:
            firstString(payload, [
                'messageid',
                'message_id',
                'id',
            ]),
        providerRequestId:
            firstString(payload, [
                'requestid',
                'request_id',
            ]) ?? message.customerid,
    }
}

function textToHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>')
}

function providerConfigured(
    channel: ProviderChannel,
    provider: ProviderName,
): {
    configured: boolean
    detail: string
} {
    if (provider === 'mock') {
        return {
            configured: true,
            detail: 'Mock provider is ready for non-delivery testing.',
        }
    }

    if (provider === 'unconfigured') {
        return {
            configured: false,
            detail: `No ${channel} provider has been selected.`,
        }
    }

    if (provider === 'resend') {
        const configured = Boolean(
            env('RESEND_API_KEY') &&
            (
                env('THQ_EMAIL_FROM') ||
                env('RESEND_FROM_EMAIL')
            ),
        )

        return {
            configured,
            detail: configured
                ? 'Resend API key and sender are configured.'
                : 'Configure RESEND_API_KEY and THQ_EMAIL_FROM.',
        }
    }

    if (provider === 'twilio') {
        const baseConfigured = Boolean(
            env('TWILIO_ACCOUNT_SID') &&
            env('TWILIO_AUTH_TOKEN'),
        )

        const channelConfigured =
            channel === 'sms'
                ? Boolean(
                    env('TWILIO_SMS_FROM') ||
                    env('TWILIO_MESSAGING_SERVICE_SID'),
                )
                : Boolean(
                    env('TWILIO_WHATSAPP_FROM'),
                )

        const configured =
            baseConfigured &&
            channelConfigured

        return {
            configured,
            detail: configured
                ? `Twilio ${channel} credentials are configured.`
                : `Twilio ${channel} credentials/sender are incomplete.`,
        }
    }

    if (provider === 'sent') {
        const configured = Boolean(
            env('SENT_API_KEY'),
        )

        return {
            configured,
            detail: configured
                ? 'Sent API key is configured; provider template IDs are required per template/channel.'
                : 'Configure SENT_API_KEY before using Sent.',
        }
    }

    const configured = Boolean(
        env('SENDMODE_API_KEY'),
    ) && channel === 'sms'

    return {
        configured,
        detail: channel === 'sms'
            ? configured
                ? 'Sendmode SMS credentials are configured.'
                : 'Configure SENDMODE_API_KEY for Sendmode SMS.'
            : 'Sendmode WhatsApp is intentionally not enabled in Phase 4.1.',
    }
}

export function getProviderStatuses(): ProviderStatus[] {
    const dryRun = dryRunEnabled()

    return (
        ['email', 'sms', 'whatsapp'] as const
    ).map((channel) => {
        const provider = providerForChannel(channel)
        const status = providerConfigured(
            channel,
            provider,
        )
        const channelDryRun =
            dryRun || provider === 'mock'

        return {
            channel,
            provider,
            configured:
                channelDryRun ||
                status.configured,
            dryRun: channelDryRun,
            detail: dryRun
                ? `${status.detail} Global dry-run is ON, so no external message will be sent.`
                : provider === 'mock'
                    ? `${status.detail} No external message will be sent.`
                    : status.detail,
        }
    })
}

export function getSelectedProvider(
    channel: ProviderChannel,
): ProviderName {
    return providerForChannel(channel)
}

export async function sendWithProvider(
    request: ProviderSendRequest,
): Promise<ProviderSendResult> {
    const provider = providerForChannel(
        request.channel,
    )

    if (dryRunEnabled()) {
        return {
            provider:
                provider === 'unconfigured'
                    ? 'mock'
                    : provider,
            status: 'accepted',
            providerMessageId:
                `dry-run-${crypto.randomUUID()}`,
            providerRequestId:
                crypto.randomUUID(),
        }
    }

    if (provider === 'unconfigured') {
        throw new Error(
            `No ${request.channel} provider is configured.`,
        )
    }

    if (provider === 'mock') {
        return {
            provider: 'mock',
            status: 'accepted',
            providerMessageId:
                `mock-${crypto.randomUUID()}`,
            providerRequestId:
                crypto.randomUUID(),
        }
    }

    if (provider === 'resend') {
        if (request.channel !== 'email') {
            throw new Error(
                'Resend can only be used for email.',
            )
        }

        return sendResend(request)
    }

    if (provider === 'twilio') {
        if (request.channel === 'email') {
            throw new Error(
                'Twilio is not configured as an email provider.',
            )
        }

        return sendTwilio(request)
    }

    if (provider === 'sent') {
        if (request.channel === 'email') {
            throw new Error(
                'Sent is not configured as an email provider.',
            )
        }

        return sendSent(request)
    }

    if (provider === 'sendmode') {
        return sendSendmode(request)
    }

    throw new Error(
        `Unsupported communications provider: ${provider}`,
    )
}
