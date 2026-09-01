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

type OrganisationType =
    | 'club'
    | 'competition_organiser'

type InviteAction =
    | 'invite'
    | 'resend_setup'

type InviteRequest = {
    action?: InviteAction
    organisationId: string
    fullName: string
    email: string
    role: AdminRole
    redirectUrl?: string
}

type ProfileRow = {
    id: string
    full_name: string | null
    email: string | null
    active: boolean
}

type OrganisationRow = {
    id: string
    name: string
    status: string
    organisation_type: OrganisationType
}

type CommunicationSettingsRow = {
    sender_name: string | null
    reply_to_email: string | null
}

type BrandingIdentity = {
    senderName: string
    replyToEmail: string | null
}

type BrandedEmailInput = {
    apiKey: string
    fromEmail: string
    to: string
    recipientName: string
    senderName: string
    replyToEmail: string | null
    organisationName: string
    organisationType: OrganisationType
    role: AdminRole
    actionLink: string
    actionKind: 'invite' | 'password_setup'
}

type AuthLinkData = {
    user: {
        id: string
    } | null
    properties: {
        action_link?: string
    } | null
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    )
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

function htmlEscape(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function plainText(value: string): string {
    return value
        .replace(/[<>]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

function cleanSenderName(
    value: string | null | undefined,
    fallback: string,
): string {
    const cleaned = plainText(
        value?.trim() || fallback,
    ).replace(/"/g, "'")

    return cleaned.slice(0, 80) || 'TournamentHQ'
}

function brandedFromAddress(
    senderName: string,
    fromEmail: string,
): string {
    return `${cleanSenderName(senderName, 'TournamentHQ')} <${fromEmail}>`
}

function roleLabel(
    role: AdminRole,
    organisationType: OrganisationType,
): string {
    if (organisationType === 'club') {
        switch (role) {
            case 'super_admin':
                return 'Club Admin'
            case 'competition_manager':
                return 'Club Operations Manager'
            case 'match_official':
                return 'Match Centre Reporter'
            case 'content_editor':
                return 'Club Content & Media Editor'
        }
    }

    switch (role) {
        case 'super_admin':
            return 'Competition Admin'
        case 'competition_manager':
            return 'Competition Manager'
        case 'match_official':
            return 'Match Official'
        case 'content_editor':
            return 'Content Editor'
    }
}

function workspaceLabel(
    organisationType: OrganisationType,
): string {
    return organisationType === 'club'
        ? 'club workspace'
        : 'competition workspace'
}

function buildInviteHtml(
    input: BrandedEmailInput,
): string {
    const organisationName = htmlEscape(
        input.organisationName,
    )
    const recipientName = htmlEscape(
        input.recipientName,
    )
    const senderName = htmlEscape(
        input.senderName,
    )
    const inviteUrl = htmlEscape(
        input.actionLink,
    )
    const role = htmlEscape(
        roleLabel(
            input.role,
            input.organisationType,
        ),
    )
    const workspace = htmlEscape(
        workspaceLabel(
            input.organisationType,
        ),
    )
    const actionText =
        input.actionKind === 'invite'
            ? 'Accept invitation'
            : 'Set your password'

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${organisationName} invitation</title>
</head>
<body style="margin:0;background:#071106;color:#f8fff4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#071106;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#0d1c0b;border:1px solid #26451c;border-radius:24px;overflow:hidden;">
          <tr>
            <td style="padding:28px 30px 18px;border-bottom:1px solid #203d17;">
              <p style="margin:0 0 10px;color:#9bea20;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;">TournamentHQ Access</p>
              <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.15;">You've been invited to ${organisationName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 30px;">
              <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#d7e8d0;">Hi ${recipientName},</p>
              <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#d7e8d0;">${senderName} has invited you to access the ${organisationName} ${workspace} on TournamentHQ.</p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#d7e8d0;">Your role: <strong style="color:#ffffff;">${role}</strong></p>
              <p style="margin:0 0 28px;">
                <a href="${inviteUrl}" style="display:inline-block;background:#9bea20;color:#071106;text-decoration:none;font-weight:900;border-radius:999px;padding:14px 22px;">${htmlEscape(actionText)}</a>
              </p>
              <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#a9bca2;">If the button does not work, copy and paste this link into your browser:</p>
              <p style="margin:0;font-size:13px;line-height:1.5;word-break:break-all;color:#bdfc55;">${inviteUrl}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 30px;background:#091607;border-top:1px solid #203d17;color:#91a88a;font-size:12px;line-height:1.5;">
              This invitation was sent by ${senderName} via TournamentHQ.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildInviteText(
    input: BrandedEmailInput,
): string {
    const actionText =
        input.actionKind === 'invite'
            ? 'Accept invitation'
            : 'Set your password'

    return [
        `Hi ${input.recipientName},`,
        '',
        `${input.senderName} has invited you to access the ${input.organisationName} ${workspaceLabel(input.organisationType)} on TournamentHQ.`,
        `Role: ${roleLabel(input.role, input.organisationType)}`,
        '',
        `${actionText}: ${input.actionLink}`,
        '',
        `This invitation was sent by ${input.senderName} via TournamentHQ.`,
    ].join('\n')
}

async function sendBrandedEmail(
    input: BrandedEmailInput,
): Promise<void> {
    const response = await fetch(
        'https://api.resend.com/emails',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${input.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: brandedFromAddress(
                    input.senderName,
                    input.fromEmail,
                ),
                to: [input.to],
                subject:
                    input.actionKind === 'invite'
                        ? `You're invited to ${input.organisationName} on TournamentHQ`
                        : `Set up your ${input.organisationName} TournamentHQ access`,
                html: buildInviteHtml(input),
                text: buildInviteText(input),
                reply_to:
                    input.replyToEmail ?? undefined,
            }),
        },
    )

    if (!response.ok) {
        const detail = await response.text()
        throw new Error(
            `Resend could not send the branded invitation email (${response.status}): ${detail.slice(0, 500)}`,
        )
    }
}

function authLinkData(
    value: unknown,
): AuthLinkData {
    if (!isRecord(value)) {
        return {
            user: null,
            properties: null,
        }
    }

    const rawUser = value.user
    const rawProperties = value.properties

    return {
        user:
            isRecord(rawUser) &&
            typeof rawUser.id === 'string'
                ? {
                    id: rawUser.id,
                }
                : null,
        properties:
            isRecord(rawProperties)
                ? {
                    action_link:
                        typeof rawProperties.action_link === 'string'
                            ? rawProperties.action_link
                            : undefined,
                }
                : null,
    }
}

async function loadBrandingIdentity(
    adminClient: ReturnType<typeof createClient>,
    organisationId: string,
    fallbackName: string,
): Promise<BrandingIdentity> {
    const {
        data,
        error,
    } = await adminClient
        .from('communication_settings')
        .select('sender_name, reply_to_email')
        .eq('organisation_id', organisationId)
        .maybeSingle()

    if (error) {
        throw error
    }

    const settings = data as
        | CommunicationSettingsRow
        | null

    return {
        senderName: cleanSenderName(
            settings?.sender_name,
            fallbackName,
        ),
        replyToEmail:
            settings?.reply_to_email?.trim() || null,
    }
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

        const applicationBaseUrl =
            Deno.env.get(
                'TOURNAMENTHQ_APP_URL',
            )?.replace(/\/$/, '')

        const resendApiKey =
            Deno.env.get('RESEND_API_KEY')?.trim()

        const resendFromEmail =
            (
                Deno.env.get('THQ_EMAIL_FROM') ??
                Deno.env.get('RESEND_FROM_EMAIL')
            )?.trim()

        if (
            !supabaseUrl ||
            !serviceRoleKey ||
            !anonKey ||
            !applicationBaseUrl
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

        let parsedApplicationUrl: URL

        try {
            parsedApplicationUrl =
                new URL(applicationBaseUrl)
        } catch {
            throw new Error(
                'TOURNAMENTHQ_APP_URL must be a valid absolute URL.',
            )
        }

        if (
            parsedApplicationUrl.protocol !==
            'https:' ||
            parsedApplicationUrl.hostname ===
            'localhost' ||
            parsedApplicationUrl.hostname ===
            '127.0.0.1'
        ) {
            throw new Error(
                'TOURNAMENTHQ_APP_URL must use a production HTTPS domain.',
            )
        }

        const redirectSearchParams =
            new URLSearchParams({
                invitation: 'true',
                organisationId: organisationId ?? '',
            })

        const redirectUrl =
            `${applicationBaseUrl}/admin/set-password?${redirectSearchParams.toString()}`

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

        const {
            data: organisationData,
            error: organisationError,
        } = await adminClient
            .from('organisations')
            .select('id, name, status, organisation_type')
            .eq('id', organisationId)
            .maybeSingle()

        if (organisationError) {
            throw organisationError
        }

        const organisation =
            organisationData as
                | OrganisationRow
                | null

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

        const brandingIdentity =
            await loadBrandingIdentity(
                adminClient,
                organisationId,
                organisation.name,
            )

        const customEmailAvailable =
            Boolean(
                resendApiKey &&
                resendFromEmail,
            )

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
                        organisation.organisation_type === 'club'
                            ? 'Only an active Club Admin can manage users for this club.'
                            : 'Only an active Organisation Admin can manage users for this organisation.',
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

            if (
                customEmailAvailable &&
                resendApiKey &&
                resendFromEmail
            ) {
                const {
                    data: recoveryData,
                    error: recoveryError,
                } = await adminClient.auth.admin.generateLink({
                    type: 'recovery',
                    email,
                    options: {
                        redirectTo:
                            redirectUrl,
                        data: {
                            full_name:
                                fullName,
                            organisation_id:
                                organisationId,
                            organisation_name:
                                organisation.name,
                            organisation_type:
                                organisation.organisation_type,
                            role,
                        },
                    },
                })

                if (recoveryError) {
                    throw recoveryError
                }

                const linkData =
                    authLinkData(
                        recoveryData,
                    )

                const actionLink =
                    linkData.properties
                        ?.action_link

                if (!actionLink) {
                    throw new Error(
                        'Supabase did not return a password setup link.',
                    )
                }

                await sendBrandedEmail({
                    apiKey: resendApiKey,
                    fromEmail: resendFromEmail,
                    to: email,
                    recipientName:
                        fullName,
                    senderName:
                        brandingIdentity.senderName,
                    replyToEmail:
                        brandingIdentity.replyToEmail,
                    organisationName:
                        organisation.name,
                    organisationType:
                        organisation.organisation_type,
                    role,
                    actionLink,
                    actionKind:
                        'password_setup',
                })
            } else {
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
            }

            return jsonResponse(
                {
                    success: true,
                    action,
                    userId:
                        existingProfile.id,
                    email,
                    organisationId,
                    brandedEmail:
                        customEmailAvailable,
                },
                200,
            )
        }

        let userId: string
        let existingUser = false

        if (existingProfile) {
            userId =
                existingProfile.id
            existingUser = true

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
        } else if (
            customEmailAvailable &&
            resendApiKey &&
            resendFromEmail
        ) {
            const {
                data: inviteData,
                error: inviteError,
            } = await adminClient.auth.admin.generateLink({
                type: 'invite',
                email,
                options: {
                    redirectTo:
                        redirectUrl,
                    data: {
                        full_name:
                            fullName,
                        organisation_id:
                            organisationId,
                        organisation_name:
                            organisation.name,
                        organisation_type:
                            organisation.organisation_type,
                        role,
                    },
                },
            })

            if (inviteError) {
                throw inviteError
            }

            const linkData =
                authLinkData(
                    inviteData,
                )

            if (!linkData.user) {
                throw new Error(
                    'The invitation was created without a user account.',
                )
            }

            const actionLink =
                linkData.properties
                    ?.action_link

            if (!actionLink) {
                throw new Error(
                    'Supabase did not return an invitation link.',
                )
            }

            await sendBrandedEmail({
                apiKey: resendApiKey,
                fromEmail: resendFromEmail,
                to: email,
                recipientName:
                    fullName,
                senderName:
                    brandingIdentity.senderName,
                replyToEmail:
                    brandingIdentity.replyToEmail,
                organisationName:
                    organisation.name,
                organisationType:
                    organisation.organisation_type,
                role,
                actionLink,
                actionKind: 'invite',
            })

            userId = linkData.user.id

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
                                organisation_id:
                                    organisationId,
                                organisation_name:
                                    organisation.name,
                                organisation_type:
                                    organisation.organisation_type,
                                role,
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
                existingUser,
                brandedEmail:
                    customEmailAvailable,
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
