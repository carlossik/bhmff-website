import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
}

type ManageUserAction =
    | 'remove_user'

type ManageUserRequest = {
    action: ManageUserAction
    organisationId: string
    userId: string
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

function isValidAction(
    value: string,
): value is ManageUserAction {
    return value === 'remove_user'
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

        if (
            !supabaseUrl ||
            !serviceRoleKey
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

        const authenticatedUser =
            authenticatedUserData.user

        if (
            authenticatedUserError ||
            !authenticatedUser
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
                ManageUserRequest

        const action =
            body.action?.trim()

        const organisationId =
            body.organisationId?.trim()

        const targetUserId =
            body.userId?.trim()

        if (
            !action ||
            !isValidAction(action)
        ) {
            throw new Error(
                'A valid user-management action is required.',
            )
        }

        if (!organisationId) {
            throw new Error(
                'An organisation is required.',
            )
        }

        if (!targetUserId) {
            throw new Error(
                'A user is required.',
            )
        }

        if (
            targetUserId ===
            authenticatedUser.id
        ) {
            return jsonResponse(
                {
                    error:
                        'You cannot remove your own TournamentHQ access.',
                },
                400,
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
            return jsonResponse(
                {
                    error:
                        'The selected organisation does not exist.',
                },
                404,
            )
        }

        const {
            data: requesterProfile,
            error: requesterProfileError,
        } = await adminClient
            .from('profiles')
            .select('id, active')
            .eq(
                'id',
                authenticatedUser.id,
            )
            .maybeSingle()

        if (requesterProfileError) {
            throw requesterProfileError
        }

        if (
            !requesterProfile ||
            !requesterProfile.active
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
            data: requesterMembership,
            error: requesterMembershipError,
        } = await adminClient
            .from(
                'organisation_memberships',
            )
            .select('id, role, active')
            .eq(
                'organisation_id',
                organisationId,
            )
            .eq(
                'user_id',
                authenticatedUser.id,
            )
            .maybeSingle()

        if (requesterMembershipError) {
            throw requesterMembershipError
        }

        if (
            !requesterMembership ||
            !requesterMembership.active ||
            requesterMembership.role !==
            'super_admin'
        ) {
            return jsonResponse(
                {
                    error:
                        'Only an active Organisation Admin can remove users from this organisation.',
                },
                403,
            )
        }

        const {
            data: targetMembership,
            error: targetMembershipError,
        } = await adminClient
            .from(
                'organisation_memberships',
            )
            .select(
                'id, user_id, organisation_id, role, active',
            )
            .eq(
                'organisation_id',
                organisationId,
            )
            .eq(
                'user_id',
                targetUserId,
            )
            .maybeSingle()

        if (targetMembershipError) {
            throw targetMembershipError
        }

        if (!targetMembership) {
            return jsonResponse(
                {
                    error:
                        `This user does not have access to ${organisation.name}.`,
                },
                404,
            )
        }

        if (
            targetMembership.role ===
            'super_admin' &&
            targetMembership.active
        ) {
            const {
                count:
                    activeSuperAdminCount,
                error:
                    superAdminCountError,
            } = await adminClient
                .from(
                    'organisation_memberships',
                )
                .select('id', {
                    count: 'exact',
                    head: true,
                })
                .eq(
                    'organisation_id',
                    organisationId,
                )
                .eq(
                    'role',
                    'super_admin',
                )
                .eq(
                    'active',
                    true,
                )

            if (superAdminCountError) {
                throw superAdminCountError
            }

            if (
                (activeSuperAdminCount ??
                    0) <= 1
            ) {
                return jsonResponse(
                    {
                        error:
                            `You cannot remove the final active Super Admin from ${organisation.name}.`,
                    },
                    400,
                )
            }
        }

        const {
            count: membershipCount,
            error: membershipCountError,
        } = await adminClient
            .from(
                'organisation_memberships',
            )
            .select('id', {
                count: 'exact',
                head: true,
            })
            .eq(
                'user_id',
                targetUserId,
            )

        if (membershipCountError) {
            throw membershipCountError
        }

        const isFinalMembership =
            (membershipCount ?? 0) <= 1

        if (!isFinalMembership) {
            const {
                error:
                    membershipDeleteError,
            } = await adminClient
                .from(
                    'organisation_memberships',
                )
                .delete()
                .eq(
                    'id',
                    targetMembership.id,
                )
                .eq(
                    'organisation_id',
                    organisationId,
                )
                .eq(
                    'user_id',
                    targetUserId,
                )

            if (membershipDeleteError) {
                throw membershipDeleteError
            }

            return jsonResponse(
                {
                    success: true,
                    action,
                    userId:
                    targetUserId,
                    organisationId,
                    accountDeleted: false,
                    membershipRemoved: true,
                    message:
                        `The user was removed from ${organisation.name}. Their TournamentHQ account remains available through another organisation.`,
                },
                200,
            )
        }

        const {
            error: authDeleteError,
        } =
            await adminClient.auth.admin
                .deleteUser(
                    targetUserId,
                )

        if (authDeleteError) {
            throw authDeleteError
        }

        /*
         * These cleanup operations are safe even when foreign-key
         * cascade rules already removed the rows.
         */
        const {
            error:
                membershipCleanupError,
        } = await adminClient
            .from(
                'organisation_memberships',
            )
            .delete()
            .eq(
                'user_id',
                targetUserId,
            )

        if (membershipCleanupError) {
            throw membershipCleanupError
        }

        const {
            error: profileCleanupError,
        } = await adminClient
            .from('profiles')
            .delete()
            .eq(
                'id',
                targetUserId,
            )

        if (profileCleanupError) {
            throw profileCleanupError
        }

        return jsonResponse(
            {
                success: true,
                action,
                userId:
                targetUserId,
                organisationId,
                accountDeleted: true,
                membershipRemoved: true,
                message:
                    `The user was removed from ${organisation.name} and their TournamentHQ account was deleted.`,
            },
            200,
        )
    } catch (error) {
        console.error(
            'User-management action failed:',
            error,
        )

        return jsonResponse(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unable to complete the user-management action.',
            },
            400,
        )
    }
})