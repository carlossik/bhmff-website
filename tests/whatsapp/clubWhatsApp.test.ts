/// <reference path="./deno.d.ts" />


import {
    encryptToken,
    decryptToken,
    connectionReady,
    connectWhatsApp,
    provisionWhatsAppConnection,
    metaConfigured,
    listWhatsAppTemplates,
    buildWhatsAppTemplate,
    renderWhatsAppTemplate,
    sendClubWhatsApp,
    type WhatsAppConnection,
    type WhatsAppTemplate,
} from '../../supabase/functions/_shared/clubWhatsApp.ts'

import {
    validMetaSignature,
} from '../../supabase/functions/_shared/metaWebhookSignature.ts'

function assert(value: unknown, message = 'Assertion failed'): asserts value { if (!value) throw new Error(message) }
async function rejects(work: () => Promise<unknown> | unknown, includes?: string) {
    try { await work() } catch (error) {
        if (includes) assert(error instanceof Error && error.message.includes(includes), `Wrong error: ${String(error)}`)
        return
    }
    throw new Error('Expected rejection')
}
function setup() {
    for (const [key, value] of Object.entries({ THQ_META_APP_ID: '123', THQ_META_APP_SECRET: 'test-secret',
        THQ_META_SIGNUP_CONFIG_ID: '456', THQ_META_GRAPH_VERSION: 'v25.0', THQ_META_WEBHOOK_VERIFY_TOKEN: 'verify',
        THQ_WHATSAPP_ENCRYPTION_KEY: btoa(String.fromCharCode(...new Uint8Array(32).fill(9))) })) Deno.env.set(key, value)
    Deno.env.delete('THQ_COMMUNICATIONS_DRY_RUN')
}
const connection: WhatsAppConnection = { organisation_id: 'club-a', waba_id: '100', phone_number_id: '200',
    display_phone_number: '+441234567890', verified_name: 'Test Club', token_ciphertext: '',
    token_expires_at: null, onboarding_mode: 'business_app' }
const template: WhatsAppTemplate = { name: 'match_update', language: 'en_GB', category: 'UTILITY',
    components: [{ type: 'BODY', text: 'Match {{2}} for {{1}}.' }, { type: 'FOOTER', text: 'Club updates' }] }

