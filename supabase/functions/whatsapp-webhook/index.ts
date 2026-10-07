// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@^2'

import {
    metaEnvironment,
} from '../_shared/clubWhatsApp.ts'

import {
    validMetaSignature,
} from '../_shared/metaWebhookSignature.ts'
Deno.serve(async (request) => {
    try {
        if (request.method === 'GET') {
            const url = new URL(request.url)
            if (url.searchParams.get('hub.mode') === 'subscribe' &&
                url.searchParams.get('hub.verify_token') === metaEnvironment('THQ_META_WEBHOOK_VERIFY_TOKEN')) {
                return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 })
            }
            return new Response('Verification failed.', { status: 403 })
        }
        if (request.method !== 'POST') return new Response('Method not allowed.', { status: 405 })
        const raw = await request.text()
        if (raw.length > 1000000) return new Response('Payload too large.', { status: 413 })
        if (!await validMetaSignature(raw, request.headers.get('x-hub-signature-256'), metaEnvironment('THQ_META_APP_SECRET'))) {
            return new Response('Invalid signature.', { status: 401 })
        }
        const body = JSON.parse(raw)
        if (body.object !== 'whatsapp_business_account') return new Response('OK')
        const admin = createClient(metaEnvironment('SUPABASE_URL'), metaEnvironment('SUPABASE_SERVICE_ROLE_KEY'),
            { auth: { persistSession: false, autoRefreshToken: false } })
        for (const entry of body.entry ?? []) {
            for (const change of entry.changes ?? []) {
                if (change.field !== 'messages') continue
                const phoneId = change.value?.metadata?.phone_number_id
                if (typeof phoneId !== 'string') continue
                for (const status of change.value?.statuses ?? []) {
                    if (!['sent', 'delivered', 'read', 'failed'].includes(status.status) || typeof status.id !== 'string') continue
                    const seconds = Number(status.timestamp)
                    if (!Number.isFinite(seconds) || seconds <= 0) return new Response('Invalid timestamp.', { status: 400 })
                    const callback = status.biz_opaque_callback_data
                    const deliveryId = typeof callback === 'string' && /^[0-9a-f-]{36}$/i.test(callback) ? callback : null
                    const eventId = `${phoneId}:${status.id}:${status.status}:${status.timestamp}`
                    // The sender snapshot is committed before the outbound request. Ignore
                    // other apps' callback ids without causing endless shared-WABA retries.
                    let match = admin.from('communication_deliveries').select('id')
                        .eq('provider', 'meta').eq('whatsapp_phone_number_id', phoneId)
                    match = deliveryId ? match.eq('id', deliveryId) : match.eq('provider_message_id', status.id)
                    const { data: matched, error: matchError } = await match.maybeSingle()
                    if (matchError) return new Response('Please retry.', { status: 503 })
                    if (!matched) continue
                    const { error } = await admin.rpc('apply_meta_whatsapp_event', {
                        p_event_id: eventId, p_message_id: status.id, p_phone_number_id: phoneId,
                        p_delivery_id: deliveryId, p_status: status.status,
                        p_event_at: new Date(seconds * 1000).toISOString(),
                        p_error_code: status.errors?.[0]?.code != null ? String(status.errors[0].code) : null,
                    })
                    if (error) return new Response('Please retry.', { status: 503 })
                }
            }
        }
        return new Response('OK')
    } catch {
        // Do not log webhook bodies, tokens or provider request data.
        return new Response('Unable to process webhook.', { status: 503 })
    }
})
