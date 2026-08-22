import {
    createClient,
    type SupabaseClient,
    type User,
} from 'npm:@supabase/supabase-js@^2'

import {
    getProviderStatuses,
    getSelectedProvider,
    sendWithProvider,
    type ProviderChannel,
    type ProviderName,
} from '../_shared/communicationsProviders.ts'

type CommunicationAction =
    | 'provider_status'
    | 'list_templates'
    | 'recipient_directory'
    | 'history'
    | 'send'

type MessageClass = 'service' | 'marketing'

type JsonRecord = Record<string, unknown>

type CommunicationSettingsRow = {
    organisation_id: string
    email_enabled: boolean
    sms_enabled: boolean
    whatsapp_enabled: boolean
    default_channels: string[]
    default_country_code: string
    sender_name: string | null
    reply_to_email: string | null
}

type TemplateRow = {
    id: string
    organisation_id: string | null
    code: string
    name: string
    category: string
    message_class: MessageClass
    subject_template: string | null
    body_template: string
    variables: unknown
    provider_template_refs: unknown
    system_defined: boolean
    active: boolean
}

type RecipientInput = {
    recipientName: string
    email: string | null
    phone: string | null
    whatsappPhone: string | null
    playerId: string | null
    teamId: string | null
    contactId: string | null
    variables: Record<string, string>
}

type AccessContext = {
    admin: SupabaseClient
    user: User
    organisationId: string
    organisationName: string
    organisationType: string
    canSendGeneral: boolean
    canSendFinance: boolean
}

class CommunicationsError extends Error {
    readonly status: number

    constructor(status: number, message: string) {
        super(message)
        this.name = 'CommunicationsError'
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
    return new Response(
        JSON.stringify(body),
        {
            status,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
            },
        },
    )
}

function requiredEnvironment(name: string): string {
    const value = Deno.env.get(name)?.trim()
    if (!value) {
        throw new CommunicationsError(
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
            },
        },
    )
}

function bearerToken(request: Request): string {
    const authorization =
        request.headers.get('Authorization')

    if (
        !authorization ||
        !authorization.startsWith('Bearer ')
    ) {
        throw new CommunicationsError(
            401,
            'Authentication is required.',
        )
    }

    const token = authorization.slice(7).trim()
    if (!token) {
        throw new CommunicationsError(
            401,
            'Authentication is required.',
        )
    }

    return token
}

function isRecord(value: unknown): value is JsonRecord {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    )
}

async function requestBody(
    request: Request,
): Promise<JsonRecord> {
    try {
        const value = await request.json() as unknown
        if (!isRecord(value)) {
            throw new CommunicationsError(
                400,
                'A JSON object is required.',
            )
        }
        return value
    } catch (error) {
        if (error instanceof CommunicationsError) {
            throw error
        }
        throw new CommunicationsError(
            400,
            'A valid JSON request body is required.',
        )
    }
}

function stringValue(
    record: JsonRecord,
    key: string,
): string | null {
    const value = record[key]
    if (value === null || value === undefined || value === '') {
        return null
    }
    if (typeof value !== 'string') {
        throw new CommunicationsError(
            400,
            `${key} must be a string.`,
        )
    }
    return value.trim() || null
}

function requiredString(
    record: JsonRecord,
    key: string,
): string {
    const value = stringValue(record, key)
    if (!value) {
        throw new CommunicationsError(
            400,
            `${key} is required.`,
        )
    }
    return value
}

function numberValue(
    record: JsonRecord,
    key: string,
    fallback: number,
): number {
    const value = record[key]
    if (value === null || value === undefined) {
        return fallback
    }
    if (
        typeof value !== 'number' ||
        !Number.isFinite(value)
    ) {
        throw new CommunicationsError(
            400,
            `${key} must be a number.`,
        )
    }
    return value
}

function actionValue(value: string): CommunicationAction {
    if (
        value === 'provider_status' ||
        value === 'list_templates' ||
        value === 'recipient_directory' ||
        value === 'history' ||
        value === 'send'
    ) {
        return value
    }

    throw new CommunicationsError(
        400,
        'A valid communications action is required.',
    )
}

function channelValue(value: unknown): ProviderChannel {
    if (
        value === 'email' ||
        value === 'sms' ||
        value === 'whatsapp'
    ) {
        return value
    }

    throw new CommunicationsError(
        400,
        'A communication channel is invalid.',
    )
}

function channelsValue(value: unknown): ProviderChannel[] {
    if (!Array.isArray(value)) {
        throw new CommunicationsError(
            400,
            'channels must be an array.',
        )
    }

    const channels = Array.from(
        new Set(value.map(channelValue)),
    )

    if (channels.length === 0) {
        throw new CommunicationsError(
            400,
            'Select at least one communication channel.',
        )
    }

    return channels
}


function routingModeValue(
    value: unknown,
    hasExplicitChannels: boolean,
): 'auto' | 'explicit' {
    if (value === undefined || value === null || value === '') {
        return hasExplicitChannels ? 'explicit' : 'auto'
    }
    if (value === 'auto' || value === 'explicit') {
        return value
    }
    throw new CommunicationsError(
        400,
        'routingMode must be auto or explicit.',
    )
}

