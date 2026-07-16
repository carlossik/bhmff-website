import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
}

type AdminRole =
    | 'match_official'
    | 'competition_manager'
    | 'super_admin'

type InviteAction =
    | 'invite'
    | 'resend_setup'

type InviteRequest = {
    action?: InviteAction
    fullName: string
    email: string
    role: AdminRole
    redirectUrl: string
}

function isValidRole(value: string): value is AdminRole {
    return [
        'match_official',
        'competition_manager',
        'super_admin',
    ].includes(value)
}

function isValidAction(
    value: string
): value is InviteAction {
    return [
        'invite',
        'resend_setup',
    ].includes(value)
}

function jsonResponse(
    body: Record<string, unknown>,
    status: number
) {
    return new Response(
        JSON.stringify(body),
        {
            status,
            headers: {
                ...corsHeaders,
                'Content-Type':
                    'application/json',
            },
        }
    )
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', {
            headers: corsHeaders,
        })
    }

    try {
        const supabaseUrl =
            Deno.env.get('SUPABASE_URL')

        const serviceRoleKey =
            Deno.env.get(
                'SUPABASE_SERVICE_ROLE_KEY'
            )

        const anonKey =
            Deno.env.get(
                'SUPABASE_ANON_KEY'
            )

        if (
            !supabaseUrl ||
            !serviceRoleKey ||
            !anonKey
        ) {
            throw new Error(
                'Supabase function environment is not configured.'
            )
        }

        const authorization =
            request.headers.get('Authorization')

        if (!authorization) {
            return jsonResponse(
                {
                    error:
                        'Authentication is required.',
                },
                401
            )
        }

        const adminClient = createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        )

        const publicClient = createClient(
            supabaseUrl,
            anonKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        )

        const token =
            authorization.replace(
                'Bearer ',
                ''
            )

        const {
            data: userData,
            error: userError,
        } = await adminClient.auth.getUser(
            token
        )

        if (
            userError ||
            !userData.user
        ) {
            return jsonResponse(
                {
                    error:
                        'Your session could not be verified.',
                },
                401
            )
        }

        const {
            data: profile,
            error: profileLookupError,
        } = await adminClient
            .from('profiles')
            .select('role, active')
            .eq(
                'id',
                userData.user.id
            )
            .maybeSingle()

        if (profileLookupError) {
            throw profileLookupError
        }

        if (
            !profile ||
            profile.role !==
            'super_admin' ||
            !profile.active
        ) {
            return jsonResponse(
                {
                    error:
                        'Only an active Super Admin can manage user invitations.',
                },
                403
            )
        }

        const body =
            (await request.json()) as
                InviteRequest

        const action =
            body.action ?? 'invite'

        const fullName =
            body.fullName?.trim()

        const email =
            body.email
                ?.trim()
                .toLowerCase()

        const role = body.role

        const redirectUrl =
            body.redirectUrl?.trim()

        if (
            !isValidAction(action)
        ) {
            throw new Error(
                'A valid invitation action is required.'
            )
        }

        if (!fullName) {
            throw new Error(
                'Full name is required.'
            )
        }

        if (
            !email ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email
            )
        ) {
            throw new Error(
                'A valid email address is required.'
            )
        }

        if (
            !role ||
            !isValidRole(role)
        ) {
            throw new Error(
                'A valid administrator role is required.'
            )
        }

        if (!redirectUrl) {
            throw new Error(
                'A redirect URL is required.'
            )
        }

        if (
            action ===
            'resend_setup'
        ) {
            const {
                data: existingProfile,
                error: existingProfileError,
            } = await adminClient
                .from('profiles')
                .select(
                    'id, full_name, email, role'
                )
                .eq('email', email)
                .maybeSingle()

            if (existingProfileError) {
                throw existingProfileError
            }

            if (!existingProfile) {
                throw new Error(
                    'No administrator account exists for this email address.'
                )
            }

            const {
                error: resetError,
            } =
                await publicClient.auth
                    .resetPasswordForEmail(
                        email,
                        {
                            redirectTo:
                            redirectUrl,
                        }
                    )

            if (resetError) {
                throw resetError
            }

            return jsonResponse(
                {
                    success: true,
                    action,
                    userId:
                    existingProfile.id,
                    email,
                },
                200
            )
        }

        const {
            data: existingProfile,
            error: existingProfileError,
        } = await adminClient
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle()

        if (existingProfileError) {
            throw existingProfileError
        }

        if (existingProfile) {
            throw new Error(
                'An administrator account already exists for this email address.'
            )
        }

        const {
            data: inviteData,
            error: inviteError,
        } =
            await adminClient.auth.admin
                .inviteUserByEmail(
                    email,
                    {
                        redirectTo:
                        redirectUrl,
                        data: {
                            full_name:
                            fullName,
                            requested_role:
                            role,
                        },
                    }
                )

        if (inviteError) {
            throw inviteError
        }

        if (!inviteData.user) {
            throw new Error(
                'The invitation was created without a user account.'
            )
        }

        const {
            error: profileError,
        } = await adminClient
            .from('profiles')
            .upsert({
                id:
                inviteData.user.id,
                full_name:
                fullName,
                email,
                role,
                active: true,
                updated_at:
                    new Date()
                        .toISOString(),
            })

        if (profileError) {
            throw profileError
        }

        return jsonResponse(
            {
                success: true,
                action,
                userId:
                inviteData.user.id,
                email,
            },
            200
        )
    } catch (error) {
        console.error(
            'User invitation action failed:',
            error
        )

        return jsonResponse(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unable to complete the user invitation action.',
            },
            400
        )
    }
})