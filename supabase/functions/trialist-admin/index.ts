import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@^2'

type JsonRecord = Record<string, unknown>
type AdminAction = 'send_invitation' | 'send_report'

type TrialistRow = {
    id: string
    organisation_id: string
    first_name: string
    last_name: string
    guardian_email: string | null
    email: string | null
    trial_date: string | null
    venue_name: string | null
    status: string
    decision: string | null
}

type AssessmentRow = {
    technical: number
    tactical: number
    physical: number
    attitude: number
    coachability: number
    teamwork: number
    strengths: string | null
    development_areas: string | null
    public_feedback: string | null
    recommendation: string
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

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(body: JsonRecord, key: string): string {
    const value = body[key]
    return typeof value === 'string' ? value.trim() : ''
}

function htmlEscape(value: unknown): string {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
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

async function canManageTrialists(
    admin: SupabaseClient,
    userId: string,
    organisationId: string,
): Promise<boolean> {
    const { data, error } = await admin
        .from('organisation_memberships')
        .select('role,active')
        .eq('organisation_id', organisationId)
        .eq('user_id', userId)
        .eq('active', true)
        .maybeSingle()

    if (error || !data) return false

    return ['super_admin', 'competition_manager'].includes(
        String(data.role),
    )
}

function trialDateText(value: string | null): string {
    if (!value) return 'To be confirmed'

    return new Date(value).toLocaleString('en-GB', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Europe/London',
    })
}

async function sendResendEmail(input: {
    apiKey: string
    from: string
    to: string
    subject: string
    html: string
}): Promise<string | null> {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${input.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: input.from,
            to: [input.to],
            subject: input.subject,
            html: input.html,
        }),
    })

    const payload: unknown = await response.json().catch(() => null)

    if (!response.ok) {
        throw new Error('The email could not be sent by Resend.')
    }

    return isRecord(payload) && typeof payload.id === 'string'
        ? payload.id
        : null
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim() ?? ''
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim() ?? ''
        const serviceRoleKey =
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() ?? ''
        const resendApiKey = Deno.env.get('RESEND_API_KEY')?.trim() ?? ''
        const resendFrom =
            Deno.env.get('RESEND_FROM_EMAIL')?.trim() ??
            'TournamentHQ <noreply@tournamenthq.co.uk>'

        if (
            !supabaseUrl ||
            !anonKey ||
            !serviceRoleKey ||
            !resendApiKey
        ) {
            throw new Error(
                'Trial Centre server configuration is incomplete.',
            )
        }

        const authHeader = request.headers.get('authorization') ?? ''
        const userClient = createClient(supabaseUrl, anonKey, {
            global: {
                headers: {
                    Authorization: authHeader,
                },
            },
        })

        const { data: userData, error: userError } =
            await userClient.auth.getUser()

        if (userError || !userData.user) {
            return jsonResponse(
                { error: 'Authentication required.' },
                401,
            )
        }

        const bodyValue: unknown = await request.json()

        if (!isRecord(bodyValue)) {
            return jsonResponse({ error: 'Invalid request.' }, 400)
        }

        const action = readString(bodyValue, 'action') as AdminAction
        const organisationId = readString(bodyValue, 'organisationId')
        const trialistId = readString(bodyValue, 'trialistId')

        if (
            !['send_invitation', 'send_report'].includes(action) ||
            !organisationId ||
            !trialistId
        ) {
            return jsonResponse(
                {
                    error:
                        'action, organisationId and trialistId are required.',
                },
                400,
            )
        }

        const admin = createClient(supabaseUrl, serviceRoleKey)

        if (
            !(await canManageTrialists(
                admin,
                userData.user.id,
                organisationId,
            ))
        ) {
            return jsonResponse(
                {
                    error:
                        'Organisation administrator access is required.',
                },
                403,
            )
        }

        const { data: trialistData, error: trialistError } = await admin
            .from('club_trialists')
            .select(
                'id,organisation_id,first_name,last_name,guardian_email,email,trial_date,venue_name,status,decision',
            )
            .eq('id', trialistId)
            .eq('organisation_id', organisationId)
            .maybeSingle()

        if (trialistError) throw new Error(trialistError.message)
        if (!trialistData) {
            return jsonResponse({ error: 'Trialist not found.' }, 404)
        }

        const trialist = trialistData as TrialistRow
        const recipientEmail =
            trialist.guardian_email?.trim() || trialist.email?.trim() || ''

        if (!recipientEmail) {
            return jsonResponse(
                {
                    error:
                        'Add a player or parent/guardian email address first.',
                },
                409,
            )
        }

        if (action === 'send_report') {
            const { data: assessmentData, error: assessmentError } =
                await admin
                    .from('club_trial_assessments')
                    .select(
                        'technical,tactical,physical,attitude,coachability,teamwork,strengths,development_areas,public_feedback,recommendation',
                    )
                    .eq('trialist_id', trialist.id)
                    .maybeSingle()

            if (assessmentError) {
                throw new Error(assessmentError.message)
            }

            if (!assessmentData) {
                return jsonResponse(
                    {
                        error:
                            'Complete and save the trial assessment before sending a report.',
                    },
                    409,
                )
            }

            const assessment = assessmentData as AssessmentRow
            const scores = [
                ['Technical', assessment.technical],
                ['Tactical', assessment.tactical],
                ['Physical', assessment.physical],
                ['Attitude', assessment.attitude],
                ['Coachability', assessment.coachability],
                ['Teamwork', assessment.teamwork],
            ]
                .map(
                    ([label, score]) =>
                        `<tr><td style="padding:6px 12px">${label}</td><td style="padding:6px 12px"><strong>${score}/5</strong></td></tr>`,
                )
                .join('')

            const html = `
                <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#17251d">
                    <h1 style="color:#163a25">TournamentHQ Trial Report</h1>
                    <h2>${htmlEscape(trialist.first_name)} ${htmlEscape(trialist.last_name)}</h2>
                    <table style="border-collapse:collapse">${scores}</table>
                    <h3>Strengths</h3>
                    <p>${htmlEscape(assessment.strengths || 'No public strengths summary supplied.')}</p>
                    <h3>Development areas</h3>
                    <p>${htmlEscape(assessment.development_areas || 'No public development summary supplied.')}</p>
                    <h3>Coach feedback</h3>
                    <p>${htmlEscape(assessment.public_feedback || 'No additional public feedback supplied.')}</p>
                    <h3>Outcome</h3>
                    <p><strong>${htmlEscape(assessment.recommendation.replaceAll('_', ' '))}</strong></p>
                    <p style="margin-top:28px;color:#66736b;font-size:12px">Private coach notes are never included in this report.</p>
                </div>
            `

            await sendResendEmail({
                apiKey: resendApiKey,
                from: resendFrom,
                to: recipientEmail,
                subject: `Trial report – ${trialist.first_name} ${trialist.last_name}`,
                html,
            })

            return jsonResponse({ ok: true, action })
        }

        const rawToken = randomToken()
        const tokenHash = await sha256Hex(rawToken)

        const { data: invitation, error: invitationError } = await admin
            .from('club_trial_invitations')
            .insert({
                organisation_id: organisationId,
                trialist_id: trialistId,
                token_hash: tokenHash,
                recipient_email: recipientEmail,
            })
            .select('id')
            .single()

        if (invitationError || !invitation) {
            throw new Error(
                invitationError?.message ??
                    'Unable to create the trial invitation.',
            )
        }

        const responseUrl =
            `${supabaseUrl}/functions/v1/trialist-response?token=` +
            encodeURIComponent(rawToken)

        const html = `
            <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#17251d">
                <h1 style="color:#163a25">TournamentHQ Trial Invitation</h1>
                <p><strong>${htmlEscape(trialist.first_name)} ${htmlEscape(trialist.last_name)}</strong> has been invited to attend a football trial.</p>
                <p><strong>Date:</strong> ${htmlEscape(trialDateText(trialist.trial_date))}<br>
                <strong>Venue:</strong> ${htmlEscape(trialist.venue_name || 'To be confirmed')}</p>
                <p>
                    <a href="${responseUrl}" style="display:inline-block;background:#8cf566;color:#071009;padding:14px 20px;border-radius:10px;font-weight:700;text-decoration:none">
                        Respond to trial invitation
                    </a>
                </p>
            </div>
        `

        const providerMessageId = await sendResendEmail({
            apiKey: resendApiKey,
            from: resendFrom,
            to: recipientEmail,
            subject: `Trial invitation – ${trialist.first_name} ${trialist.last_name}`,
            html,
        })

        await admin
            .from('club_trial_invitations')
            .update({
                delivery_status: 'sent',
                provider_message_id: providerMessageId,
                sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', invitation.id)

        await admin
            .from('club_trialists')
            .update({
                status: 'invited',
                updated_at: new Date().toISOString(),
            })
            .eq('id', trialistId)

        return jsonResponse({ ok: true, action })
    } catch (error) {
        return jsonResponse(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unable to process Trial Centre request.',
            },
            500,
        )
    }
})
