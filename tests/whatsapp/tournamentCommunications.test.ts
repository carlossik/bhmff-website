import { encryptToken } from '../../supabase/functions/_shared/clubWhatsApp.ts'
let handler: (request: Request) => Promise<Response>
const serve = Deno.serve
;(Deno as any).serve = (callback: typeof handler) => { handler = callback; return {} }
await import('../../supabase/functions/communications/index.ts')
;(Deno as any).serve = serve
function assert(value: unknown, message = 'Assertion failed'): asserts value { if (!value) throw new Error(message) }
const org = '00000000-0000-4000-8000-000000000001'
const manager = '00000000-0000-4000-8000-000000000002'
const competition = '00000000-0000-4000-8000-000000000003'
const official = '00000000-0000-4000-8000-000000000004'
const fixtureId = '00000000-0000-4000-8000-000000000005'
const text = 'Your scheduled fixture has been updated.\n\nMatch: {{1}}\nDate: {{2}}\nKick-off: {{3}}\nVenue: {{4}}\n\nPlease check these updated details before travelling.'
const send = { competitionId: competition, routingMode: 'explicit', channels: ['email'], body: 'Fixture news',
    recipients: [{ officialUserId: official, recipientName: 'Forged', email: 'attacker@example.invalid', phone: '+449999999999' }] }
const whatsapp = { ...send, channels: ['whatsapp'], fixtureId, whatsappConsentConfirmed: true,
    whatsappTemplate: { name: 'fixture_update', language: 'en', parameters: { 'body:1': 'Home vs Away', 'body:2': '11 October 2026', 'body:3': '11:30', 'body:4': 'Arena, SE28' } } }
