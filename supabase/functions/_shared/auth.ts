import {
    createClient,
    type SupabaseClient,
    type User,
} from 'npm:@supabase/supabase-js@2'

import {
    HttpError,
} from './http.ts'

type MembershipRow = {
    role: string
    active: boolean
}

type PlatformAdminRow = {
    active: boolean
}

export type BillingAuthContext = {
    admin: SupabaseClient
    user: User
}

function getRequiredEnvironment(
    name: string,
): string {
    const value = Deno.env.get(name)?.trim()

    if (!value) {
        throw new Error(
            `Missing required environment variable: ${name}`,
        )
    }

    return value
}

function getBearerToken(
    request: Request,
): string {
    const authorization =
        request.headers.get(
            'Authorization',
        )

    if (
        !authorization ||
        !authorization.startsWith(
            'Bearer ',
        )
    ) {
        throw new HttpError(
            401,
            'Authentication is required.',
        )
    }

    const token =
        authorization.slice(7).trim()

    if (!token) {
        throw new HttpError(
            401,
            'Authentication is required.',
        )
    }

    return token
}

export function createAdminClient():
    SupabaseClient {
    return createClient(
        getRequiredEnvironment(
            'SUPABASE_URL',
        ),
        getRequiredEnvironment(
            'SUPABASE_SERVICE_ROLE_KEY',
        ),
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        },
    )
}

export async function requireBillingAdmin(
    request: Request,
    organisationId: string,
): Promise<BillingAuthContext> {
    const supabaseUrl =
        getRequiredEnvironment(
            'SUPABASE_URL',
        )
    const supabaseAnonKey =
        getRequiredEnvironment(
            'SUPABASE_ANON_KEY',
        )
    const token =
        getBearerToken(request)

    const authClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        },
    )

    const {
        data: { user },
        error: userError,
    } = await authClient.auth.getUser(
        token,
    )

    if (userError || !user) {
        throw new HttpError(
            401,
            'Your TournamentHQ session could not be verified.',
        )
    }

    const admin = createAdminClient()

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
        throw new HttpError(
            500,
            membershipError.message,
        )
    }

    const membership =
        membershipData as MembershipRow | null

    if (
        membership?.active &&
        membership.role === 'super_admin'
    ) {
        return {
            admin,
            user,
        }
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
        throw new HttpError(
            500,
            platformAdminError.message,
        )
    }

    const platformAdmin =
        platformAdminData as
            | PlatformAdminRow
            | null

    if (!platformAdmin?.active) {
        throw new HttpError(
            403,
            'Only an organisation administrator can manage billing.',
        )
    }

    return {
        admin,
        user,
    }
}
