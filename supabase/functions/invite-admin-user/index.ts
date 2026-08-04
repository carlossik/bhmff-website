import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
}

type AdminRole =
    | 'content_editor'
    | 'match_official'
    | 'competition_manager'
    | 'super_admin'

type InviteAction =
    | 'invite'
    | 'resend_setup'

type InviteRequest = {
    action?: InviteAction
    organisationId: string
    fullName: string
    email: string
    role: AdminRole
    redirectUrl: string
}

type ProfileRow = {
    id: string
    full_name: string | null
    email: string | null
    active: boolean
}

function isValidRole(
    value: string,
): value is AdminRole {
    return [
        'content_editor',
        'match_official',
        'competition_manager',
        'super_admin',
    ].includes(value)
}

function isValidAction(
    value: string,
): value is InviteAction {
    return [
        'invite',
        'resend_setup',
    ].includes(value)
}

function jsonResponse(
    body: Record<string, unknown>,
    status: number,
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
        },
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
                'SUPABASE_SERVICE_ROLE_KEY',
            )

        const anonKey =
            Deno.env.get(
                'SUPABASE_ANON_KEY',
            )

        if (
            !supabaseUrl ||
            !serviceRoleKey ||
            !anonKey
        ) {
            throw new Error(
                'Supabase function environment is not configured.',
            )
        }

        const authorization =
            request.headers.get(
                'Authorization',
            )

        if (!authorization) {
            return jsonResponse(
                {
                    error:
                        'Authentication is required.',
                },
                401,
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
            },
        )

        const publicClient = createClient(
            supabaseUrl,
            anonKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            },
        )

        const token =
            authorization.replace(
                'Bearer ',
                '',
            )

        const {
            data: authenticatedUserData,
            error: authenticatedUserError,
        } = await adminClient.auth.getUser(
            token,
        )

        if (
            authenticatedUserError ||
            !authenticatedUserData.user
        ) {
            return jsonResponse(
                {
                    error:
                        'Your session could not be verified.',
                },
                401,
            )
        }

        const body =
            (await request.json()) as
                InviteRequest

        const action =
            body.action ?? 'invite'

        const organisationId =
            body.organisationId?.trim()

        const fullName =
            body.fullName?.trim()

        const email =
            body.email
                ?.trim()
                .toLowerCase()

        const role = body.role

        const redirectUrl =
            body.redirectUrl?.trim()

        if (!isValidAction(action)) {
            throw new Error(
                'A valid invitation action is required.',
            )
        }

        if (!organisationId) {
            throw new Error(
                'An organisation is required.',
            )
        }

        if (!fullName) {
            throw new Error(
                'Full name is required.',
            )
        }

        if (
            !email ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email,
            )
        ) {
            throw new Error(
                'A valid email address is required.',
            )
        }

        if (
            !role ||
            !isValidRole(role)
        ) {
            throw new Error(
                'A valid administrator role is required.',
            )
        }

        if (!redirectUrl) {
            throw new Error(
                'A redirect URL is required.',
            )
        }

        const {
            data: organisation,
            error: organisationError,
        } = await adminClient
            .from('organisations')
            .select('id, name, status')
            .eq('id', organisationId)
            .maybeSingle()

        if (organisationError) {
            throw organisationError
        }

        if (!organisation) {
            throw new Error(
                'The selected organisation does not exist.',
            )
        }

        if (
            organisation.status !==
            'active'
        ) {
            throw new Error(
                'Users cannot be invited to an inactive organisation.',
            )
        }

        const {
            data: inviterProfile,
            error: inviterProfileError,
        } = await adminClient
            .from('profiles')
            .select('id, active')
            .eq(
                'id',
                authenticatedUserData.user.id,
            )
            .maybeSingle()

        if (inviterProfileError) {
            throw inviterProfileError
        }

        if (
            !inviterProfile ||
            !inviterProfile.active
        ) {
            return jsonResponse(
                {
                    error:
                        'Your TournamentHQ account is inactive.',
                },
                403,
            )
        }

        const {
            data: inviterMembership,
            error: inviterMembershipError,
        } = await adminClient
            .from(
                'organisation_memberships',
            )
            .select(
                'id, role, active',
            )
            .eq(
                'organisation_id',
                organisationId,
            )
            .eq(
                'user_id',
                authenticatedUserData.user.id,
            )
            .maybeSingle()

        if (inviterMembershipError) {
            throw inviterMembershipError
        }

        if (
            !inviterMembership ||
            !inviterMembership.active ||
            inviterMembership.role !==
            'super_admin'
        ) {
            return jsonResponse(
                {
                    error:
                        'Only an active Organisation Admin can manage users for this organisation.',
                },
                403,
            )
        }

        const {
            data: existingProfileData,
            error: existingProfileError,
        } = await adminClient
            .from('profiles')
            .select(
                'id, full_name, email, active',
            )
            .eq('email', email)
            .maybeSingle()

        if (existingProfileError) {
            throw existingProfileError
        }

        const existingProfile =
            existingProfileData as
                | ProfileRow
                | null

        if (
            action ===
            'resend_setup'
        ) {
            if (!existingProfile) {
                throw new Error(
                    'No TournamentHQ account exists for this email address.',
                )
            }

            const {
                data: existingMembership,
                error:
                    existingMembershipError,
            } = await adminClient
                .from(
                    'organisation_memberships',
                )
                .select('id')
                .eq(
                    'organisation_id',
                    organisationId,
                )
                .eq(
                    'user_id',
                    existingProfile.id,
                )
                .maybeSingle()

            if (
                existingMembershipError
            ) {
                throw existingMembershipError
            }

            if (!existingMembership) {
                throw new Error(
                    `This user does not have access to ${organisation.name}.`,
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
                        },
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
                    organisationId,
                },
                200,
            )
        }

        let userId: string

        if (existingProfile) {
            userId =
                existingProfile.id

            const {
                data: duplicateMembership,
                error:
                    duplicateMembershipError,
            } = await adminClient
                .from(
                    'organisation_memberships',
                )
                .select('id')
                .eq(
                    'organisation_id',
                    organisationId,
                )
                .eq(
                    'user_id',
                    userId,
                )
                .maybeSingle()

            if (
                duplicateMembershipError
            ) {
                throw duplicateMembershipError
            }

            if (duplicateMembership) {
                throw new Error(
                    `This user already has access to ${organisation.name}.`,
                )
            }

            const {
                error: profileUpdateError,
            } = await adminClient
                .from('profiles')
                .update({
                    full_name:
                    fullName,
                    updated_at:
                        new Date()
                            .toISOString(),
                })
                .eq('id', userId)

            if (profileUpdateError) {
                throw profileUpdateError
            }
        } else {
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
                            },
                        },
                    )

            if (inviteError) {
                throw inviteError
            }

            if (!inviteData.user) {
                throw new Error(
                    'The invitation was created without a user account.',
                )
            }

            userId =
                inviteData.user.id

            const {
                error: profileError,
            } = await adminClient
                .from('profiles')
                .upsert(
                    {
                        id: userId,
                        full_name:
                        fullName,
                        email,
                        active: true,
                        updated_at:
                            new Date()
                                .toISOString(),
                    },
                    {
                        onConflict: 'id',
                    },
                )

            if (profileError) {
                throw profileError
            }
        }

        const {
            error: membershipInsertError,
        } = await adminClient
            .from(
                'organisation_memberships',
            )
            .insert({
                organisation_id:
                organisationId,
                user_id:
                userId,
                role,
                active: true,
                updated_at:
                    new Date()
                        .toISOString(),
            })

        if (membershipInsertError) {
            throw membershipInsertError
        }

        return jsonResponse(
            {
                success: true,
                action,
                userId,
                email,
                organisationId,
                organisationName:
                organisation.name,
                existingUser:
                    Boolean(
                        existingProfile,
                    ),
            },
            200,
        )
    } catch (error) {
        console.error(
            'User invitation action failed:',
            error,
        )

        return jsonResponse(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unable to complete the user invitation action.',
            },
            400,
        )
    }
})