import {
    createClient,
    type SupabaseClient,
    type User,
} from 'npm:@supabase/supabase-js@^2'
export type ClubFinanceRole =
    | 'platform_admin'
    | 'super_admin'
    | 'treasurer'
    | 'finance_admin'
    | 'team_manager'
    | 'committee_viewer'

export type ClubFinanceAccessContext = {
    client: SupabaseClient
    admin: SupabaseClient
    user: User
    organisationId: string
    currency: string
    role: ClubFinanceRole
    teamId: string | null
    correlationId: string
}

type OrganisationRow = {
    id: string
    status: string
    organisation_type: string
    currency: string | null
}

type FinanceAccessRow = {
    role: string
    team_id: string | null
    active: boolean
}

export class ClubFinanceError extends Error {
    readonly status: number

    constructor(status: number, message: string) {
        super(message)
        this.name = 'ClubFinanceError'
        this.status = status
    }
}

const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type, x-correlation-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Expose-Headers': 'X-Correlation-Id',
}

function requiredEnvironment(name: string): string {
    const value = Deno.env.get(name)?.trim()

    if (!value) {
        throw new ClubFinanceError(
            500,
            `Missing required environment variable: ${name}`,
        )
    }

    return value
}

function createAdminClient(): SupabaseClient {
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
        throw new ClubFinanceError(
            401,
            'Authentication is required.',
        )
    }

    const token = authorization.slice(7).trim()

    if (!token) {
        throw new ClubFinanceError(
            401,
            'Authentication is required.',
        )
    }

    return token
}

function createUserClient(
    request: Request,
): SupabaseClient {
    const token = bearerToken(request)

    return createClient(
        requiredEnvironment('SUPABASE_URL'),
        requiredEnvironment('SUPABASE_ANON_KEY'),
        {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        },
    )
}

export function jsonResponse(
    body: unknown,
    status = 200,
    correlationId?: string,
): Response {
    return new Response(
        JSON.stringify(body),
        {
            status,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                ...(correlationId
                    ? { 'X-Correlation-Id': correlationId }
                    : {}),
            },
        },
    )
}

export function optionsResponse(): Response {
    return new Response(null, {
        status: 204,
        headers: corsHeaders,
    })
}

export function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    )
}

export async function readJsonBody(
    request: Request,
): Promise<Record<string, unknown>> {
    let value: unknown

    try {
        value = await request.json()
    } catch {
        throw new ClubFinanceError(
            400,
            'A valid JSON request body is required.',
        )
    }

    if (!isRecord(value)) {
        throw new ClubFinanceError(
            400,
            'A JSON object is required.',
        )
    }

    return value
}

export function requiredString(
    record: Record<string, unknown>,
    key: string,
): string {
    const value = record[key]

    if (typeof value !== 'string' || !value.trim()) {
        throw new ClubFinanceError(
            400,
            `${key} is required.`,
        )
    }

    return value.trim()
}

export function optionalString(
    record: Record<string, unknown>,
    key: string,
): string | null {
    const value = record[key]

    if (value === null || value === undefined || value === '') {
        return null
    }

    if (typeof value !== 'string') {
        throw new ClubFinanceError(
            400,
            `${key} must be a string.`,
        )
    }

    const trimmed = value.trim()
    return trimmed || null
}

export function optionalBoolean(
    record: Record<string, unknown>,
    key: string,
): boolean | null {
    const value = record[key]

    if (value === null || value === undefined) {
        return null
    }

    if (typeof value !== 'boolean') {
        throw new ClubFinanceError(
            400,
            `${key} must be a boolean.`,
        )
    }

    return value
}

export function requiredNumber(
    record: Record<string, unknown>,
    key: string,
): number {
    const value = record[key]

    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ClubFinanceError(
            400,
            `${key} must be a valid number.`,
        )
    }

    return value
}

export function optionalNumber(
    record: Record<string, unknown>,
    key: string,
): number | null {
    const value = record[key]

    if (value === null || value === undefined || value === '') {
        return null
    }

    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ClubFinanceError(
            400,
            `${key} must be a valid number.`,
        )
    }

    return value
}

export function stringArray(
    record: Record<string, unknown>,
    key: string,
): string[] {
    const value = record[key]

    if (!Array.isArray(value)) {
        throw new ClubFinanceError(
            400,
            `${key} must be an array.`,
        )
    }

    const result = value.filter(
        (item): item is string =>
            typeof item === 'string' &&
            item.trim().length > 0,
    )

    if (result.length !== value.length) {
        throw new ClubFinanceError(
            400,
            `${key} contains an invalid value.`,
        )
    }

    return result.map((item) => item.trim())
}

export function optionalDate(
    record: Record<string, unknown>,
    key: string,
): string | null {
    const value = optionalString(record, key)

    if (!value) {
        return null
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new ClubFinanceError(
            400,
            `${key} must use YYYY-MM-DD format.`,
        )
    }

    return value
}

async function authenticatedUser(
    client: SupabaseClient,
): Promise<User> {
    const {
        data: { user },
        error,
    } = await client.auth.getUser()

    if (error || !user) {
        throw new ClubFinanceError(
            401,
            'Your TournamentHQ session could not be verified.',
        )
    }

    return user
}

function isFinanceRole(
    role: string,
): role is Exclude<
    ClubFinanceRole,
    'platform_admin' | 'super_admin'
> {
    return (
        role === 'treasurer' ||
        role === 'finance_admin' ||
        role === 'team_manager' ||
        role === 'committee_viewer'
    )
}