function preferredChannelOrder(
    settings: CommunicationSettingsRow,
): ProviderChannel[] {
    const configuredOrder = settings.default_channels
        .filter((channel): channel is ProviderChannel =>
            channel === 'email' ||
            channel === 'sms' ||
            channel === 'whatsapp',
        )

    return Array.from(new Set<ProviderChannel>([
        ...configuredOrder,
        'whatsapp',
        'email',
        'sms',
    ]))
}

function liveProviderAvailable(
    channel: ProviderChannel,
): boolean {
    const provider = getSelectedProvider(channel)
    if (provider === 'mock' || provider === 'unconfigured') {
        return false
    }

    const status = getProviderStatuses().find(
        (item) => item.channel === channel,
    )

    return status?.configured === true
}

function targetForChannel(
    channel: ProviderChannel,
    recipient: RecipientInput,
    phone: string | null,
    whatsappPhone: string | null,
): string | null {
    if (channel === 'email') {
        return recipient.email
    }
    if (channel === 'sms') {
        return phone
    }
    return whatsappPhone
}

function messageClassValue(
    value: unknown,
): MessageClass {
    if (value === undefined || value === null) {
        return 'service'
    }
    if (value === 'service' || value === 'marketing') {
        return value
    }
    throw new CommunicationsError(
        400,
        'messageClass must be service or marketing.',
    )
}

function scalarVariable(value: unknown): string {
    if (value === null || value === undefined) return ''
    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return String(value)
    }
    return ''
}

function variablesValue(
    value: unknown,
): Record<string, string> {
    if (value === undefined || value === null) {
        return {}
    }
    if (!isRecord(value)) {
        throw new CommunicationsError(
            400,
            'recipient variables must be an object.',
        )
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            key,
            scalarVariable(item),
        ]),
    )
}

function recipientValue(value: unknown): RecipientInput {
    if (!isRecord(value)) {
        throw new CommunicationsError(
            400,
            'Each recipient must be an object.',
        )
    }

    return {
        recipientName:
            requiredString(value, 'recipientName'),
        email:
            stringValue(value, 'email')?.toLowerCase() ?? null,
        phone:
            stringValue(value, 'phone'),
        whatsappPhone:
            stringValue(value, 'whatsappPhone'),
        playerId:
            stringValue(value, 'playerId'),
        teamId:
            stringValue(value, 'teamId'),
        contactId:
            stringValue(value, 'contactId'),
        variables:
            variablesValue(value.variables),
    }
}

function recipientsValue(value: unknown): RecipientInput[] {
    if (!Array.isArray(value)) {
        throw new CommunicationsError(
            400,
            'recipients must be an array.',
        )
    }

    if (value.length === 0) {
        throw new CommunicationsError(
            400,
            'Add at least one recipient.',
        )
    }

    if (value.length > 50) {
        throw new CommunicationsError(
            400,
            'A single send can contain a maximum of 50 recipients.',
        )
    }

    return value.map(recipientValue)
}

function isUuid(value: string | null): boolean {
    if (!value) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function requireAccess(
    request: Request,
    organisationId: string,
): Promise<AccessContext> {
    const admin = adminClient()
    const token = bearerToken(request)

    const {
        data: userData,
        error: userError,
    } = await admin.auth.getUser(token)

    if (userError || !userData.user) {
        throw new CommunicationsError(
            401,
            'Your TournamentHQ session could not be verified.',
        )
    }

    const user = userData.user

    const {
        data: organisation,
        error: organisationError,
    } = await admin
        .from('organisations')
        .select('id,name,status,organisation_type')
        .eq('id', organisationId)
        .maybeSingle()

    if (organisationError) {
        throw new CommunicationsError(
            500,
            organisationError.message,
        )
    }

    if (!organisation) {
        throw new CommunicationsError(
            404,
            'The selected organisation does not exist.',
        )
    }

    if (organisation.status !== 'active') {
        throw new CommunicationsError(
            403,
            'Communications is available only for active organisations.',
        )
    }

    const {
        data: platformAdmin,
        error: platformAdminError,
    } = await admin
        .from('platform_admins')
        .select('active')
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle()

    if (platformAdminError) {
        throw new CommunicationsError(
            500,
            platformAdminError.message,
        )
    }

    if (platformAdmin) {
        return {
            admin,
            user,
            organisationId,
            organisationName: organisation.name,
            organisationType: organisation.organisation_type,
            canSendGeneral: true,
            canSendFinance: true,
        }
    }

    const {
        data: membership,
        error: membershipError,
    } = await admin
        .from('organisation_memberships')
        .select('role,active')
        .eq('organisation_id', organisationId)
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle()

    if (membershipError) {
        throw new CommunicationsError(
            500,
            membershipError.message,
        )
    }

    const canSendGeneral =
        membership?.role === 'competition_manager' ||
        membership?.role === 'super_admin'

    let canSendFinance = canSendGeneral

    if (
        !canSendFinance &&
        organisation.organisation_type === 'club'
    ) {
        const {
            data: financeRows,
            error: financeError,
        } = await admin
            .from('club_finance_access')
            .select('role,active')
            .eq('organisation_id', organisationId)
            .eq('user_id', user.id)
            .eq('active', true)

        if (financeError) {
            throw new CommunicationsError(
                500,
                financeError.message,
            )
        }

        canSendFinance = (financeRows ?? []).some(
            (row) =>
                row.role === 'treasurer' ||
                row.role === 'finance_admin',
        )
    }

    return {
        admin,
        user,
        organisationId,
        organisationName: organisation.name,
        organisationType: organisation.organisation_type,
        canSendGeneral,
        canSendFinance,
    }
}

async function loadSettings(
    context: AccessContext,
): Promise<CommunicationSettingsRow> {
    const {
        data,
        error,
    } = await context.admin
        .from('communication_settings')
        .select('*')
        .eq('organisation_id', context.organisationId)
        .maybeSingle()

    if (error) {
        throw new CommunicationsError(
            500,
            error.message,
        )
    }

    return data as CommunicationSettingsRow | null ?? {
        organisation_id: context.organisationId,
        email_enabled: true,
        sms_enabled: true,
        whatsapp_enabled: true,
        default_channels: ['whatsapp', 'email', 'sms'],
        default_country_code: '44',
        sender_name: context.organisationName,
        reply_to_email: null,
    }
}

function jsonStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value.filter(
        (item): item is string =>
            typeof item === 'string',
    )
}

