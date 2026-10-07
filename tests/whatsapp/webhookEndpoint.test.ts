let handler: (request: Request) => Promise<Response>
const originalServe = Deno.serve
;(Deno as any).serve = (callback: typeof handler) => { handler = callback; return {} }
await import('../../supabase/functions/whatsapp-webhook/index.ts')
;(Deno as any).serve = originalServe
function assert(value: unknown): void { if (!value) throw new Error('Assertion failed') }
async function signed(raw: string) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('app-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))
    return `sha256=${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}
Deno.test('webhook verifies Meta challenge and raw-body signature, scopes callbacks and retries database failures', async () => {
    const originalFetch = globalThis.fetch
    for (const [key, value] of Object.entries({ THQ_META_APP_SECRET: 'app-secret', THQ_META_WEBHOOK_VERIFY_TOKEN: 'verify',
        SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'local-test' })) Deno.env.set(key, value)
    let matching = true
    let failRpc = false
    const updates: any[] = []
    globalThis.fetch = async (input, init) => {
        const url = new URL(String(input))
        assert(url.hostname === 'localhost')
        if (url.pathname.endsWith('/rpc/apply_meta_whatsapp_event')) {
            updates.push(JSON.parse(String(init?.body)))
            return failRpc ? Response.json({ code: 'P0001', message: 'Retry local test' }, { status: 500 }) : Response.json({ duplicate: false })
        }
        assert(url.searchParams.get('whatsapp_phone_number_id') === 'eq.200')
        assert(url.searchParams.get('provider') === 'eq.meta')
        return Response.json(matching ? [{ id: '00000000-0000-4000-8000-000000000010' }] : [])
    }
    try {
        const challenge = await handler(new Request('http://local/?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=1234'))
        assert(challenge.status === 200 && await challenge.text() === '1234')
        assert((await handler(new Request('http://local/?hub.mode=subscribe&hub.verify_token=wrong'))).status === 403)
        const raw = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
            metadata: { phone_number_id: '200' }, statuses: [{ id: 'wamid.test', status: 'delivered', timestamp: '1700000000', biz_opaque_callback_data: '00000000-0000-4000-8000-000000000010' }],
        } }] }] })
        const signature = await signed(raw)
        const request = (body = raw) => new Request('http://local/', { method: 'POST', headers: { 'x-hub-signature-256': signature }, body })
        assert((await handler(request(raw + ' '))).status === 401 && updates.length === 0)
        assert((await handler(request())).status === 200 && updates.length === 1)
        assert(updates[0].p_phone_number_id === '200' && updates[0].p_status === 'delivered')
        assert(!('raw' in updates[0]) && !('payload' in updates[0]))
        failRpc = true
        assert((await handler(request())).status === 503)
        matching = false
        assert((await handler(request())).status === 200 && updates.length === 2)
    } finally { globalThis.fetch = originalFetch }
})
export { };

