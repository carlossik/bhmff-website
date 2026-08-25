import {
    createClient,
    type SupabaseClient,
    type User,
} from 'npm:@supabase/supabase-js@^2'

type JsonRecord = Record<string, unknown>
type Action = 'preview' | 'send' | 'remind'

type AccessContext = {
    admin: SupabaseClient
    user: User
    organisationId: string
    organisationName: string
}

type FixtureRow = {
    id: string
    organisation_id: string
    season_id: string
    team_id: string
    opponent_id: string | null
    fixture_date: string
    kickoff_time: string | null
    home_away: 'home' | 'away' | 'neutral'
    fixture_type: string
    venue_name: string | null
    venue_address: string | null
    status: string
    notes: string | null
}

type RequestRow = {
    id: string
    organisation_id: string
    season_id: string
    team_id: string
    fixture_id: string
    response_deadline: string | null
    message_note: string | null
    status: 'active' | 'closed' | 'cancelled'
    sent_at: string | null
}

type SquadMemberRow = {
    id: string
    player_id: string
    registration_status: 'registered' | 'trialist'
}

type PlayerRow = {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
}

type RecipientRow = {
    id: string
    squad_member_id: string
    player_id: string
    player_name: string
    recipient_email: string | null
    recipient_phone: string | null
    response: 'available' | 'unavailable' | 'maybe' | null
    delivery_status: string
    provider_message_id: string | null
    sent_at: string | null
}

class RsvpAdminError extends Error {
    readonly status: number

    constructor(status: number, message: string) {
        super(message)
        this.name = 'RsvpAdminError'
        this.status = status
    }
}

const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
        },
    })
}