Deno.test('encrypted tokens are randomised and bound to the owning club', async () => {
    setup()
    const encrypted = await encryptToken('private-token', 'club-a')
    assert(!encrypted.includes('private-token'))
    assert(encrypted !== await encryptToken('private-token', 'club-a'))
    assert(await decryptToken({ ...connection, token_ciphertext: encrypted }) === 'private-token')
    await rejects(() => decryptToken({ ...connection, organisation_id: 'club-b', token_ciphertext: encrypted }))
    const [iv, data] = encrypted.split('.')
    const tampered = `${iv}.${btoa(String.fromCharCode(...Uint8Array.from(atob(data), (c, i) => i ? c.charCodeAt(0) : c.charCodeAt(0) ^ 1)))}`
    await rejects(() => decryptToken({ ...connection, token_ciphertext: tampered }))
})
Deno.test('expired tokens and missing platform setup disable direct sends', () => {
    setup()
    assert(connectionReady(connection))
    assert(!connectionReady(null))
    assert(!connectionReady({ ...connection, token_expires_at: '2020-01-01T00:00:00Z' }))
    Deno.env.delete('THQ_META_APP_SECRET')
    assert(!connectionReady(connection))
})
Deno.test('numbered template fields use numeric ordering and render the exact sent text', () => {
    const values = { 'body:1': 'Carlos', 'body:2': 'Sunday' }
    const built = buildWhatsAppTemplate(template, values)
    assert(built.components[0].parameters[0].text === 'Carlos')
    assert(built.components[0].parameters[1].text === 'Sunday')
    assert(renderWhatsAppTemplate(template, values) === 'Match Sunday for Carlos.\n\nClub updates')
})
Deno.test('named parameters preserve Meta parameter_name', () => {
    const named: WhatsAppTemplate = { ...template, components: [{ type: 'BODY', text: 'Hello {{player_name}}' }] }
    const built = buildWhatsAppTemplate(named, { 'body:player_name': 'Alex' })
    assert(built.components[0].parameters[0].parameter_name === 'player_name')
})
Deno.test('blank, multiline, non-string and oversized template values are rejected', async () => {
    for (const invalid of ['', '   ', 'line\nbreak', 'tab\tvalue', 'x'.repeat(1025), 123]) {
        await rejects(() => buildWhatsAppTemplate(template, { 'body:1': invalid as string, 'body:2': 'Sunday' }))
    }
})
Deno.test('only approved text Utility templates are exposed, across pagination', async () => {
    setup()
    const original = globalThis.fetch
    let pages = 0
    globalThis.fetch = async (input) => {
        pages += 1
        if (pages === 2) assert(String(input).includes('after=next'))
        return Response.json({ data: pages === 1 ? [
            { ...template, status: 'APPROVED' }, { ...template, name: 'marketing', category: 'MARKETING', status: 'APPROVED' },
            { ...template, name: 'pending', status: 'PENDING' },
            { ...template, name: 'image', status: 'APPROVED', components: [{ type: 'HEADER', format: 'IMAGE' }] },
            { ...template, name: 'buttons', status: 'APPROVED', components: [{ type: 'BUTTONS' }] },
        ] : [{ ...template, name: 'page_two', status: 'APPROVED' }], paging: pages === 1 ? { next: 'ignored-untrusted-url', cursors: { after: 'next' } } : {} })
    }
    try {
        const encrypted = await encryptToken('private-token', 'club-a')
        const items = await listWhatsAppTemplates({ ...connection, token_ciphertext: encrypted })
        assert(items.map((item) => item.name).join(',') === 'match_update,page_two')
    } finally { globalThis.fetch = original }
})
Deno.test('direct send uses the club phone id, token and template, and only records acceptance', async () => {
    setup()
    const original = globalThis.fetch
    let calls = 0
    globalThis.fetch = async (input, init) => {
        calls += 1
        assert(String(input) === 'https://graph.facebook.com/v25.0/200/messages')
        assert(new Headers(init?.headers).get('Authorization') === 'Bearer private-token')
        const body = JSON.parse(String(init?.body))
        assert(body.type === 'template' && body.to === '447700900001' && body.biz_opaque_callback_data === 'delivery-id')
        assert(body.template.name === 'match_update' && !body.text)
        return Response.json({ messages: [{ id: 'wamid.test' }] })
    }
    try {
        const own = { ...connection, token_ciphertext: await encryptToken('private-token', 'club-a') }
        const result = await sendClubWhatsApp(own, '+447700900001', template, { 'body:1': 'Carlos', 'body:2': 'Sunday' }, 'delivery-id')
        assert(result.status === 'accepted' && result.provider === 'meta' && calls === 1)
        Deno.env.set('THQ_COMMUNICATIONS_DRY_RUN', 'true')
        const testResult = await sendClubWhatsApp(own, '+447700900001', template, { 'body:1': 'Carlos', 'body:2': 'Sunday' }, 'delivery-id')
        assert(testResult.providerMessageId.startsWith('dry-run-') && calls === 1)
    } finally { globalThis.fetch = original; Deno.env.delete('THQ_COMMUNICATIONS_DRY_RUN') }
})
Deno.test('webhook signatures reject modified payloads and different app secrets', async () => {
    const raw = '{"object":"whatsapp_business_account"}'
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))
    const signature = `sha256=${Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
    assert(await validMetaSignature(raw, signature, 'secret'))
    assert(!await validMetaSignature(raw + ' ', signature, 'secret'))
    assert(!await validMetaSignature(raw, signature, 'other-secret'))
    assert(!await validMetaSignature(raw, null, 'secret'))
})
Deno.test('connection rejects expired sessions before making any Meta request', async () => {
    setup()
    const original = globalThis.fetch
    globalThis.fetch = () => { throw new Error('Meta must not be called') }
    const fakeAdmin = { from: () => {
        const query: any = { delete: () => query, eq: () => query, gt: () => query,
            select: () => query, maybeSingle: () => Promise.resolve({ data: null, error: null }) }
        return query
    } }
    try { await rejects(() => connectWhatsApp(fakeAdmin as any, 'club-a', 'user', { code: 'code', wabaId: '100', phoneNumberId: '200', sessionId: 'expired' }), 'expired') }
    finally { globalThis.fetch = original }
})
Deno.test('connection checks app identity, permissions, account scope and phone ownership', async () => {
    setup()
    const original = globalThis.fetch
    let variant = 'wrong-app'
    let subscribed = false
    const fakeAdmin = { from: () => {
        const query: any = { delete: () => query, eq: () => query, gt: () => query, select: () => query,
            maybeSingle: () => Promise.resolve({ data: { onboarding_mode: 'platform' }, error: null }) }
        return query
    } }
    globalThis.fetch = async (input) => {
        const path = String(input)
        if (path.includes('oauth/access_token')) return Response.json({ access_token: 'business-token' })
        if (path.includes('debug_token')) return Response.json({ data: { is_valid: true,
            app_id: variant === 'wrong-app' ? '999' : '123',
            scopes: variant === 'missing-permission' ? [] : ['whatsapp_business_management', 'whatsapp_business_messaging'],
            granular_scopes: [{ scope: 'whatsapp_business_management', target_ids: [variant === 'wrong-account' ? '999' : '100'] }],
        } })
        if (path.includes('/phone_numbers')) return Response.json({ data: [{ id: '999', platform_type: 'CLOUD_API' }] })
        subscribed = true
        throw new Error('Unexpected external write')
    }
    try {
        for (variant of ['wrong-app', 'missing-permission', 'wrong-account', 'wrong-number']) {
            await rejects(() => connectWhatsApp(fakeAdmin as any, 'club-a', 'user', { code: 'code', wabaId: '100', phoneNumberId: '200', sessionId: 'session' }))
        }
        assert(!subscribed)
    } finally { globalThis.fetch = original }
})

Deno.test('successful connection saves only encrypted credentials and Meta-verified sender details', async () => {
    setup()
    const original = globalThis.fetch
    let saved: any = null
    let otherClub = false
    let subscriptions = 0
    const fakeAdmin = { from: (table: string) => {
        const query: any = { delete: () => query, eq: () => query, gt: () => query, select: () => query,
            maybeSingle: () => Promise.resolve({ data: table === 'whatsapp_onboarding_sessions' ? { onboarding_mode: 'business_app' }
                : otherClub ? { organisation_id: 'club-b' } : null, error: null }),
            upsert: (value: unknown) => { saved = value; return Promise.resolve({ error: null }) },
        }
        return query
    } }
    globalThis.fetch = async (input) => {
        const path = String(input)
        if (path.includes('oauth/access_token')) return Response.json({ access_token: 'private-business-token' })
        if (path.includes('debug_token')) return Response.json({ data: { is_valid: true, app_id: '123',
            scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'],
            granular_scopes: [{ scope: 'whatsapp_business_management', target_ids: ['100'] }],
            expires_at: 2000000000, data_access_expires_at: 1900000000,
        } })
        if (path.includes('/phone_numbers')) return Response.json({ data: [{ id: '200', platform_type: 'CLOUD_API', display_phone_number: '+441234567890', verified_name: 'Meta Verified Club' }] })
        if (path.includes('/subscribed_apps')) { subscriptions += 1; return Response.json({ success: true }) }
        throw new Error('Unexpected endpoint')
    }
    const input = { code: 'code', wabaId: '100', phoneNumberId: '200', sessionId: 'session' }
    try {
        await connectWhatsApp(fakeAdmin as any, 'club-a', 'user-a', input)
        assert(saved.organisation_id === 'club-a' && saved.verified_name === 'Meta Verified Club' && saved.connected_by === 'user-a')
        assert(saved.onboarding_mode === 'business_app' && saved.token_expires_at === new Date(1900000000 * 1000).toISOString())
        assert(!JSON.stringify(saved).includes('private-business-token') && subscriptions === 1)
        assert(await decryptToken(saved) === 'private-business-token')
        saved = null
        otherClub = true
        await rejects(() => connectWhatsApp(fakeAdmin as any, 'club-a', 'user-a', input), 'another club')
        assert(saved === null && subscriptions === 1)
    } finally { globalThis.fetch = original }
})

Deno.test('owned demo sender can send without enabling customer embedded signup', () => {
    setup()
    Deno.env.delete('THQ_META_SIGNUP_CONFIG_ID')
    try {
        assert(!metaConfigured(), 'customer onboarding must stay unavailable')
        assert(connectionReady(connection), 'owned sender should not depend on signup configuration')
    } finally { setup() }
})

Deno.test('operator provisioning rejects expired tokens before saving or subscribing', async () => {
    setup()
    const original = globalThis.fetch
    let calls = 0
    globalThis.fetch = async () => {
        calls++
        return Response.json({ data: { is_valid: true, app_id: '123',
            scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'], expires_at: 1 } })
    }
    try {
        await rejects(() => provisionWhatsAppConnection({ from: () => { throw new Error('Must not write') } } as any,
            'club-a', 'user-a', { token: 'secret', wabaId: '100', phoneNumberId: '200', onboardingMode: 'platform' }), 'expired')
        assert(calls === 1)
    } finally { globalThis.fetch = original }
})
