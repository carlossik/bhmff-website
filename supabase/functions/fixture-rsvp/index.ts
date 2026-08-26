import {
    createClient,
    type SupabaseClient,
} from 'npm:@supabase/supabase-js@^2'

type AvailabilityResponse = 'available' | 'unavailable' | 'maybe'
type JsonRecord = Record<string, unknown>

type TokenRow = {
    id: string
    recipient_id: string
    expires_at: string | null
    revoked_at: string | null
}

type RecipientRow = {
    id: string
    request_id: string
    organisation_id: string
    fixture_id: string
    player_name: string
    response: AvailabilityResponse | null
    response_note: string | null
    responded_by_name: string | null
    responded_at: string | null
}

type RequestRow = {
    id: string
    response_deadline: string | null
    message_note: string | null
    status: 'active' | 'closed' | 'cancelled'
}

type FixtureRow = {
    id: string
    team_id: string
    opponent_id: string | null
    fixture_date: string
    kickoff_time: string | null
    home_away: 'home' | 'away' | 'neutral'
    fixture_type: string
    match_format: '5v5' | '7v7' | '9v9' | '11v11'
    venue_name: string | null
    venue_address: string | null
    status: string
}

type PageContext = {
    token: string
    recipient: RecipientRow
    request: RequestRow
    fixture: FixtureRow
    organisationName: string
    teamName: string
    opponentName: string
    closedReason: string | null
}

const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
}

function requiredEnvironment(name: string): string {
    const value = Deno.env.get(name)?.trim()
    if (!value) throw new Error(`Missing required environment variable: ${name}`)
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

function page(html: string, status = 200): Response {
    return new Response(html, { status, headers })
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function titleCase(value: string): string {
    return value
        .split('_')
        .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
        .join(' ')
}

function formatDate(value: string): string {
    const date = new Date(`${value}T12:00:00Z`)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/London',
    }).format(date)
}

function formatDeadline(value: string | null): string | null {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/London',
    }).format(date)
}

function fixtureTitle(context: PageContext): string {
    return context.fixture.home_away === 'away'
        ? `${context.opponentName} v ${context.teamName}`
        : `${context.teamName} v ${context.opponentName}`
}

async function sha256Hex(value: string): Promise<string> {
    const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(value),
    )
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
}

function tokenFromRequest(request: Request): string | null {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')?.trim()
    return token || null
}

function validTokenFormat(value: string): boolean {
    return /^[0-9a-f]{64}$/i.test(value)
}

function responseValue(value: FormDataEntryValue | null): AvailabilityResponse | null {
    if (value === 'available' || value === 'unavailable' || value === 'maybe') {
        return value
    }
    return null
}