function providerRefs(
    value: unknown,
): Record<string, Record<string, string>> {
    if (!isRecord(value)) return {}

    const result: Record<string, Record<string, string>> = {}
    for (const [provider, channels] of Object.entries(value)) {
        if (!isRecord(channels)) continue
        result[provider] = Object.fromEntries(
            Object.entries(channels)
                .filter((entry): entry is [string, string] =>
                    typeof entry[1] === 'string' &&
                    entry[1].trim().length > 0,
                )
                .map(([channel, ref]) => [
                    channel,
                    ref.trim(),
                ]),
        )
    }
    return result
}

function mapTemplate(row: TemplateRow): JsonRecord {
    return {
        id: row.id,
        organisationId: row.organisation_id,
        code: row.code,
        name: row.name,
        category: row.category,
        messageClass: row.message_class,
        subjectTemplate: row.subject_template,
        bodyTemplate: row.body_template,
        variables: jsonStringArray(row.variables),
        providerTemplateRefs:
            providerRefs(row.provider_template_refs),
        systemDefined: row.system_defined,
        active: row.active,
    }
}

async function effectiveTemplates(
    context: AccessContext,
): Promise<TemplateRow[]> {
    const {
        data,
        error,
    } = await context.admin
        .from('communication_templates')
        .select('*')
        .or(
            `organisation_id.is.null,organisation_id.eq.${context.organisationId}`,
        )
        .eq('active', true)
        .order('category')
        .order('name')

    if (error) {
        throw new CommunicationsError(
            500,
            error.message,
        )
    }

    const rows = (data ?? []) as TemplateRow[]
    const byCode = new Map<string, TemplateRow>()

    for (const row of rows) {
        const current = byCode.get(row.code)
        if (
            !current ||
            (
                current.organisation_id === null &&
                row.organisation_id === context.organisationId
            )
        ) {
            byCode.set(row.code, row)
        }
    }

    return [...byCode.values()].sort((left, right) =>
        `${left.category}:${left.name}`.localeCompare(
            `${right.category}:${right.name}`,
        ),
    )
}

function renderTemplate(
    template: string | null,
    variables: Record<string, string>,
): string | null {
    if (template === null) return null

    return template.replace(
        /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
        (_match, key: string) =>
            variables[key] ?? '',
    )
}

function firstName(value: string): string {
    return value.trim().split(/\s+/)[0] ?? value.trim()
}

function normalisePhone(
    value: string | null,
    defaultCountryCode: string,
): string | null {
    if (!value) return null

    const stripped = value
        .trim()
        .replace(/^whatsapp:/i, '')
        .replace(/[()\s-]/g, '')

    let e164 = stripped

    if (e164.startsWith('00')) {
        e164 = `+${e164.slice(2)}`
    } else if (e164.startsWith('+')) {
        // already international
    } else if (e164.startsWith('0')) {
        e164 = `+${defaultCountryCode}${e164.slice(1)}`
    } else if (/^[0-9]+$/.test(e164)) {
        e164 = `+${defaultCountryCode}${e164}`
    }

    return /^\+[1-9][0-9]{6,14}$/.test(e164)
        ? e164
        : null
}

function channelEnabled(
    settings: CommunicationSettingsRow,
    channel: ProviderChannel,
): boolean {
    if (channel === 'email') {
        return settings.email_enabled
    }
    if (channel === 'sms') {
        return settings.sms_enabled
    }
    return settings.whatsapp_enabled
}