async function fixture(work: (state: any) => Promise<void>) {
    const fetch = globalThis.fetch, error = console.error
    console.error = () => {}
    const environment = { SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'local-test',
        THQ_META_APP_ID: '123', THQ_META_APP_SECRET: 'secret', THQ_META_SIGNUP_CONFIG_ID: '456', THQ_META_GRAPH_VERSION: 'v25.0',
        THQ_META_WEBHOOK_VERIFY_TOKEN: 'verify', THQ_WHATSAPP_ENCRYPTION_KEY: btoa(String.fromCharCode(...new Uint8Array(32).fill(9))),
        THQ_WHATSAPP_PROVIDER: 'twilio', TWILIO_ACCOUNT_SID: 'central', TWILIO_AUTH_TOKEN: 'central', TWILIO_WHATSAPP_FROM: '+441111111111',
        THQ_EMAIL_PROVIDER: 'mock', THQ_COMMUNICATIONS_DRY_RUN: 'false', THQ_WHATSAPP_DRY_RUN: 'false' }
    const previous = Object.fromEntries(Object.keys(environment).map(k => [k, Deno.env.get(k)]))
    for (const [k, v] of Object.entries(environment)) Deno.env.set(k, v)
    const encrypted = await encryptToken('organiser-owned-token', org)
    const state: any = { role: 'competition_manager', owned: true, active: true, assigned: true, consent: true, connected: true, queries: [], inserts: [], metaSends: [] }
    globalThis.fetch = async (input, init) => {
        const url = new URL(String(input)), method = init?.method ?? 'GET', headers = new Headers(init?.headers)
        const body = init?.body ? JSON.parse(String(init.body)) : null
        const table = url.pathname.split('/').at(-1)
        state.queries.push({ table, method, params: url.searchParams, body })
        if (url.hostname === 'graph.facebook.com') {
            assert(headers.get('Authorization') === 'Bearer organiser-owned-token', 'Must use organiser credentials')
            if (url.pathname.endsWith('/message_templates')) return Response.json({ data: [{ name: 'fixture_update', language: 'en', category: 'UTILITY', status: 'APPROVED', components: [{ type: 'BODY', text }] }] })
            if (url.pathname.endsWith('/200/messages')) { state.metaSends.push(body); return Response.json({ messages: [{ id: 'wamid.tournament-test' }] }) }
            throw new Error('Unexpected Meta request')
        }
        assert(url.hostname === 'localhost', 'No real database or provider')
        if (url.pathname === '/auth/v1/user') return Response.json({ id: manager, email: 'manager@example.invalid' })
        if (url.pathname.includes('/rpc/record_meta_whatsapp_submission')) return new Response(null, { status: 204 })
        if (['POST', 'PATCH', 'DELETE'].includes(method)) {
            state.inserts.push({ table, body })
            const data = { id: '00000000-0000-4000-8000-000000000010', ...body }
            return Response.json(headers.get('accept')?.includes('vnd.pgrst.object') ? data : [data])
        }
        const selectedUsers = url.searchParams.has('user_id') && table === 'organisation_memberships'
        const rows: any[] = table === 'organisations' ? [{ id: org, name: 'Festival', status: 'active', organisation_type: 'festival' }]
            : table === 'organisation_memberships' ? selectedUsers && url.searchParams.get('user_id')?.startsWith('in.') ? state.active ? [{ user_id: official, role: 'match_official' }] : [] : [{ role: state.role, active: true }]
            : table === 'competitions' ? state.owned ? [{ id: competition, name: 'Autumn Cup' }] : []
            : table === 'competition_teams' ? [{ id: 'home', team: { name: 'Home' } }, { id: 'away', team: { name: 'Away' } }]
            : table === 'competition_team_official_assignments' ? state.assigned ? [{ user_id: official, competition_team_id: 'home' }, { user_id: official, competition_team_id: 'away' }] : []
            : table === 'profiles' ? state.active ? [{ id: official, full_name: 'Real Official', email: 'official@example.invalid' }] : []
            : table === 'competition_communication_contacts' ? [{ user_id: official, phone_e164: '+447700900001', whatsapp_opt_in: state.consent }]
            : table === 'communication_templates' && state.generalTemplate ? [{ id: manager, organisation_id: null, code: 'general_operational_message', name: 'General', category: 'operational', message_class: 'service', subject_template: 'Update from {{organisation_name}}', body_template: '{{message_body}}', variables: ['message_body'], provider_template_refs: {}, system_defined: true, active: true }]
            : table === 'fixtures' ? [{ id: fixtureId, kickoff_time: '2026-10-11T10:30:00Z', status: 'scheduled', home_competition_team_id: 'home', away_competition_team_id: 'away', home: { team: { name: 'Home' } }, away: { team: { name: 'Away' } }, venue: { name: 'Arena', address: 'SE28' } }]
            : table === 'organisation_whatsapp_connections' && state.connected ? [{ organisation_id: org, waba_id: '100', phone_number_id: '200', display_phone_number: '+442222222222', verified_name: 'Festival', token_ciphertext: encrypted, token_expires_at: null, onboarding_mode: 'platform' }]
            : []
        return Response.json(rows)
    }
    try { await work(state) } finally { globalThis.fetch = fetch; console.error = error; for (const [k, v] of Object.entries(previous)) v === undefined ? Deno.env.delete(k) : Deno.env.set(k, v) }
}
async function request(action: string, extra: Record<string, unknown> = {}) {
    const response = await handler(new Request('http://local/functions/v1/communications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer local-session' }, body: JSON.stringify({ organisationId: org, competitionId: competition, action, ...extra }) }))
    return { status: response.status, body: await response.json() }
}
Deno.test('tournament access rejects unrelated competitions and non-manager roles before contacts are read', () => fixture(async state => {
    state.role = 'match_official'
    assert((await request('tournament_directory')).status === 403)
    state.role = 'competition_manager'; state.owned = false
    assert((await request('tournament_directory')).status === 404)
    assert(!state.queries.some((q: any) => q.table === 'competition_team_official_assignments'))
}))
Deno.test('directory merges team assignments and excludes inactive officials with organisation and competition filters', () => fixture(async state => {
    const result = await request('tournament_directory')
    assert(result.status === 200 && result.body.recipients.length === 1)
    assert(result.body.recipients[0].competitionTeamIds.length === 2)
    for (const table of ['competition_team_official_assignments', 'competition_communication_contacts']) {
        const q = state.queries.find((q: any) => q.table === table)
        assert(q.params.get('organisation_id') === `eq.${org}` && q.params.get('competition_id') === `eq.${competition}`)
    }
    state.active = false
    assert((await request('tournament_directory')).body.recipients.length === 0)
}))
Deno.test('tournament email resolves authoritative recipient addresses and audits competition scope', () => fixture(async state => {
    const result = await request('send', { ...send, recipients: [send.recipients[0], send.recipients[0]] })
    assert(result.status === 200 && result.body.requestedRecipients === 1)
    const message = state.inserts.find((i: any) => i.table === 'communication_messages').body
    assert(message.competition_id === competition && message.source_id === competition && message.source_type === 'competition_communication')
    const recipient = state.inserts.find((i: any) => i.table === 'communication_recipients').body
    assert(recipient.email === 'official@example.invalid' && recipient.recipient_name === 'Real Official' && recipient.official_user_id === official)
}))
Deno.test('removed assignments and forged official ids cannot create tournament messages', () => fixture(async state => {
    assert((await request('send', { ...send, recipients: [{ ...send.recipients[0], officialUserId: manager }] })).status === 403)
    state.assigned = false
    assert((await request('send', send)).status === 403)
    assert(!state.inserts.length)
}))
Deno.test('organiser WhatsApp uses organiser sender, official mobile and persisted fixture details', () => fixture(async state => {
    Deno.env.set('THQ_WHATSAPP_PROVIDER', 'mock')
    const providerStatus = await request('provider_status')
    const provider = providerStatus.body.providers.find((p: any) => p.channel === 'whatsapp')
    assert(provider.provider === 'meta' && provider.configured && !provider.dryRun)
    const result = await request('send', whatsapp)
    assert(result.status === 200 && result.body.accepted === 1)
    assert(state.metaSends.length === 1 && state.metaSends[0].to === '447700900001')
    assert(state.metaSends[0].template.components[0].parameters[0].text === 'Home vs Away')
    assert(state.inserts.some((i: any) => i.table === 'communication_deliveries' && i.body.whatsapp_phone_number_id === '200'))
}))
Deno.test('stored consent and missing organiser connection block WhatsApp without a central fallback', () => fixture(async state => {
    state.consent = false
    assert((await request('send', whatsapp)).status === 400)
    state.consent = true; state.connected = false
    assert((await request('send', whatsapp)).status === 400)
    const status = await request('provider_status')
    const wa = status.body.providers.find((p: any) => p.channel === 'whatsapp')
    assert(!wa.configured && wa.provider === 'unconfigured')
    assert(!state.inserts.length && !state.metaSends.length)
}))
Deno.test('stale or unrelated fixture review is rejected before any message is created', () => fixture(async state => {
    const changed = structuredClone(whatsapp); changed.whatsappTemplate.parameters['body:4'] = 'Old venue'
    assert((await request('send', changed)).status === 409)
    assert((await request('send', { ...whatsapp, fixtureId: manager })).status === 400)
    assert(!state.inserts.length)
}))
Deno.test('contact settings only save assigned officials and record consent actor and time', () => fixture(async state => {
    assert((await request('tournament_contact', { officialUserId: manager, phone: '+447700900001', whatsappOptIn: true })).status === 403)
    assert((await request('tournament_contact', { officialUserId: official, phone: 'bad', whatsappOptIn: true })).status === 400)
    assert((await request('tournament_contact', { officialUserId: official, phone: '+447700900001', whatsappOptIn: false })).status === 200)
    const saved = state.inserts.find((i: any) => i.table === 'competition_communication_contacts').body
    assert(saved.organisation_id === org && saved.competition_id === competition && saved.consent_recorded_by === manager && saved.whatsapp_opt_in === false)
}))
Deno.test('history filters the message competition before limiting results', () => fixture(async state => {
    assert((await request('history')).status === 200)
    const q = state.queries.find((q: any) => q.table === 'communication_deliveries' && q.params.has('limit'))
    assert(q.params.get('communication_messages.competition_id') === `eq.${competition}`)
    assert(q.params.get('organisation_id') === `eq.${org}`)
}))

Deno.test('tournament general email preserves the reviewed body and cannot route without a competition', () => fixture(async state => {
    state.generalTemplate = true
    const result = await request('send', { ...send, templateCode: 'general_operational_message' })
    assert(result.status === 200)
    const message = state.inserts.find((i: any) => i.table === 'communication_messages').body
    assert(message.body_template === 'Fixture news')
    state.inserts = []
    assert((await request('send', { ...send, competitionId: null })).status === 400)
    assert((await request('send', { ...send, body: '' })).status === 400)
    assert(state.inserts.length === 0)
}))