async function loadContext(token: string): Promise<PageContext | null> {
    const admin = adminClient()
    const tokenHash = await sha256Hex(token)

    const { data: tokenData, error: tokenError } = await admin
        .from('club_fixture_availability_tokens')
        .select('id,recipient_id,expires_at,revoked_at')
        .eq('token_hash', tokenHash)
        .maybeSingle()

    if (tokenError) throw tokenError
    if (!tokenData) return null

    const tokenRow = tokenData as TokenRow
    if (tokenRow.revoked_at) return null

    let closedReason: string | null = null
    if (tokenRow.expires_at) {
        const expiry = new Date(tokenRow.expires_at)
        if (!Number.isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
            closedReason = 'This availability link has expired.'
        }
    }

    const { data: recipientData, error: recipientError } = await admin
        .from('club_fixture_availability_recipients')
        .select('id,request_id,organisation_id,fixture_id,player_name,response,response_note,responded_by_name,responded_at')
        .eq('id', tokenRow.recipient_id)
        .maybeSingle()

    if (recipientError) throw recipientError
    if (!recipientData) return null

    const recipient = recipientData as RecipientRow

    const [requestResult, fixtureResult, organisationResult] = await Promise.all([
        admin
            .from('club_fixture_availability_requests')
            .select('id,response_deadline,message_note,status')
            .eq('id', recipient.request_id)
            .maybeSingle(),
        admin
            .from('club_fixtures')
            .select('id,team_id,opponent_id,fixture_date,kickoff_time,home_away,fixture_type,match_format,venue_name,venue_address,status')
            .eq('id', recipient.fixture_id)
            .maybeSingle(),
        admin
            .from('organisations')
            .select('name')
            .eq('id', recipient.organisation_id)
            .maybeSingle(),
    ])

    if (requestResult.error) throw requestResult.error
    if (fixtureResult.error) throw fixtureResult.error
    if (organisationResult.error) throw organisationResult.error
    if (!requestResult.data || !fixtureResult.data || !organisationResult.data) {
        return null
    }

    const requestRow = requestResult.data as RequestRow
    const fixture = fixtureResult.data as FixtureRow

    if (requestRow.status !== 'active') {
        closedReason = requestRow.status === 'cancelled'
            ? 'This availability request has been cancelled.'
            : 'This availability request is closed.'
    }

    if (requestRow.response_deadline) {
        const deadline = new Date(requestRow.response_deadline)
        if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()) {
            closedReason = 'The response deadline for this fixture has passed.'
        }
    }

    if (['cancelled', 'abandoned', 'played', 'postponed'].includes(fixture.status)) {
        closedReason = `This fixture is ${fixture.status}.`
    }

    const [teamResult, opponentResult] = await Promise.all([
        admin
            .from('teams')
            .select('name')
            .eq('id', fixture.team_id)
            .maybeSingle(),
        fixture.opponent_id
            ? admin
                .from('club_opponents')
                .select('name')
                .eq('id', fixture.opponent_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
    ])

    if (teamResult.error) throw teamResult.error
    if (opponentResult.error) throw opponentResult.error

    return {
        token,
        recipient,
        request: requestRow,
        fixture,
        organisationName: organisationResult.data.name ?? 'TournamentHQ club',
        teamName: teamResult.data?.name ?? 'Your team',
        opponentName: opponentResult.data?.name ?? 'Opponent TBC',
        closedReason,
    }
}

function responseLabel(value: AvailabilityResponse): string {
    if (value === 'available') return 'Available'
    if (value === 'unavailable') return 'Not available'
    return 'Not sure yet'
}

function responseTone(value: AvailabilityResponse): string {
    if (value === 'available') return '#65a30d'
    if (value === 'unavailable') return '#dc2626'
    return '#d97706'
}