export async function requireClubFinanceAccess(
    request: Request,
    organisationId: string,
    options: {
        full?: boolean
        teamId?: string | null
        allowCommitteeViewer?: boolean
    } = {},
): Promise<ClubFinanceAccessContext> {
    const client = createUserClient(request)
    const user = await authenticatedUser(client)
    const admin = createAdminClient()
    const correlationId =
        request.headers.get('X-Correlation-Id')?.trim() ||
        crypto.randomUUID()

    const {
        data: organisationData,
        error: organisationError,
    } = await admin
        .from('organisations')
        .select('id, status, organisation_type, currency')
        .eq('id', organisationId)
        .maybeSingle()

    if (organisationError) {
        throw new ClubFinanceError(
            500,
            organisationError.message,
        )
    }

    const organisation =
        organisationData as OrganisationRow | null

    if (!organisation) {
        throw new ClubFinanceError(
            404,
            'The selected organisation does not exist.',
        )
    }

    if (organisation.organisation_type !== 'club') {
        throw new ClubFinanceError(
            403,
            'Club Finance is available only for club organisations.',
        )
    }

    if (organisation.status !== 'active') {
        throw new ClubFinanceError(
            403,
            'The selected club is not active.',
        )
    }

    const {
        data: platformAdminData,
        error: platformAdminError,
    } = await admin
        .from('platform_admins')
        .select('active')
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle()

    if (platformAdminError) {
        throw new ClubFinanceError(
            500,
            platformAdminError.message,
        )
    }

    if (platformAdminData) {
        return {
            client,
            admin,
            user,
            organisationId,
            currency: organisation.currency?.trim() || 'GBP',
            role: 'platform_admin',
            teamId: options.teamId ?? null,
            correlationId,
        }
    }

    const {
        data: membershipData,
        error: membershipError,
    } = await admin
        .from('organisation_memberships')
        .select('role, active')
        .eq('organisation_id', organisationId)
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle()

    if (membershipError) {
        throw new ClubFinanceError(
            500,
            membershipError.message,
        )
    }

    if (
        membershipData &&
        typeof membershipData.role === 'string' &&
        membershipData.role === 'super_admin'
    ) {
        return {
            client,
            admin,
            user,
            organisationId,
            currency: organisation.currency?.trim() || 'GBP',
            role: 'super_admin',
            teamId: options.teamId ?? null,
            correlationId,
        }
    }

    const {
        data: financeAccessData,
        error: financeAccessError,
    } = await admin
        .from('club_finance_access')
        .select('role, team_id, active')
        .eq('organisation_id', organisationId)
        .eq('user_id', user.id)
        .eq('active', true)

    if (financeAccessError) {
        throw new ClubFinanceError(
            500,
            financeAccessError.message,
        )
    }

    const accessRows = (
        financeAccessData ?? []
    ) as FinanceAccessRow[]

    const fullRole = accessRows.find(
        (row) =>
            row.role === 'treasurer' ||
            row.role === 'finance_admin',
    )

    if (fullRole && isFinanceRole(fullRole.role)) {
        return {
            client,
            admin,
            user,
            organisationId,
            currency: organisation.currency?.trim() || 'GBP',
            role: fullRole.role,
            teamId: options.teamId ?? null,
            correlationId,
        }
    }

    if (options.full) {
        throw new ClubFinanceError(
            403,
            'Treasurer or finance administrator access is required.',
        )
    }

    const requestedTeamId = options.teamId ?? null

    if (requestedTeamId) {
        const teamRole = accessRows.find(
            (row) =>
                row.role === 'team_manager' &&
                row.team_id === requestedTeamId,
        )

        if (teamRole && teamRole.role === 'team_manager') {
            return {
                client,
                admin,
                user,
                organisationId,
                currency: organisation.currency?.trim() || 'GBP',
                role: 'team_manager',
                teamId: requestedTeamId,
                correlationId,
            }
        }
    }

    if (options.allowCommitteeViewer) {
        const viewer = accessRows.find(
            (row) => row.role === 'committee_viewer',
        )

        if (viewer) {
            return {
                client,
                admin,
                user,
                organisationId,
                currency: organisation.currency?.trim() || 'GBP',
                role: 'committee_viewer',
                teamId: null,
                correlationId,
            }
        }
    }

    throw new ClubFinanceError(
        403,
        'You do not have access to Club Finance.',
    )
}

function safeErrorDetails(
    error: unknown,
): Record<string, unknown> {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
        }
    }

    return {
        message: 'Unknown Club Finance error',
    }
}

export async function logClubFinanceFailure(
    context: ClubFinanceAccessContext | null,
    eventType: string,
    error: unknown,
    durationMs: number,
): Promise<void> {
    if (!context) {
        return
    }

    try {
        await context.admin
            .from('platform_operations_events')
            .insert({
                source: 'club_finance',
                category: 'application',
                event_type: eventType,
                severity: 'error',
                processing_status: 'failed',
                organisation_id: context.organisationId,
                user_id: context.user.id,
                correlation_id: context.correlationId,
                message:
                    error instanceof Error
                        ? error.message
                        : 'Club Finance operation failed.',
                details: safeErrorDetails(error),
                duration_ms: Math.max(0, Math.round(durationMs)),
                occurred_at: new Date().toISOString(),
            })
    } catch (loggingError) {
        console.error(
            'Failed to write Club Finance production telemetry:',
            loggingError,
        )
    }
}

export function errorResponse(
    error: unknown,
    correlationId?: string,
): Response {
    if (error instanceof ClubFinanceError) {
        return jsonResponse(
            { error: error.message, correlationId },
            error.status,
            correlationId,
        )
    }

    const message =
        error instanceof Error
            ? error.message
            : 'Club Finance request failed.'

    return jsonResponse(
        { error: message, correlationId },
        500,
        correlationId,
    )
}