function providerTemplateRef(
    template: TemplateRow | null,
    provider: ProviderName,
    channel: ProviderChannel,
): string | null {
    if (!template) return null

    return providerRefs(
        template.provider_template_refs,
    )[provider]?.[channel] ?? null
}

async function handleProviderStatus(
    context: AccessContext,
): Promise<Response> {
    const settings = await loadSettings(context)

    return jsonResponse({
        providers: getProviderStatuses().map((item) => ({
            ...item,
            configured:
                item.configured &&
                channelEnabled(settings, item.channel),
            detail: channelEnabled(settings, item.channel)
                ? item.detail
                : `${item.detail} This channel is disabled for the organisation.`,
        })),
    })
}

async function handleTemplates(
    context: AccessContext,
): Promise<Response> {
    const templates = await effectiveTemplates(context)
    return jsonResponse({
        templates: templates.map(mapTemplate),
    })
}


type DirectoryContactRow = {
    id: string
    display_name: string
    relationship_label: string | null
    email: string | null
    phone_e164: string | null
    whatsapp_e164: string | null
    team_id: string | null
}

type DirectorySquadRow = {
    player_id: string
    team_id: string | null
}

type DirectoryPlayerRow = {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
}

type DirectoryTeamRow = {
    id: string
    name: string
}

async function handleRecipientDirectory(
    context: AccessContext,
): Promise<Response> {
    if (!context.canSendGeneral) {
        throw new CommunicationsError(
            403,
            'Organisation administrator access is required to browse communication recipients.',
        )
    }

    const {
        data: contactData,
        error: contactError,
    } = await context.admin
        .from('communication_contacts')
        .select(`
            id,
            display_name,
            relationship_label,
            email,
            phone_e164,
            whatsapp_e164,
            team_id
        `)
        .eq('organisation_id', context.organisationId)
        .eq('active', true)
        .order('display_name')

    if (contactError) {
        throw new CommunicationsError(
            500,
            contactError.message,
        )
    }

    const contacts = (contactData ?? []) as DirectoryContactRow[]
    const contactRecipients = contacts.map((contact) => ({
        key: `contact:${contact.id}`,
        kind: 'contact',
        recipientName: contact.display_name,
        email: contact.email,
        phone: contact.phone_e164,
        whatsappPhone:
            contact.whatsapp_e164 ?? contact.phone_e164,
        playerId: null,
        teamId: contact.team_id,
        contactId: contact.id,
        teamNames: [] as string[],
        relationshipLabel: contact.relationship_label,
    }))

    if (context.organisationType !== 'club') {
        return jsonResponse({
            recipients: contactRecipients,
        })
    }

    const {
        data: seasonData,
        error: seasonError,
    } = await context.admin
        .from('club_seasons')
        .select('id')
        .eq('organisation_id', context.organisationId)
        .eq('status', 'active')

    if (seasonError) {
        throw new CommunicationsError(
            500,
            seasonError.message,
        )
    }

    const seasonIds = (seasonData ?? [])
        .map((row) => scalarVariable((row as JsonRecord).id))
        .filter((id) => id.length > 0)

    if (seasonIds.length === 0) {
        return jsonResponse({
            recipients: contactRecipients,
        })
    }

    const {
        data: squadData,
        error: squadError,
    } = await context.admin
        .from('club_squad_members')
        .select('player_id,team_id')
        .eq('organisation_id', context.organisationId)
        .in('season_id', seasonIds)
        .eq('active', true)
        .in('registration_status', ['registered', 'pending'])

    if (squadError) {
        throw new CommunicationsError(
            500,
            squadError.message,
        )
    }

    const squadRows = (squadData ?? []) as DirectorySquadRow[]
    const playerIds = Array.from(new Set(
        squadRows
            .map((row) => row.player_id)
            .filter(Boolean),
    ))
    const teamIds = Array.from(new Set(
        squadRows
            .map((row) => row.team_id)
            .filter((id): id is string => Boolean(id)),
    ))

    if (playerIds.length === 0) {
        return jsonResponse({
            recipients: contactRecipients,
        })
    }

    const {
        data: playerData,
        error: playerError,
    } = await context.admin
        .from('club_players')
        .select('id,first_name,last_name,email,phone')
        .eq('organisation_id', context.organisationId)
        .eq('active', true)
        .in('id', playerIds)

    if (playerError) {
        throw new CommunicationsError(
            500,
            playerError.message,
        )
    }

    let teams: DirectoryTeamRow[] = []
    if (teamIds.length > 0) {
        const {
            data: teamData,
            error: teamError,
        } = await context.admin
            .from('teams')
            .select('id,name')
            .eq('organisation_id', context.organisationId)
            .in('id', teamIds)

        if (teamError) {
            throw new CommunicationsError(
                500,
                teamError.message,
            )
        }

        teams = (teamData ?? []) as DirectoryTeamRow[]
    }

    const teamNameById = new Map(
        teams.map((team) => [team.id, team.name]),
    )
    const squadByPlayer = new Map<
        string,
        { teamIds: Set<string>; teamNames: Set<string> }
    >()

    for (const row of squadRows) {
        const current = squadByPlayer.get(row.player_id) ?? {
            teamIds: new Set<string>(),
            teamNames: new Set<string>(),
        }
        if (row.team_id) {
            current.teamIds.add(row.team_id)
            const teamName = teamNameById.get(row.team_id)
            if (teamName) current.teamNames.add(teamName)
        }
        squadByPlayer.set(row.player_id, current)
    }

    const players = (playerData ?? []) as DirectoryPlayerRow[]
    const playerRecipients = players
        .map((player) => {
            const squad = squadByPlayer.get(player.id)
            const teamIdsForPlayer = squad
                ? [...squad.teamIds]
                : []

            return {
                key: `player:${player.id}`,
                kind: 'player',
                recipientName:
                    `${player.first_name} ${player.last_name}`.trim(),
                email: player.email,
                phone: player.phone,
                whatsappPhone: player.phone,
                playerId: player.id,
                teamId:
                    teamIdsForPlayer.length === 1
                        ? teamIdsForPlayer[0]
                        : null,
                contactId: null,
                teamNames: squad
                    ? [...squad.teamNames].sort((left, right) =>
                        left.localeCompare(right),
                    )
                    : [],
                relationshipLabel: 'Registered player',
            }
        })
        .sort((left, right) =>
            left.recipientName.localeCompare(right.recipientName),
        )

    return jsonResponse({
        recipients: [
            ...playerRecipients,
            ...contactRecipients,
        ],
    })
}

