import { encryptToken } from '../../supabase/functions/_shared/clubWhatsApp.ts'

let handler: (request: Request) => Promise<Response>
const originalServe = Deno.serve
;(Deno as any).serve = (callback: typeof handler) => { handler = callback; return {} }
await import('../../supabase/functions/communications/index.ts')
;(Deno as any).serve = originalServe

function assert(value: unknown, message = 'Assertion failed'): asserts value { if (!value) throw new Error(message) }
const organisationId = '00000000-0000-4000-8000-000000000001'
const userId = '00000000-0000-4000-8000-000000000002'

async function fixture(work: (state: any) => Promise<void>) {
    const originalFetch = globalThis.fetch
    const originalError = console.error
    console.error = () => {}
    for (const [key, value] of Object.entries({ SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'local-test',
        THQ_META_APP_ID: '123', THQ_META_APP_SECRET: 'secret', THQ_META_SIGNUP_CONFIG_ID: '456', THQ_META_GRAPH_VERSION: 'v25.0',
        THQ_META_WEBHOOK_VERIFY_TOKEN: 'verify', THQ_WHATSAPP_ENCRYPTION_KEY: btoa(String.fromCharCode(...new Uint8Array(32).fill(9))),
        THQ_WHATSAPP_PROVIDER: 'twilio', TWILIO_ACCOUNT_SID: 'central-account', TWILIO_AUTH_TOKEN: 'central-token', TWILIO_WHATSAPP_FROM: '+441111111111' })) Deno.env.set(key, value)
    Deno.env.delete('THQ_COMMUNICATIONS_DRY_RUN')
    const state: any = { role: 'super_admin', type: 'club', connected: false, optedOut: false, inserts: [], metaSends: [], queries: [] }
    const encrypted = await encryptToken('club-owned-token', organisationId)
    globalThis.fetch = async (input, init) => {
        const url = new URL(String(input))
        const method = init?.method ?? 'GET'
        const headers = new Headers(init?.headers)
        const body = init?.body ? JSON.parse(String(init.body)) : null
        state.queries.push({ path: url.pathname, params: url.search, method, body })
        if (url.hostname === 'graph.facebook.com') {
            assert(headers.get('Authorization') === 'Bearer club-owned-token')
            if (url.pathname.endsWith('/message_templates')) return Response.json({ data: [{ name: 'club_update', language: 'en_GB', category: 'UTILITY', status: 'APPROVED', components: [{ type: 'BODY', text: 'Training {{1}}' }] }] })
            if (url.pathname.endsWith('/200/messages')) { state.metaSends.push(body); return Response.json({ messages: [{ id: 'wamid.endpoint-test' }] }) }
            throw new Error('Unexpected Meta request')
        }
        assert(url.hostname === 'localhost', 'No real provider should be called')
        if (url.pathname === '/auth/v1/user') return Response.json({ id: userId, email: 'admin@example.invalid' })
        if (url.pathname.includes('/rpc/record_meta_whatsapp_submission')) return new Response(null, { status: 204 })
        const table = url.pathname.split('/').at(-1)
        if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
            if (method === 'POST') state.inserts.push({ table, body })
            const data = { id: '00000000-0000-4000-8000-000000000010', ...body }
            return Response.json(headers.get('accept')?.includes('vnd.pgrst.object') ? data : [data])
        }
        const rows: any[] = table === 'organisations' ? [{ id: organisationId, name: 'Test Club', status: 'active', organisation_type: state.type }]
            : table === 'organisation_memberships' ? [{ role: state.role, active: true }]
            : table === 'club_finance_access' && state.role === 'treasurer' ? [{ role: 'treasurer', active: true }]
            : table === 'organisation_whatsapp_connections' && state.connected ? [{ organisation_id: organisationId, waba_id: '100', phone_number_id: '200',
                display_phone_number: '+442222222222', verified_name: 'Test Club', token_ciphertext: encrypted, token_expires_at: null, onboarding_mode: 'platform' }]
            : table === 'communication_contacts' && state.optedOut ? [{ id: 'opted-out' }]
            : []
        return Response.json(rows)
    }
    try { await work(state) } finally { globalThis.fetch = originalFetch; console.error = originalError }
}
async function request(action: string, extra: Record<string, unknown> = {}, authenticated = true) {
    const response = await handler(new Request('http://local/functions/v1/communications', { method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer local-session' } : {}) },
        body: JSON.stringify({ organisationId, action, ...extra }) }))
    return { status: response.status, body: await response.json() }
}
const sendInput = { routingMode: 'explicit', channels: ['whatsapp'], body: 'Original draft',
    recipients: [{ recipientName: 'Alex', phone: '+447700900001' }],
    whatsappTemplate: { name: 'club_update', language: 'en_GB', parameters: { 'body:1': 'Sunday' } } }