function documentShell(title: string, content: string): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#071006;color:#fff;font-family:Inter,Arial,sans-serif}.page{min-height:100vh;padding:24px 14px 48px}.wrap{width:min(680px,100%);margin:0 auto}.brand{font-size:22px;font-weight:900;letter-spacing:-.03em}.brand span{color:#84cc16}.eyebrow{margin-top:5px;color:#9da99a;font-size:12px}.card{margin-top:20px;background:#10190f;border:1px solid #315125;border-radius:22px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.28)}.hero{padding:24px;border-bottom:1px solid #315125;background:linear-gradient(135deg,#14230f,#0b150a)}h1{margin:0;font-size:clamp(24px,5vw,34px);line-height:1.15}h2{margin:9px 0 0;font-size:18px;color:#c8d4c5}.body{padding:24px}.details{display:grid;grid-template-columns:105px 1fr;gap:9px 14px;font-size:14px;line-height:1.5}.details .key{color:#93a08f}.note{margin-top:20px;padding:14px;border-radius:13px;background:#0a1309;border:1px solid #253d1d;color:#d9e3d6;line-height:1.55}.question{margin:24px 0 12px;font-size:17px;font-weight:900}.options{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.choice{border:0;border-radius:12px;padding:13px 9px;font-size:13px;font-weight:900;cursor:pointer}.yes{background:#84cc16;color:#071006}.no{background:#3d1717;color:#fecaca;border:1px solid #7f1d1d}.maybe{background:#3a2a0e;color:#fde68a;border:1px solid #854d0e}label{display:block;margin-top:18px;font-size:12px;font-weight:800;color:#aab6a6}input,textarea{margin-top:7px;width:100%;border:1px solid #315125;border-radius:11px;background:#071006;color:#fff;padding:12px 13px;font:inherit;outline:none}textarea{min-height:88px;resize:vertical}.hint{margin:16px 0 0;font-size:12px;line-height:1.55;color:#849181}.status{padding:14px 16px;border-radius:13px;background:#0b160a;border:1px solid #315125}.closed{border-color:#805d1d;background:#2c220e;color:#fde68a}.success{border-color:#4d7c0f;background:#13240d}.footer{margin-top:18px;text-align:center;color:#6f7c6d;font-size:11px}@media(max-width:540px){.options{grid-template-columns:1fr}.details{grid-template-columns:88px 1fr}.hero,.body{padding:20px}}
</style>
</head>
<body><main class="page"><div class="wrap"><div class="brand">Tournament<span>HQ</span></div><div class="eyebrow">Secure match availability response</div>${content}<div class="footer">TournamentHQ · fixture availability</div></div></main></body></html>`
}

function renderForm(context: PageContext): string {
    const title = fixtureTitle(context)
    const deadline = formatDeadline(context.request.response_deadline)
    const venue = [context.fixture.venue_name, context.fixture.venue_address]
        .filter((value): value is string => Boolean(value?.trim()))
        .map(escapeHtml)
        .join('<br>')
    const existing = context.recipient.response
    const existingStatus = existing
        ? `<div class="status success" style="margin-bottom:18px"><strong>Current response: ${escapeHtml(responseLabel(existing))}</strong>${context.recipient.responded_at ? `<br><span style="font-size:12px;color:#afbea9">You can update it below while the request is open.</span>` : ''}</div>`
        : ''
    const note = context.request.message_note
        ? `<div class="note"><strong>Manager note</strong><br>${escapeHtml(context.request.message_note).replaceAll('\n', '<br>')}</div>`
        : ''

    if (context.closedReason) {
        return documentShell(
            `${title} · availability`,
            `<section class="card"><div class="hero"><h1>${escapeHtml(title)}</h1><h2>${escapeHtml(context.recipient.player_name)}</h2></div><div class="body"><div class="status closed"><strong>Responses are closed</strong><br>${escapeHtml(context.closedReason)}</div>${existing ? `<p class="hint">Your last recorded response was <strong style="color:#fff">${escapeHtml(responseLabel(existing))}</strong>.</p>` : ''}</div></section>`,
        )
    }

    return documentShell(
        `${title} · availability`,
        `<section class="card">