function resendStatusFromLastEvent(
    value: string,
): string | null {
    const event = value.trim().toLowerCase()

    if (event === 'sent') return 'sent'
    if (event === 'delivered') return 'delivered'
    if (event === 'delivery_delayed') return 'delivery_delayed'
    if (event === 'opened' || event === 'clicked') return 'read'
    if (event === 'bounced') return 'bounced'
    if (event === 'complained') return 'complained'
    if (
        event === 'failed' ||
        event === 'suppressed' ||
        event === 'canceled'
    ) {
        return 'failed'
    }
    if (
        event === 'queued' ||
        event === 'scheduled'
    ) {
        return 'accepted'
    }

    return null
}

function resendSyncDetail(
    status: string,
): string | null {
    if (status === 'delivery_delayed') {
        return 'The receiving mail server has temporarily delayed delivery.'
    }
    if (status === 'bounced') {
        return 'The receiving mail server rejected this email.'
    }
    if (status === 'complained') {
        return 'The recipient marked this email as spam.'
    }
    if (status === 'failed') {
        return 'Resend reports that this email could not be sent.'
    }

    return null
}

async function syncPendingResendDeliveries(
    context: AccessContext,
): Promise<void> {
    const apiKey = Deno.env.get('RESEND_API_KEY')?.trim()
    if (!apiKey) return

    const { data, error } = await context.admin
        .from('communication_deliveries')
        .select('id, status, provider_message_id')
        .eq('organisation_id', context.organisationId)
        .eq('provider', 'resend')
        .in('status', [
            'queued',
            'accepted',
            'sent',
            'delivery_delayed',
        ])
        .not('provider_message_id', 'is', null)
        .not('provider_message_id', 'like', 'dry-run-%')
        .order('queued_at', { ascending: false })
        .limit(12)

    if (error) {
        console.error(
            'Unable to load pending Resend deliveries for reconciliation:',
            error,
        )
        return
    }

    await Promise.all((data ?? []).map(async (row) => {
        const delivery = row as unknown as JsonRecord
        const deliveryId = scalarVariable(delivery.id)
        const providerMessageId =
            scalarVariable(delivery.provider_message_id)
        const currentStatus = scalarVariable(delivery.status)

        if (!deliveryId || !providerMessageId) return

        try {
            const response = await fetch(
                `https://api.resend.com/emails/${encodeURIComponent(providerMessageId)}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        Accept: 'application/json',
                    },
                },
            )

            if (!response.ok) return

            const payload = await response.json() as unknown
            if (!isRecord(payload)) return

            const lastEvent = scalarVariable(payload.last_event)
            const nextStatus = resendStatusFromLastEvent(lastEvent)

            if (!nextStatus || nextStatus === currentStatus) return

            const now = new Date().toISOString()
            const detail = resendSyncDetail(nextStatus)
            const failure =
                nextStatus === 'failed' ||
                nextStatus === 'bounced' ||
                nextStatus === 'complained'

            const { error: updateError } = await context.admin
                .from('communication_deliveries')
                .update({
                    status: nextStatus,
                    status_detail: detail,
                    error_message: failure ? detail : null,
                    last_provider_event: `resend.sync.${lastEvent}`,
                    last_provider_event_at: now,
                    updated_at: now,
                })
                .eq('id', deliveryId)
                .eq('organisation_id', context.organisationId)

            if (updateError) {
                console.error(
                    'Unable to reconcile Resend delivery status:',
                    updateError,
                )
            }
        } catch (caughtError) {
            console.error(
                'Resend delivery reconciliation failed:',
                caughtError,
            )
        }
    }))
}

async function handleHistory(
    context: AccessContext,
    body: JsonRecord,
): Promise<Response> {
    const limit = Math.min(
        Math.max(
            Math.round(numberValue(body, 'limit', 50)),
            1,
        ),
        200,
    )

    await syncPendingResendDeliveries(context)

    const {
        data,
        error,
    } = await context.admin
        .from('communication_deliveries')
        .select(`
            id,
            message_id,
            channel,
            provider,
            status,
            provider_message_id,
            error_message,
            status_detail,
            queued_at,
            sent_at,
            delayed_at,
            delivered_at,
            read_at,
            bounced_at,
            complained_at,
            failed_at,
            updated_at,
            communication_messages!inner (
                template_code,
                source_type
            ),
            communication_recipients!inner (
                recipient_name
            )
        `)
        .eq('organisation_id', context.organisationId)
        .order('queued_at', { ascending: false })
        .limit(limit)

    if (error) {
        throw new CommunicationsError(
            500,
            error.message,
        )
    }

    const history = (data ?? []).map((row) => {
        const record = row as unknown as JsonRecord
        const message = isRecord(record.communication_messages)
            ? record.communication_messages
            : Array.isArray(record.communication_messages) &&
                isRecord(record.communication_messages[0])
                ? record.communication_messages[0]
                : {}
        const recipient = isRecord(record.communication_recipients)
            ? record.communication_recipients
            : Array.isArray(record.communication_recipients) &&
                isRecord(record.communication_recipients[0])
                ? record.communication_recipients[0]
                : {}

        return {
            deliveryId: scalarVariable(record.id),
            messageId: scalarVariable(record.message_id),
            recipientName:
                scalarVariable(recipient.recipient_name),
            channel: scalarVariable(record.channel),
            provider: scalarVariable(record.provider),
            status: scalarVariable(record.status),
            templateCode:
                scalarVariable(message.template_code) || null,
            sourceType:
                scalarVariable(message.source_type) || null,
            providerMessageId:
                scalarVariable(record.provider_message_id) || null,
            errorMessage:
                scalarVariable(record.error_message) || null,
            statusDetail:
                scalarVariable(record.status_detail) || null,
            queuedAt: scalarVariable(record.queued_at),
            sentAt:
                scalarVariable(record.sent_at) || null,
            delayedAt:
                scalarVariable(record.delayed_at) || null,
            deliveredAt:
                scalarVariable(record.delivered_at) || null,
            readAt:
                scalarVariable(record.read_at) || null,
            bouncedAt:
                scalarVariable(record.bounced_at) || null,
            complainedAt:
                scalarVariable(record.complained_at) || null,
            failedAt:
                scalarVariable(record.failed_at) || null,
            updatedAt:
                scalarVariable(record.updated_at) ||
                scalarVariable(record.queued_at),
        }
    })

    return jsonResponse({ history })
}

async function insertDelivery(
    context: AccessContext,
    input: {
        messageId: string
        recipientId: string
        channel: ProviderChannel
        provider: ProviderName
        status: 'queued' | 'skipped'
        errorMessage?: string | null
    },
): Promise<string> {
    const now = new Date().toISOString()
    const {
        data,
        error,
    } = await context.admin
        .from('communication_deliveries')
        .insert({
            organisation_id: context.organisationId,
            message_id: input.messageId,
            recipient_id: input.recipientId,
            channel: input.channel,
            provider: input.provider,
            status: input.status,
            error_message: input.errorMessage ?? null,
            failed_at:
                input.status === 'skipped'
                    ? now
                    : null,
            updated_at: now,
        })
        .select('id')
        .single()

    if (error || !data) {
        throw new CommunicationsError(
            500,
            error?.message ??
                'Unable to create communication delivery audit record.',
        )
    }

    return data.id as string
}

async function updateDelivery(
    context: AccessContext,
    deliveryId: string,
    values: JsonRecord,
): Promise<void> {
    const { error } = await context.admin
        .from('communication_deliveries')
        .update({
            ...values,
            updated_at: new Date().toISOString(),
        })
        .eq('id', deliveryId)
        .eq('organisation_id', context.organisationId)

    if (error) {
        console.error(
            'Failed to update communications delivery audit record:',
            error,
        )
    }
}

async function handleSend(
    context: AccessContext,
    body: JsonRecord,
): Promise<Response> {
    const templateCode = stringValue(
        body,
        'templateCode',
    )
    const sourceType = stringValue(
        body,
        'sourceType',
    )
    const rawSourceId = stringValue(
        body,
        'sourceId',
    )
    const sourceId = isUuid(rawSourceId)
        ? rawSourceId
        : null
    const messageClass = messageClassValue(
        body.messageClass,
    )
    const hasExplicitChannels =
        Array.isArray(body.channels) && body.channels.length > 0
    const routingMode = routingModeValue(
        body.routingMode,
        hasExplicitChannels,
    )
    const explicitChannels = routingMode === 'explicit'
        ? channelsValue(body.channels)
        : []
    const recipients = recipientsValue(body.recipients)
    const customSubject = stringValue(body, 'subject')
    const customBody = stringValue(body, 'body')

    if (messageClass !== 'service') {
        throw new CommunicationsError(
            400,
            'TournamentHQ Communications currently sends operational/service communications only. Marketing messaging requires the dedicated consent workflow.',
        )
    }

    const financeSource =
        sourceType?.startsWith('club_finance') ?? false

    if (
        financeSource
            ? !context.canSendFinance
            : !context.canSendGeneral
    ) {
        throw new CommunicationsError(
            403,
            financeSource
                ? 'Treasurer, finance administrator or organisation administrator access is required to send finance reminders.'
                : 'Competition Manager or Super Admin access is required to send organisation communications.',
        )
    }

    const settings = await loadSettings(context)
    const templates = await effectiveTemplates(context)
    const template = templateCode
        ? templates.find((item) => item.code === templateCode) ?? null
        : null

    if (templateCode && !template) {
        throw new CommunicationsError(
            400,
            'The selected communication template is unavailable.',
        )
    }

    if (!template && !customBody) {
        throw new CommunicationsError(
            400,
            'Select a template or enter a message body.',
        )
    }

    const baseSubject =
        customSubject ??
        template?.subject_template ??
        null
    const baseBody =
        customBody ??
        template?.body_template ??
        ''

    const now = new Date().toISOString()

    const {
        data: message,
        error: messageError,
    } = await context.admin
        .from('communication_messages')
        .insert({
            organisation_id: context.organisationId,
            template_id: template?.id ?? null,
            template_code: template?.code ?? templateCode,
            message_class: messageClass,
            source_type: sourceType,
            source_id: sourceId,
            subject_template: baseSubject,
            body_template: baseBody,
            status: 'processing',
            created_by: context.user.id,
            updated_at: now,
        })
        .select('id')
        .single()

    if (messageError || !message) {
        throw new CommunicationsError(
            500,
            messageError?.message ??
                'Unable to create communication audit record.',
        )
    }

    const messageId = message.id as string
    let requestedDeliveries = 0
    let accepted = 0
    let skipped = 0
    let failed = 0

    for (const recipient of recipients) {
        const phone = normalisePhone(
            recipient.phone,
            settings.default_country_code,
        )
        const whatsappPhone = normalisePhone(
            recipient.whatsappPhone ?? recipient.phone,
            settings.default_country_code,
        )

        const {
            data: recipientRow,
            error: recipientError,
        } = await context.admin
            .from('communication_recipients')
            .insert({
                message_id: messageId,
                organisation_id: context.organisationId,
                contact_id:
                    isUuid(recipient.contactId)
                        ? recipient.contactId
                        : null,
                player_id:
                    isUuid(recipient.playerId)
                        ? recipient.playerId
                        : null,
                team_id:
                    isUuid(recipient.teamId)
                        ? recipient.teamId
                        : null,
                recipient_name: recipient.recipientName,
                email: recipient.email,
                phone_e164: phone,
                whatsapp_e164: whatsappPhone,
                variables: recipient.variables,
            })
            .select('id')
            .single()

        if (recipientError || !recipientRow) {
            failed += 1
            requestedDeliveries += 1
            console.error(
                'Unable to create communication recipient audit row:',
                recipientError,
            )
            continue
        }

        const recipientId = recipientRow.id as string
        const variables: Record<string, string> = {
            organisation_name: context.organisationName,
            recipient_name: recipient.recipientName,
            recipient_first_name:
                firstName(recipient.recipientName),
            ...recipient.variables,
        }

        const renderedSubject =
            renderTemplate(
                baseSubject,
                variables,
            )
        const renderedBody =
            renderTemplate(
                baseBody,
                variables,
            ) ?? ''

        const channels = routingMode === 'auto'
            ? preferredChannelOrder(settings).filter((channel) => {
                if (!channelEnabled(settings, channel)) return false
                if (!liveProviderAvailable(channel)) return false
                return Boolean(
                    targetForChannel(
                        channel,
                        recipient,
                        phone,
                        whatsappPhone,
                    ),
                )
            })
            : explicitChannels

        if (channels.length === 0) {
            requestedDeliveries += 1

            const fallbackChannel = recipient.email
                ? 'email'
                : whatsappPhone
                    ? 'whatsapp'
                    : phone
                        ? 'sms'
                        : 'email'
            const provider = getSelectedProvider(fallbackChannel)

            await insertDelivery(context, {
                messageId,
                recipientId,
                channel: fallbackChannel,
                provider,
                status: 'skipped',
                errorMessage:
                    'No live configured delivery route is available for this recipient.',
            })
            skipped += 1
            continue
        }

        let recipientAccepted = false

        for (const channel of channels) {
            if (routingMode === 'auto' && recipientAccepted) {
                break
            }

            requestedDeliveries += 1
            const provider = getSelectedProvider(channel)
            const target = targetForChannel(
                channel,
                recipient,
                phone,
                whatsappPhone,
            )

            if (!channelEnabled(settings, channel)) {
                await insertDelivery(context, {
                    messageId,
                    recipientId,
                    channel,
                    provider,
                    status: 'skipped',
                    errorMessage:
                        `${channel} is disabled for this organisation.`,
                })
                skipped += 1
                continue
            }

            if (!target) {
                await insertDelivery(context, {
                    messageId,
                    recipientId,
                    channel,
                    provider,
                    status: 'skipped',
                    errorMessage:
                        channel === 'email'
                            ? 'Recipient has no email address.'
                            : 'Recipient has no valid mobile number.',
                })
                skipped += 1
                continue
            }

            if (
                routingMode === 'auto' &&
                !liveProviderAvailable(channel)
            ) {
                continue
            }

            const deliveryId = await insertDelivery(
                context,
                {
                    messageId,
                    recipientId,
                    channel,
                    provider,
                    status: 'queued',
                },
            )

            try {
                const providerResult =
                    await sendWithProvider({
                        channel,
                        recipientName:
                            recipient.recipientName,
                        email:
                            channel === 'email'
                                ? recipient.email
                                : null,
                        phone:
                            channel === 'sms'
                                ? phone
                                : channel === 'whatsapp'
                                    ? whatsappPhone
                                    : null,
                        subject: renderedSubject,
                        body: renderedBody,
                        senderName:
                            settings.sender_name?.trim() ||
                            context.organisationName,
                        replyToEmail:
                            settings.reply_to_email,
                        providerTemplateRef:
                            providerTemplateRef(
                                template,
                                providerResultProviderPlaceholder(provider),
                                channel,
                            ),
                        variables,
                    })

                await updateDelivery(
                    context,
                    deliveryId,
                    {
                        provider: providerResult.provider,
                        status: providerResult.status,
                        provider_message_id:
                            providerResult.providerMessageId,
                        provider_request_id:
                            providerResult.providerRequestId,
                        sent_at:
                            providerResult.status === 'sent'
                                ? new Date().toISOString()
                                : null,
                        error_code: null,
                        error_message: null,
                    },
                )
                accepted += 1
                recipientAccepted = true
            } catch (sendError) {
                const messageText =
                    sendError instanceof Error
                        ? sendError.message
                        : 'The provider rejected this message.'

                await updateDelivery(
                    context,
                    deliveryId,
                    {
                        status: 'failed',
                        error_message: messageText,
                        failed_at: new Date().toISOString(),
                    },
                )
                failed += 1

                // Auto routing deliberately continues to the next available
                // live route. Explicit legacy sends preserve the old behaviour
                // and process each requested channel independently.
            }
        }
    }

    const messageStatus =
        accepted > 0 && failed === 0
            ? 'sent'
            : accepted > 0
                ? 'part_sent'
                : 'failed'

    await context.admin
        .from('communication_messages')
        .update({
            status: messageStatus,
            updated_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('organisation_id', context.organisationId)

    return jsonResponse({
        messageId,
        requestedRecipients: recipients.length,
        requestedDeliveries,
        accepted,
        skipped,
        failed,
        status: messageStatus,
    })
}

// Keeping provider-name typing explicit avoids leaking implementation-specific
// provider selection into the template lookup call site.
function providerResultProviderPlaceholder(
    provider: ProviderName,
): ProviderName {
    return provider
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        })
    }

    if (request.method !== 'POST') {
        return jsonResponse(
            { error: 'Method not allowed.' },
            405,
        )
    }

    try {
        const body = await requestBody(request)
        const action = actionValue(
            requiredString(body, 'action'),
        )
        const organisationId = requiredString(
            body,
            'organisationId',
        )
        const context = await requireAccess(
            request,
            organisationId,
        )

        if (!context.canSendGeneral && !context.canSendFinance) {
            throw new CommunicationsError(
                403,
                'You do not have permission to use TournamentHQ Communications.',
            )
        }

        if (action === 'provider_status') {
            return handleProviderStatus(context)
        }
        if (action === 'list_templates') {
            return handleTemplates(context)
        }
        if (action === 'recipient_directory') {
            return handleRecipientDirectory(context)
        }
        if (action === 'history') {
            if (!context.canSendGeneral) {
                throw new CommunicationsError(
                    403,
                    'Organisation administrator access is required to view the communications history.',
                )
            }
            return handleHistory(context, body)
        }
        return handleSend(context, body)
    } catch (error) {
        console.error(
            'TournamentHQ Communications request failed:',
            error,
        )

        if (error instanceof CommunicationsError) {
            return jsonResponse(
                { error: error.message },
                error.status,
            )
        }

        return jsonResponse(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'TournamentHQ Communications request failed.',
            },
            500,
        )
    }
})