Deno.test('endpoint rejects missing authentication and unauthorised memberships', () => fixture(async (state) => {
    assert((await request('whatsapp_status', {}, false)).status === 401)
    state.role = 'content_editor'
    assert((await request('whatsapp_begin', { onboardingMode: 'platform' })).status === 403)
}))
Deno.test('finance users can inspect sender availability but cannot connect accounts', () => fixture(async (state) => {
    state.role = 'treasurer'
    const status = await request('whatsapp_status')
    assert(status.status === 200 && status.body.canManage === false)
    assert((await request('whatsapp_begin', { onboardingMode: 'business_app' })).status === 403)
}))
Deno.test('club status never advertises the central sender; non-club providers stay unchanged', () => fixture(async (state) => {
    const club = await request('provider_status')
    const clubProvider = club.body.providers.find((item: any) => item.channel === 'whatsapp')
    assert(clubProvider.provider === 'unconfigured' && !clubProvider.configured)
    state.type = 'festival'
    const festival = await request('provider_status')
    const provider = festival.body.providers.find((item: any) => item.channel === 'whatsapp')
    assert(provider.provider === 'twilio' && provider.configured)
    assert((await request('whatsapp_begin', { onboardingMode: 'platform' })).status === 403)
}))
Deno.test('club direct sends reject missing connections and consent before creating a message', () => fixture(async (state) => {
    assert((await request('send', { ...sendInput, whatsappConsentConfirmed: true })).status === 400)
    state.connected = true
    assert((await request('send', sendInput)).status === 400)
    assert((await request('send', { ...sendInput, channels: ['whatsapp', 'email'], whatsappConsentConfirmed: true })).status === 400)
    assert(state.inserts.length === 0 && state.metaSends.length === 0)
}))
Deno.test('club sends use only the own sender, snapshot consent and audit the exact template text', () => fixture(async (state) => {
    state.connected = true
    const result = await request('send', { ...sendInput, whatsappConsentConfirmed: true })
    assert(result.status === 200 && result.body.accepted === 1, JSON.stringify(result))
    assert(state.metaSends.length === 1 && state.metaSends[0].template.name === 'club_update')
    const message = state.inserts.find((item: any) => item.table === 'communication_messages')
    assert(message.body.body_template === 'Training Sunday')
    const snapshot = state.queries.find((item: any) => item.body?.whatsapp_phone_number_id)
    assert(snapshot.body.whatsapp_phone_number_id === '200' && snapshot.body.whatsapp_consent_confirmed_by === userId)
    const status = await request('whatsapp_status')
    assert(!JSON.stringify(status.body).includes('token_ciphertext') && !JSON.stringify(status.body).includes('club-owned-token'))
}))
Deno.test('stored WhatsApp opt-outs block sends even when a caller confirms consent', () => fixture(async (state) => {
    state.connected = true
    state.optedOut = true
    const result = await request('send', { ...sendInput, whatsappConsentConfirmed: true })
    assert(result.status === 200 && result.body.failed === 1 && result.body.accepted === 0)
    assert(state.metaSends.length === 0)
}))
Deno.test('automatic routing does not send a club template without explicit review', () => fixture(async (state) => {
    state.connected = true
    const result = await request('send', { ...sendInput, channels: undefined, routingMode: 'auto' })
    assert(result.status === 200 && result.body.skipped === 1 && state.metaSends.length === 0)
}))