<div class="hero"><h1>${escapeHtml(title)}</h1><h2>Can ${escapeHtml(context.recipient.player_name)} play?</h2></div>
<div class="body">
${existingStatus}
<div class="details">
<div class="key">Club</div><div>${escapeHtml(context.organisationName)}</div>
<div class="key">Date</div><div><strong>${escapeHtml(formatDate(context.fixture.fixture_date))}</strong></div>
<div class="key">Kick-off</div><div>${escapeHtml(context.fixture.kickoff_time?.slice(0, 5) || 'TBC')}</div>
<div class="key">Fixture</div><div>${escapeHtml(titleCase(context.fixture.home_away))} · ${escapeHtml(titleCase(context.fixture.fixture_type))} · ${escapeHtml(context.fixture.match_format)}</div>
${venue ? `<div class="key">Venue</div><div>${venue}</div>` : ''}
${deadline ? `<div class="key">Reply by</div><div><strong>${escapeHtml(deadline)}</strong></div>` : ''}
</div>
${note}
<form method="post">
<input type="hidden" name="token" value="${escapeHtml(context.token)}">
<div class="question">Your response</div>
<div class="options">
<button class="choice yes" type="submit" name="response" value="available">✓ Available</button>
<button class="choice no" type="submit" name="response" value="unavailable">✕ Not available</button>
<button class="choice maybe" type="submit" name="response" value="maybe">? Not sure</button>
</div>
<label>Your name (optional — useful when a parent/guardian is replying)
<input name="respondedByName" maxlength="120" value="${escapeHtml(context.recipient.responded_by_name ?? '')}" placeholder="e.g. Carlos, Dad">
</label>
<label>Note for the manager (optional)
<textarea name="note" maxlength="1000" placeholder="e.g. Available, but may arrive 10 minutes late.">${escapeHtml(context.recipient.response_note ?? '')}</textarea>
</label>
<p class="hint">Choose one of the three response buttons above to save. No TournamentHQ account is required.</p>
</form>
</div></section>`,
    )
}

function renderSuccess(context: PageContext, response: AvailabilityResponse): string {
    const title = fixtureTitle(context)
    return documentShell(
        'Availability saved',
        `<section class="card"><div class="hero"><h1>Response saved</h1><h2>${escapeHtml(title)}</h2></div><div class="body"><div class="status success"><strong style="color:${responseTone(response)}">${escapeHtml(responseLabel(response))}</strong><br><span style="font-size:13px;color:#c9d5c6">${escapeHtml(context.recipient.player_name)}&apos;s availability has been sent to the team manager.</span></div><p class="hint">If plans change before the response deadline, open the same secure link again and update the response.</p></div></section>`,
    )
}

function invalidPage(message: string): string {
    return documentShell(
        'Availability link unavailable',
        `<section class="card"><div class="hero"><h1>Link unavailable</h1><h2>Match availability</h2></div><div class="body"><div class="status closed">${escapeHtml(message)}</div></div></section>`,
    )
}

Deno.serve(async (request) => {
    try {
        if (request.method === 'GET') {
            const token = tokenFromRequest(request)
            if (!token || !validTokenFormat(token)) {
                return page(invalidPage('This match availability link is invalid.'), 400)
            }

            const context = await loadContext(token)
            if (!context) {
                return page(invalidPage('This match availability link is invalid or has expired.'), 404)
            }

            return page(renderForm(context))
        }

        if (request.method === 'POST') {
            const form = await request.formData()
            const tokenEntry = form.get('token')
            const token = typeof tokenEntry === 'string' ? tokenEntry.trim() : ''
            const response = responseValue(form.get('response'))

            if (!token || !validTokenFormat(token) || !response) {
                return page(invalidPage('A valid availability response is required.'), 400)
            }

            const context = await loadContext(token)
            if (!context) {
                return page(invalidPage('This match availability link is invalid or has expired.'), 404)
            }
            if (context.closedReason) {
                return page(renderForm(context), 409)
            }

            const noteEntry = form.get('note')
            const respondedByEntry = form.get('respondedByName')
            const note = typeof noteEntry === 'string'
                ? noteEntry.trim().slice(0, 1000) || null
                : null
            const respondedByName = typeof respondedByEntry === 'string'
                ? respondedByEntry.trim().slice(0, 120) || null
                : null
            const now = new Date().toISOString()
            const admin = adminClient()

            const { error } = await admin
                .from('club_fixture_availability_recipients')
                .update({
                    response,
                    response_note: note,
                    responded_by_name: respondedByName,
                    responded_at: now,
                    updated_at: now,
                })
                .eq('id', context.recipient.id)
                .eq('request_id', context.request.id)

            if (error) throw error

            return page(renderSuccess(context, response))
        }

        return page(invalidPage('Method not allowed.'), 405)
    } catch (error) {
        console.error('fixture-rsvp:', error)
        return page(
            invalidPage('TournamentHQ could not load this availability request. Please try again or contact your team manager.'),
            500,
        )
    }
})
