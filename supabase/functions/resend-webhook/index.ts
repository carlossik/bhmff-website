import {
    createClient,
    type SupabaseClient,
} from 'npm:@supabase/supabase-js@^2'
import { Webhook } from 'npm:svix@^1'

type JsonRecord = Record<string, unknown>

type ResendWebhookEvent = {
    type: string
    created_at: string
    data: JsonRecord
}

function requiredEnvironment(name: string): string {
    const value = Deno.env.get(name)?.trim()
    if (!value) {
        throw new Error(
            `Missing required environment variable: ${name}`,
        )
    }
    return value
}

function adminClient(): SupabaseClient {
    return createClient(
        requiredEnvironment('SUPABASE_URL'),
        requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'),
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        },
    )
}

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null
}

function stringValue(
    record: JsonRecord,
    key: string,
): string | null {
    const value = record[key]
    return typeof value === 'string' && value.trim()
        ? value.trim()
        : null
}

function parseEvent(value: unknown): ResendWebhookEvent | null {
    if (!isRecord(value)) return null

    const type = stringValue(value, 'type')
    const createdAt = stringValue(value, 'created_at')
    const data = value.data

    if (!type || !createdAt || !isRecord(data)) {
        return null
    }

    return {
        type,
        created_at: createdAt,
        data,
    }
}

function nestedRecord(
    record: JsonRecord,
    key: string,
): JsonRecord | null {
    return isRecord(record[key])
        ? record[key] as JsonRecord
        : null
}

function eventDetail(event: ResendWebhookEvent): string | null {
    if (event.type === 'email.bounced') {
        const bounce = nestedRecord(event.data, 'bounce')
        if (!bounce) {
            return 'The receiving mail server rejected this email.'
        }

        const bounceSummary = [
            stringValue(bounce, 'type'),
            stringValue(bounce, 'subType'),
        ]
            .filter((value): value is string => Boolean(value))
            .join(' · ')

        const bounceMessage = stringValue(bounce, 'message')

        return bounceMessage ?? (
            bounceSummary ||
            'The receiving mail server rejected this email.'
        )
    }

    if (event.type === 'email.failed') {
        const failed = nestedRecord(event.data, 'failed')
        return failed
            ? stringValue(failed, 'reason') ??
                'Resend reports that this email could not be sent.'
            : 'Resend reports that this email could not be sent.'
    }

    if (event.type === 'email.delivery_delayed') {
        return 'The receiving mail server has temporarily delayed delivery.'
    }

    if (event.type === 'email.complained') {
        return 'The recipient marked this email as spam.'
    }

    if (event.type === 'email.suppressed') {
        return 'Resend suppressed this email before delivery.'
    }

    if (event.type === 'email.canceled') {
        return 'The email was canceled before delivery.'
    }

    return null
}

function jsonResponse(
    body: unknown,
    status = 200,
): Response {
    return new Response(
        JSON.stringify(body),
        {
            status,
            headers: {
                'Content-Type': 'application/json',
            },
        },
    )
}

Deno.serve(async (request) => {
    if (request.method !== 'POST') {
        return jsonResponse(
            { error: 'Method not allowed.' },
            405,
        )
    }

    const svixId = request.headers.get('svix-id')?.trim()
    const svixTimestamp =
        request.headers.get('svix-timestamp')?.trim()
    const svixSignature =
        request.headers.get('svix-signature')?.trim()

    if (!svixId || !svixTimestamp || !svixSignature) {
        return jsonResponse(
            { error: 'Missing webhook signature headers.' },
            400,
        )
    }

    const rawBody = await request.text()

    let verified: unknown
    try {
        const webhook = new Webhook(
            requiredEnvironment('RESEND_WEBHOOK_SECRET'),
        )

        verified = webhook.verify(
            rawBody,
            {
                'svix-id': svixId,
                'svix-timestamp': svixTimestamp,
                'svix-signature': svixSignature,
            },
        )
    } catch (caughtError) {
        console.error(
            'Rejected invalid Resend webhook signature:',
            caughtError,
        )
        return jsonResponse(
            { error: 'Invalid webhook signature.' },
            400,
        )
    }

    const event = parseEvent(verified)
    if (!event) {
        return jsonResponse(
            { error: 'Invalid Resend webhook payload.' },
            400,
        )
    }

    const emailId = stringValue(event.data, 'email_id')
    if (!emailId) {
        // The endpoint may receive a future non-email event if the Resend
        // subscription is broadened. Acknowledge it without writing data.
        return jsonResponse({ ok: true, ignored: true })
    }

    const eventCreatedAt = Number.isNaN(
        new Date(event.created_at).getTime(),
    )
        ? new Date().toISOString()
        : event.created_at

    const admin = adminClient()
    const { data, error } = await admin.rpc(
        'apply_resend_communication_event',
        {
            p_event_id: svixId,
            p_event_type: event.type,
            p_provider_message_id: emailId,
            p_event_created_at: eventCreatedAt,
            p_detail: eventDetail(event),
        },
    )

    if (error) {
        console.error(
            'Unable to apply Resend delivery event:',
            error,
        )
        // Return a retryable error. Resend uses at-least-once delivery.
        return jsonResponse(
            { error: 'Unable to process webhook.' },
            500,
        )
    }

    return jsonResponse({
        ok: true,
        result: data,
    })
})