function requiredEnvironment(name: string): string {
    const value = Deno.env.get(name)?.trim()
    if (!value) {
        throw new RsvpAdminError(
            500,
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

function bearerToken(request: Request): string {
    const authorization = request.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) {
        throw new RsvpAdminError(401, 'Authentication is required.')
    }

    const token = authorization.slice(7).trim()
    if (!token) {
        throw new RsvpAdminError(401, 'Authentication is required.')
    }

    return token
}

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function requestBody(request: Request): Promise<JsonRecord> {
    try {
        const value = await request.json() as unknown
        if (!isRecord(value)) {
            throw new RsvpAdminError(400, 'A JSON object is required.')
        }
        return value
    } catch (error) {
        if (error instanceof RsvpAdminError) throw error
        throw new RsvpAdminError(400, 'A valid JSON request body is required.')
    }
}

function requiredString(body: JsonRecord, key: string): string {
    const value = body[key]
    if (typeof value !== 'string' || !value.trim()) {
        throw new RsvpAdminError(400, `${key} is required.`)
    }
    return value.trim()
}

function optionalString(body: JsonRecord, key: string): string | null {
    const value = body[key]
    if (value === null || value === undefined || value === '') return null
    if (typeof value !== 'string') {
        throw new RsvpAdminError(400, `${key} must be a string.`)
    }
    return value.trim() || null
}

function parseAction(value: string): Action {
    if (value === 'preview' || value === 'send' || value === 'remind') return value
    throw new RsvpAdminError(400, 'A valid RSVP action is required.')
}

function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normaliseDeadline(value: string | null): string | null {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        throw new RsvpAdminError(400, 'The response deadline is invalid.')
    }
    if (date.getTime() <= Date.now()) {
        throw new RsvpAdminError(400, 'The response deadline must be in the future.')
    }
    return date.toISOString()
}

async function requireAccess(
    request: Request,
    organisationId: string,
): Promise<AccessContext> {
    const admin = adminClient()
    const token = bearerToken(request)

    const { data: userData, error: userError } =
        await admin.auth.getUser(token)

    if (userError || !userData.user) {
        throw new RsvpAdminError(
            401,
            'Your TournamentHQ session could not be verified.',
        )
    }

    const user = userData.user

    const { data: organisation, error: organisationError } = await admin
        .from('organisations')
        .select('id,name,status,organisation_type')
        .eq('id', organisationId)
        .maybeSingle()

    if (organisationError) {
        throw new RsvpAdminError(500, organisationError.message)
    }
    if (!organisation) {
        throw new RsvpAdminError(404, 'The selected organisation does not exist.')
    }
    if (organisation.status !== 'active') {
        throw new RsvpAdminError(403, 'Fixture RSVP is available only for active organisations.')
    }
    if (organisation.organisation_type !== 'club') {
        throw new RsvpAdminError(403, 'Fixture RSVP is currently available for club organisations.')
    }

    const { data: platformAdmin, error: platformAdminError } = await admin
        .from('platform_admins')
        .select('active')
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle()

    if (platformAdminError) {
        throw new RsvpAdminError(500, platformAdminError.message)
    }

    if (!platformAdmin) {
        const { data: membership, error: membershipError } = await admin
            .from('organisation_memberships')
            .select('role,active')
            .eq('organisation_id', organisationId)
            .eq('user_id', user.id)
            .eq('active', true)
            .maybeSingle()

        if (membershipError) {
            throw new RsvpAdminError(500, membershipError.message)
        }

        if (
            !membership ||
            !['super_admin', 'competition_manager'].includes(membership.role)
        ) {
            throw new RsvpAdminError(
                403,
                'Only an Organisation Admin or Competition Manager can send fixture availability requests.',
            )
        }
    }

    return {
        admin,
        user,
        organisationId,
        organisationName: organisation.name,
    }
}

function htmlEscape(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function formatDate(value: string): string {
    const date = new Date(`${value}T12:00:00Z`)
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

function titleCase(value: string): string {
    return value
        .split('_')
        .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
        .join(' ')
}

function fixtureTitle(
    homeAway: FixtureRow['home_away'],
    teamName: string,
    opponentName: string,
): string {
    return homeAway === 'away'
        ? `${opponentName} v ${teamName}`
        : `${teamName} v ${opponentName}`
}

function tokenExpiry(
    fixtureDate: string,
    responseDeadline: string | null,
): string {
    if (responseDeadline) return responseDeadline

    const date = new Date(`${fixtureDate}T23:59:59Z`)
    date.setUTCDate(date.getUTCDate() + 1)
    return date.toISOString()
}

function randomToken(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return Array.from(bytes)
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('')
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

async function loadFixture(
    context: AccessContext,
    fixtureId: string,
): Promise<FixtureRow> {
    const { data, error } = await context.admin
        .from('club_fixtures')
        .select('id,organisation_id,season_id,team_id,opponent_id,fixture_date,kickoff_time,home_away,fixture_type,venue_name,venue_address,status,notes')
        .eq('id', fixtureId)
        .eq('organisation_id', context.organisationId)
        .maybeSingle()

    if (error) throw new RsvpAdminError(500, error.message)
    if (!data) throw new RsvpAdminError(404, 'The selected fixture does not exist.')

    return data as FixtureRow
}

type TeamFixtureContext = {
    teamName: string
    opponentName: string
    ageGroup: string | null
}

type EligiblePlayer = {
    squadMemberId: string
    playerId: string
    playerName: string
    registrationStatus: 'registered' | 'trialist'
    email: string | null
    phone: string | null
}

type EligibilitySnapshot = {
    players: EligiblePlayer[]
    registeredPlayers: number
    trialists: number
    contactablePlayers: number
    emailReadyPlayers: number
    phoneOnlyPlayers: number
    missingContactPlayers: number
}

function inferPlayersPerSide(ageGroup: string | null): number {
    if (!ageGroup) return 11

    const match = ageGroup.toLowerCase().match(/(?:u|under\s*)?(\d{1,2})/)
    const age = match ? Number(match[1]) : Number.NaN

    if (!Number.isFinite(age)) return 11
    if (age <= 8) return 5
    if (age <= 10) return 7
    if (age <= 12) return 9
    return 11
}

function minimumPlayersToSend(playersPerSide: number): number {
    return Math.max(1, playersPerSide - 1)
}

function cleanContact(value: string | null): string | null {
    const trimmed = value?.trim() ?? ''
    return trimmed || null
}

function hasPreviouslyBeenSent(recipient: RecipientRow): boolean {
    return Boolean(
        recipient.provider_message_id ||
        recipient.sent_at ||
        ['accepted', 'sent', 'delivery_delayed', 'delivered', 'read'].includes(
            recipient.delivery_status,
        ),
    )
}

async function teamAndOpponentNames(
    context: AccessContext,
    fixture: FixtureRow,
): Promise<TeamFixtureContext> {
    const [{ data: team, error: teamError }, opponentResult] = await Promise.all([
        context.admin
            .from('teams')
            .select('name,age_group')
            .eq('id', fixture.team_id)
            .eq('organisation_id', context.organisationId)
            .maybeSingle(),
        fixture.opponent_id
            ? context.admin
                .from('club_opponents')
                .select('name')
                .eq('id', fixture.opponent_id)
                .eq('organisation_id', context.organisationId)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
    ])

    if (teamError) throw new RsvpAdminError(500, teamError.message)
    if (opponentResult.error) {
        throw new RsvpAdminError(500, opponentResult.error.message)
    }

    return {
        teamName: team?.name ?? 'Your team',
        opponentName: opponentResult.data?.name ?? 'Opponent TBC',
        ageGroup: typeof team?.age_group === 'string' ? team.age_group : null,
    }
}

async function loadEligiblePlayers(
    context: AccessContext,
    fixture: FixtureRow,
): Promise<EligibilitySnapshot> {
    const { data: memberData, error: memberError } = await context.admin
        .from('club_squad_members')
        .select('id,player_id,registration_status')
        .eq('organisation_id', context.organisationId)
        .eq('season_id', fixture.season_id)
        .eq('team_id', fixture.team_id)
        .in('registration_status', ['registered', 'trialist'])
        .eq('active', true)

    if (memberError) throw new RsvpAdminError(500, memberError.message)

    const members = (memberData ?? []) as SquadMemberRow[]
    if (members.length === 0) {
        return {
            players: [],
            registeredPlayers: 0,
            trialists: 0,
            contactablePlayers: 0,
            emailReadyPlayers: 0,
            phoneOnlyPlayers: 0,
            missingContactPlayers: 0,
        }
    }

    const playerIds = Array.from(new Set(members.map((member) => member.player_id)))
    const { data: playerData, error: playerError } = await context.admin
        .from('club_players')
        .select('id,first_name,last_name,email,phone')
        .eq('organisation_id', context.organisationId)
        .eq('active', true)
        .in('id', playerIds)

    if (playerError) throw new RsvpAdminError(500, playerError.message)

    const playerById = new Map(
        ((playerData ?? []) as PlayerRow[]).map((player) => [player.id, player]),
    )

    const players: EligiblePlayer[] = members.flatMap((member) => {
        const player = playerById.get(member.player_id)
        if (!player) return []

        return [{
            squadMemberId: member.id,
            playerId: member.player_id,
            playerName:
                `${player.first_name} ${player.last_name}`.trim() || 'Player',
            registrationStatus: member.registration_status,
            email: cleanContact(player.email),
            phone: cleanContact(player.phone),
        }]
    })

    return {
        players,
        registeredPlayers: players.filter(
            (player) => player.registrationStatus === 'registered',
        ).length,
        trialists: players.filter(
            (player) => player.registrationStatus === 'trialist',
        ).length,
        contactablePlayers: players.filter(
            (player) => Boolean(player.email || player.phone),
        ).length,
        emailReadyPlayers: players.filter((player) => Boolean(player.email)).length,
        phoneOnlyPlayers: players.filter(
            (player) => !player.email && Boolean(player.phone),
        ).length,
        missingContactPlayers: players.filter(
            (player) => !player.email && !player.phone,
        ).length,
    }
}

async function loadExistingRequest(
    context: AccessContext,
    fixtureId: string,
): Promise<RequestRow | null> {
    const { data, error } = await context.admin
        .from('club_fixture_availability_requests')
        .select('id,organisation_id,season_id,team_id,fixture_id,response_deadline,message_note,status,sent_at')
        .eq('fixture_id', fixtureId)
        .eq('organisation_id', context.organisationId)
        .maybeSingle()

    if (error) throw new RsvpAdminError(500, error.message)
    return data ? data as RequestRow : null
}

async function loadRecipients(
    context: AccessContext,
    requestId: string,
): Promise<RecipientRow[]> {
    const { data, error } = await context.admin
        .from('club_fixture_availability_recipients')
        .select('id,squad_member_id,player_id,player_name,recipient_email,recipient_phone,response,delivery_status,provider_message_id,sent_at')
        .eq('request_id', requestId)
        .order('player_name')

    if (error) throw new RsvpAdminError(500, error.message)
    return (data ?? []) as RecipientRow[]
}

async function buildPreview(
    context: AccessContext,
    fixture: FixtureRow,
): Promise<JsonRecord> {
    const [teamContext, eligibility, existingRequest] = await Promise.all([
        teamAndOpponentNames(context, fixture),
        loadEligiblePlayers(context, fixture),
        loadExistingRequest(context, fixture.id),
    ])

    const recipients = existingRequest
        ? await loadRecipients(context, existingRequest.id)
        : []
    const recipientByMemberId = new Map(
        recipients.map((recipient) => [recipient.squad_member_id, recipient]),
    )

    const playersPerSide = inferPlayersPerSide(teamContext.ageGroup)
    const minimumToSend = minimumPlayersToSend(playersPerSide)
    const responded = recipients.filter((recipient) => Boolean(recipient.response)).length
    const alreadySent = recipients.filter(hasPreviouslyBeenSent).length
    const awaitingResponse = recipients.filter(
        (recipient) => !recipient.response && hasPreviouslyBeenSent(recipient),
    ).length
    const newSendablePlayers = eligibility.players.filter((player) => {
        if (!player.email) return false
        const recipient = recipientByMemberId.get(player.squadMemberId)
        return !recipient || (!recipient.response && !hasPreviouslyBeenSent(recipient))
    }).length

    const enoughEligiblePlayers =
        eligibility.players.length >= minimumToSend
    const enoughEmailRecipients =
        eligibility.emailReadyPlayers >= minimumToSend
    const canSend = enoughEligiblePlayers && enoughEmailRecipients
    const canSendNew =
        Boolean(existingRequest) && canSend && newSendablePlayers > 0

    let message = ''
    if (!enoughEligiblePlayers) {
        message = `You need at least ${playersPerSide} eligible players in the squad for a ${playersPerSide}-a-side match. RSVP sending is enabled once at least ${minimumToSend} players are registered or marked as trialists.`
    } else if (!enoughEmailRecipients) {
        message = `You have ${eligibility.players.length} eligible players, but only ${eligibility.emailReadyPlayers} can currently receive an automated RSVP email. Add player or parent/guardian email addresses until at least ${minimumToSend} can be sent. Phone-only contacts are retained for manual follow-up.`
    } else if (existingRequest && newSendablePlayers > 0) {
        message = `${newSendablePlayers} newly eligible player${newSendablePlayers === 1 ? '' : 's'} can now receive the fixture RSVP.`
    } else if (existingRequest) {
        message = 'All currently eligible email contacts have already been sent this fixture RSVP.'
    } else {
        message = `${eligibility.contactablePlayers} eligible player${eligibility.contactablePlayers === 1 ? '' : 's'} can be contacted for this ${playersPerSide}-a-side fixture.`
    }

    return {
        ok: true,
        action: 'preview',
        fixtureId: fixture.id,
        teamId: fixture.team_id,
        teamName: teamContext.teamName,
        ageGroup: teamContext.ageGroup,
        playersPerSide,
        minimumToSend,
        eligiblePlayers: eligibility.players.length,
        registeredPlayers: eligibility.registeredPlayers,
        trialists: eligibility.trialists,
        contactablePlayers: eligibility.contactablePlayers,
        emailReadyPlayers: eligibility.emailReadyPlayers,
        phoneOnlyPlayers: eligibility.phoneOnlyPlayers,
        missingContactPlayers: eligibility.missingContactPlayers,
        alreadySent,
        responded,
        awaitingResponse,
        newSendablePlayers,
        requestExists: Boolean(existingRequest),
        canSend,
        canSendNew,
        message,
    }
}

async function syncRecipients(
    context: AccessContext,
    requestRow: RequestRow,
    eligiblePlayers: EligiblePlayer[],
): Promise<RecipientRow[]> {
    const existing = await loadRecipients(context, requestRow.id)
    const existingByMemberId = new Map(
        existing.map((recipient) => [recipient.squad_member_id, recipient]),
    )

    for (const player of eligiblePlayers) {
        const recipient = existingByMemberId.get(player.squadMemberId)
        if (!recipient || recipient.response) continue

        if (
            recipient.player_name === player.playerName &&
            recipient.recipient_email === player.email &&
            recipient.recipient_phone === player.phone
        ) {
            continue
        }

        const update: JsonRecord = {
            player_name: player.playerName,
            recipient_email: player.email,
            recipient_phone: player.phone,
            updated_at: new Date().toISOString(),
        }

        if (player.email && !hasPreviouslyBeenSent(recipient)) {
            update.delivery_status = 'queued'
            update.status_detail = null
        } else if (!player.email && player.phone) {
            update.delivery_status = 'skipped'
            update.status_detail =
                'Phone contact is stored, but automated RSVP delivery is currently email-only.'
        } else if (!player.email && !player.phone) {
            update.delivery_status = 'skipped'
            update.status_detail =
                'No player or parent/guardian email or phone number is stored.'
        }

        const { error } = await context.admin
            .from('club_fixture_availability_recipients')
            .update(update)
            .eq('id', recipient.id)

        if (error) throw new RsvpAdminError(500, error.message)
    }

    const inserts = eligiblePlayers
        .filter((player) => !existingByMemberId.has(player.squadMemberId))
        .map((player) => ({
            request_id: requestRow.id,
            organisation_id: context.organisationId,
            season_id: requestRow.season_id,
            team_id: requestRow.team_id,
            fixture_id: requestRow.fixture_id,
            squad_member_id: player.squadMemberId,
            player_id: player.playerId,
            player_name: player.playerName,
            recipient_email: player.email,
            recipient_phone: player.phone,
            delivery_status: player.email ? 'queued' : 'skipped',
            status_detail: player.email
                ? null
                : player.phone
                  ? 'Phone contact is stored, but automated RSVP delivery is currently email-only.'
                  : 'No player or parent/guardian email or phone number is stored.',
            updated_at: new Date().toISOString(),
        }))

    if (inserts.length > 0) {
        const { error } = await context.admin
            .from('club_fixture_availability_recipients')
            .insert(inserts)
        if (error) throw new RsvpAdminError(500, error.message)
    }

    return loadRecipients(context, requestRow.id)
}

function buildEmailHtml(input: {
    organisationName: string
    playerName: string
    fixtureLabel: string
    fixture: FixtureRow
    responseDeadline: string | null
    messageNote: string | null
    responseUrl: string
}): string {
    const deadline = formatDeadline(input.responseDeadline)
    const venue = [input.fixture.venue_name, input.fixture.venue_address]
        .filter((value): value is string => Boolean(value?.trim()))
        .map(htmlEscape)
        .join('<br>')

    const note = input.messageNote
        ? `<div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:#f7faf6;border:1px solid #dfe8dc"><strong>Manager note</strong><br>${htmlEscape(input.messageNote).replaceAll('\n', '<br>')}</div>`
        : ''

    return `<!doctype html>
<html><body style="margin:0;background:#f3f5f2;font-family:Arial,sans-serif;color:#152016">
<div style="max-width:620px;margin:0 auto;padding:28px 16px">
<div style="background:#071006;border-radius:18px 18px 0 0;padding:22px 24px;color:#fff">
<div style="font-size:20px;font-weight:800">Tournament<span style="color:#84cc16">HQ</span></div>
<div style="margin-top:6px;font-size:13px;color:#b8c5b5">${htmlEscape(input.organisationName)} · Match availability</div>
</div>
<div style="background:#fff;border:1px solid #dce4da;border-top:0;border-radius:0 0 18px 18px;padding:26px 24px">
<p style="margin:0 0 8px;font-size:14px;color:#5b665a">Availability request for</p>
<h1 style="margin:0;font-size:25px;line-height:1.25">${htmlEscape(input.playerName)}</h1>
<h2 style="margin:24px 0 8px;font-size:21px">${htmlEscape(input.fixtureLabel)}</h2>
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.65">
<tr><td style="width:110px;color:#6d776c">Date</td><td><strong>${htmlEscape(formatDate(input.fixture.fixture_date))}</strong></td></tr>
<tr><td style="color:#6d776c">Kick-off</td><td>${htmlEscape(input.fixture.kickoff_time?.slice(0, 5) || 'TBC')}</td></tr>
<tr><td style="color:#6d776c">Fixture</td><td>${htmlEscape(titleCase(input.fixture.home_away))} · ${htmlEscape(titleCase(input.fixture.fixture_type))}</td></tr>
${venue ? `<tr><td style="vertical-align:top;color:#6d776c">Venue</td><td>${venue}</td></tr>` : ''}
${deadline ? `<tr><td style="color:#6d776c">Reply by</td><td><strong>${htmlEscape(deadline)}</strong></td></tr>` : ''}
</table>
${note}
<p style="margin:24px 0 14px;font-size:15px"><strong>Can ${htmlEscape(input.playerName)} play?</strong></p>
<a href="${htmlEscape(input.responseUrl)}" style="display:inline-block;background:#84cc16;color:#071006;text-decoration:none;font-weight:800;padding:13px 20px;border-radius:10px">Reply to match availability</a>
<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#7b8579">Players or parents/guardians can use this secure link. A TournamentHQ account is not required.</p>
</div></div></body></html>`
}

async function createToken(
    context: AccessContext,
    recipientId: string,
    expiresAt: string,
): Promise<string> {
    const rawToken = randomToken()
    const tokenHash = await sha256Hex(rawToken)

    const { error } = await context.admin
        .from('club_fixture_availability_tokens')
        .insert({
            recipient_id: recipientId,
            token_hash: tokenHash,
            expires_at: expiresAt,
        })

    if (error) throw new RsvpAdminError(500, error.message)
    return rawToken
}

async function sendEmail(
    context: AccessContext,
    recipient: RecipientRow,
    fixture: FixtureRow,
    fixtureLabel: string,
    requestRow: RequestRow,
    isReminder: boolean,
): Promise<boolean> {
    if (!recipient.recipient_email) return false

    const expiresAt = tokenExpiry(
        fixture.fixture_date,
        requestRow.response_deadline,
    )
    const token = await createToken(context, recipient.id, expiresAt)
    const responseUrl = `${requiredEnvironment('SUPABASE_URL')}/functions/v1/fixture-rsvp?token=${encodeURIComponent(token)}`

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${requiredEnvironment('RESEND_API_KEY')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: requiredEnvironment('THQ_EMAIL_FROM'),
            to: [recipient.recipient_email],
            subject: `${isReminder ? 'Reminder: ' : ''}${fixtureLabel} · availability request`,
            html: buildEmailHtml({
                organisationName: context.organisationName,
                playerName: recipient.player_name,
                fixtureLabel,
                fixture,
                responseDeadline: requestRow.response_deadline,
                messageNote: requestRow.message_note,
                responseUrl,
            }),
        }),
    })

    const now = new Date().toISOString()

    if (!response.ok) {
        const detail = await response.text()
        const failureUpdate: JsonRecord = {
            delivery_status: 'failed',
            failed_at: now,
            status_detail: detail.slice(0, 1000),
            updated_at: now,
        }

        if (isReminder) {
            failureUpdate.last_reminder_at = now
        }

        await context.admin
            .from('club_fixture_availability_recipients')
            .update(failureUpdate)
            .eq('id', recipient.id)

        return false
    }

    const payload = await response.json() as unknown
    const providerMessageId = isRecord(payload) && typeof payload.id === 'string'
        ? payload.id
        : null

    const successUpdate: JsonRecord = {
        delivery_status: 'accepted',
        provider: 'resend',
        provider_message_id: providerMessageId,
        status_detail: null,
        last_provider_event: 'resend.api.accepted',
        last_provider_event_at: now,
        updated_at: now,
    }

    if (isReminder) {
        successUpdate.last_reminder_at = now
    }

    await context.admin
        .from('club_fixture_availability_recipients')
        .update(successUpdate)
        .eq('id', recipient.id)

    return true
}

async function getOrCreateRequest(
    context: AccessContext,
    fixture: FixtureRow,
    action: Exclude<Action, 'preview'>,
    responseDeadline: string | null,
    messageNote: string | null,
): Promise<RequestRow> {
    const existing = await loadExistingRequest(context, fixture.id)

    if (existing) {
        if (existing.status !== 'active') {
            throw new RsvpAdminError(409, 'This availability request is no longer active.')
        }
        if (existing.response_deadline) {
            const deadline = new Date(existing.response_deadline)
            if (!Number.isNaN(deadline.getTime()) && deadline.getTime() <= Date.now()) {
                throw new RsvpAdminError(
                    409,
                    'The RSVP deadline has passed. Update the response window before sending another request.',
                )
            }
        }

        if (action === 'send') {
            const nextDeadline = responseDeadline ?? existing.response_deadline
            const nextNote = messageNote ?? existing.message_note
            const { data, error } = await context.admin
                .from('club_fixture_availability_requests')
                .update({
                    response_deadline: nextDeadline,
                    message_note: nextNote,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
                .select('id,organisation_id,season_id,team_id,fixture_id,response_deadline,message_note,status,sent_at')
                .single()

            if (error || !data) {
                throw new RsvpAdminError(500, error?.message ?? 'Unable to update availability request.')
            }
            return data as RequestRow
        }

        return existing
    }

    if (action === 'remind') {
        throw new RsvpAdminError(404, 'Send the first availability request before sending a reminder.')
    }

    const { data: created, error: createError } = await context.admin
        .from('club_fixture_availability_requests')
        .insert({
            organisation_id: context.organisationId,
            season_id: fixture.season_id,
            team_id: fixture.team_id,
            fixture_id: fixture.id,
            response_deadline: responseDeadline,
            message_note: messageNote,
            status: 'active',
            created_by: context.user.id,
        })
        .select('id,organisation_id,season_id,team_id,fixture_id,response_deadline,message_note,status,sent_at')
        .single()

    if (createError || !created) {
        throw new RsvpAdminError(500, createError?.message ?? 'Unable to create availability request.')
    }

    return created as RequestRow
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed.' }, 405)
    }

    try {
        const body = await requestBody(request)
        const action = parseAction(requiredString(body, 'action'))
        const organisationId = requiredString(body, 'organisationId')
        const fixtureId = requiredString(body, 'fixtureId')

        if (!isUuid(organisationId) || !isUuid(fixtureId)) {
            throw new RsvpAdminError(400, 'A valid organisation and fixture are required.')
        }

        const context = await requireAccess(request, organisationId)
        const fixture = await loadFixture(context, fixtureId)

        if (action === 'preview') {
            return jsonResponse(await buildPreview(context, fixture))
        }

        if (['cancelled', 'abandoned', 'played', 'postponed'].includes(fixture.status)) {
            throw new RsvpAdminError(
                409,
                `Availability cannot be requested for a ${fixture.status} fixture.`,
            )
        }

        const [eligibility, teamContext, existingBeforeSend] = await Promise.all([
            loadEligiblePlayers(context, fixture),
            teamAndOpponentNames(context, fixture),
            loadExistingRequest(context, fixture.id),
        ])
        const playersPerSide = inferPlayersPerSide(teamContext.ageGroup)
        const minimumToSend = minimumPlayersToSend(playersPerSide)

        if (
            action === 'send' &&
            eligibility.players.length < minimumToSend
        ) {
            throw new RsvpAdminError(
                409,
                `You need at least ${playersPerSide} eligible players in the squad for a ${playersPerSide}-a-side match. Add registered players or trialists first. RSVP sending is enabled once at least ${minimumToSend} are eligible.`,
            )
        }

        if (
            action === 'send' &&
            eligibility.emailReadyPlayers < minimumToSend
        ) {
            throw new RsvpAdminError(
                409,
                `At least ${minimumToSend} eligible players need an email address before TournamentHQ can send this ${playersPerSide}-a-side RSVP automatically. Phone-only contacts remain visible for manual follow-up until SMS/WhatsApp delivery is enabled.`,
            )
        }

        const responseDeadline = action === 'send'
            ? normaliseDeadline(optionalString(body, 'responseDeadline'))
            : null
        const messageNote = action === 'send'
            ? optionalString(body, 'messageNote')
            : null

        const requestRow = await getOrCreateRequest(
            context,
            fixture,
            action,
            responseDeadline,
            messageNote,
        )

        const recipients = await syncRecipients(
            context,
            requestRow,
            eligibility.players,
        )

        const pendingRecipients = recipients.filter((recipient) => {
            if (recipient.response || !recipient.recipient_email) return false
            return action === 'send'
                ? !hasPreviouslyBeenSent(recipient)
                : hasPreviouslyBeenSent(recipient)
        })

        if (pendingRecipients.length === 0) {
            return jsonResponse({
                ok: true,
                action,
                requestId: requestRow.id,
                attempted: 0,
                accepted: 0,
                failed: 0,
                missingContact: eligibility.missingContactPlayers,
                phoneOnly: eligibility.phoneOnlyPlayers,
                newRecipients: 0,
                message: action === 'send'
                    ? existingBeforeSend
                        ? 'All currently eligible email contacts have already been sent this fixture RSVP.'
                        : 'There are no new email contacts available for this fixture RSVP.'
                    : 'There are no previously-sent outstanding email responses to remind.',
            })
        }

        const label = fixtureTitle(
            fixture.home_away,
            teamContext.teamName,
            teamContext.opponentName,
        )

        let accepted = 0
        let failed = 0

        for (const recipient of pendingRecipients) {
            const sent = await sendEmail(
                context,
                recipient,
                fixture,
                label,
                requestRow,
                action === 'remind',
            )
            if (sent) accepted += 1
            else failed += 1
        }

        const now = new Date().toISOString()
        const requestUpdate = action === 'send'
            ? {
                sent_at: requestRow.sent_at ?? now,
                updated_at: now,
            }
            : {
                last_reminder_at: now,
                updated_at: now,
            }

        const { error: requestUpdateError } = await context.admin
            .from('club_fixture_availability_requests')
            .update(requestUpdate)
            .eq('id', requestRow.id)

        if (requestUpdateError) {
            throw new RsvpAdminError(500, requestUpdateError.message)
        }

        return jsonResponse({
            ok: true,
            action,
            requestId: requestRow.id,
            attempted: pendingRecipients.length,
            accepted,
            failed,
            missingContact: eligibility.missingContactPlayers,
            phoneOnly: eligibility.phoneOnlyPlayers,
            newRecipients: action === 'send' && existingBeforeSend
                ? pendingRecipients.length
                : 0,
            message: action === 'send'
                ? existingBeforeSend
                    ? `Fixture RSVP submitted to ${accepted} newly eligible player contact${accepted === 1 ? '' : 's'}.`
                    : `Availability request submitted to ${accepted} player contact${accepted === 1 ? '' : 's'}.`
                : `Reminder submitted to ${accepted} outstanding player contact${accepted === 1 ? '' : 's'}.`,
        })
    } catch (error) {
        console.error('fixture-rsvp-admin:', error)
        if (error instanceof RsvpAdminError) {
            return jsonResponse({ error: error.message }, error.status)
        }
        return jsonResponse(
            {
                error: error instanceof Error
                    ? error.message
                    : 'Unable to process the fixture availability request.',
            },
            500,
        )
    }
})
