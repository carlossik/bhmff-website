import { channelDryRunEnabled } from './communicationsProviders.ts'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2'

export type WhatsAppConnection = {
    organisation_id: string
    waba_id: string
    phone_number_id: string
    display_phone_number: string
    verified_name: string
    token_ciphertext: string
    token_expires_at: string | null
    onboarding_mode: 'business_app' | 'platform'
}
export type WhatsAppTemplate = {
    name: string
    language: string
    category: string
    components: { type: string; format?: string; text?: string }[]
}
export type WhatsAppSelection = {
    name: string
    language: string
    parameters: Record<string, string>
}

export function metaEnvironment(name: string): string {
    const value = Deno.env.get(name)?.trim()
    if (!value) throw new Error(`WhatsApp connection setup is incomplete (${name}).`)
    return value
}

export function metaVersion(): string {
    const version = metaEnvironment('THQ_META_GRAPH_VERSION')
    if (!/^v\d+\.\d+$/.test(version)) throw new Error('Invalid Meta Graph API version.')
    return version
}

export function metaMessagingConfigured(): boolean {
    return ['THQ_META_APP_ID', 'THQ_META_APP_SECRET', 'THQ_META_GRAPH_VERSION',
        'THQ_WHATSAPP_ENCRYPTION_KEY', 'THQ_META_WEBHOOK_VERIFY_TOKEN']
        .every((key) => Boolean(Deno.env.get(key)?.trim()))
}

export function metaConfigured(): boolean {
    return ['THQ_META_APP_ID', 'THQ_META_APP_SECRET', 'THQ_META_SIGNUP_CONFIG_ID',
        'THQ_META_GRAPH_VERSION', 'THQ_WHATSAPP_ENCRYPTION_KEY',
        'THQ_META_WEBHOOK_VERIFY_TOKEN'].every((key) => Boolean(Deno.env.get(key)?.trim()))
}

// Tokens never enter browser responses, logs, or plaintext database columns.
async function tokenKey(): Promise<CryptoKey> {
    let bytes: Uint8Array<ArrayBuffer>
    try { bytes = Uint8Array.from(atob(metaEnvironment('THQ_WHATSAPP_ENCRYPTION_KEY')), (c) => c.charCodeAt(0)) }
    catch { throw new Error('WhatsApp encryption key must be base64 encoded.') }
    if (bytes.length !== 32) throw new Error('WhatsApp encryption key must contain 32 random bytes.')
    return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}
function base64(bytes: Uint8Array): string {
    return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
}
export async function encryptToken(token: string, organisationId: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv,
        additionalData: new TextEncoder().encode(organisationId) }, await tokenKey(), new TextEncoder().encode(token))
    return `${base64(iv)}.${base64(new Uint8Array(encrypted))}`
}
export async function decryptToken(connection: WhatsAppConnection): Promise<string> {
    const [iv, ciphertext] = connection.token_ciphertext.split('.')
    const bytes = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(iv),
        additionalData: new TextEncoder().encode(connection.organisation_id) }, await tokenKey(), bytes(ciphertext))
    return new TextDecoder().decode(decrypted)
}

export async function metaRequest(path: string, token: string, method = 'GET', body?: unknown): Promise<any> {
    const version = metaVersion()
    let response: Response
    let data: any
    try {
        response = await fetch(`https://graph.facebook.com/${version}/${path}`, {
            method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
        })
        data = await response.json()
    } catch {
        // Native transport errors can include URLs carrying debug-token credentials.
        throw new Error('Meta could not be reached or returned an invalid response. Check connection status and message history before retrying.')
    }
    if (!response.ok || data.error) {
        // Provider messages can contain sensitive request data. Expose only the error code.
        throw new Error(`Meta rejected the request (code ${data.error?.code ?? response.status}). Check the account permissions, registration and template status.`)
    }
    return data
}

export async function loadWhatsAppConnection(admin: SupabaseClient, organisationId: string): Promise<WhatsAppConnection | null> {
    const { data, error } = await admin.from('organisation_whatsapp_connections')
        .select('*').eq('organisation_id', organisationId).maybeSingle()
    // Preserve existing email/SMS deployments before the new migration is applied.
    if (error && ['42P01', 'PGRST205'].includes(error.code)) return null
    if (error) throw new Error('Unable to read the club WhatsApp connection.')
    return data as WhatsAppConnection | null
}
export function whatsAppReadinessDetail(connection: WhatsAppConnection | null): string {
    if (!connection) return 'No WhatsApp sender is saved for this club. Configure the club sender first.'
    const missing = ['THQ_META_APP_ID', 'THQ_META_APP_SECRET', 'THQ_META_GRAPH_VERSION', 'THQ_WHATSAPP_ENCRYPTION_KEY', 'THQ_META_WEBHOOK_VERIFY_TOKEN'].filter(key => !Deno.env.get(key)?.trim())
    if (missing.length) return `WhatsApp backend configuration is incomplete: ${missing.join(', ')}. Update the Supabase function secrets.`
    if (connection.token_expires_at && !(new Date(connection.token_expires_at).getTime() > Date.now())) return 'The saved WhatsApp access token has expired or has an invalid expiry. Renew it and rerun the sender configuration script.'
    return `Direct messages from ${connection.verified_name} (${connection.display_phone_number}).`
}

export function connectionReady(connection: WhatsAppConnection | null): boolean {
    return Boolean(connection && metaMessagingConfigured() && (!connection.token_expires_at ||
        new Date(connection.token_expires_at).getTime() > Date.now()))
}

export async function connectWhatsApp(admin: SupabaseClient, organisationId: string, userId: string,
    input: { code: string; wabaId: string; phoneNumberId: string; sessionId: string }): Promise<void> {
    if (!/^\d+$/.test(input.wabaId) || !/^\d+$/.test(input.phoneNumberId) || input.code.length > 4096) {
        throw new Error('Invalid WhatsApp connection response.')
    }
    const { data: session, error: sessionError } = await admin.from('whatsapp_onboarding_sessions')
        .delete().eq('id', input.sessionId).eq('organisation_id', organisationId).eq('user_id', userId)
        .gt('expires_at', new Date().toISOString()).select('onboarding_mode').maybeSingle()
    if (sessionError || !session) throw new Error('WhatsApp connection session expired. Start the connection again.')

    const appId = metaEnvironment('THQ_META_APP_ID')
    const appSecret = metaEnvironment('THQ_META_APP_SECRET')
    const exchanged = await metaRequest('oauth/access_token', `${appId}|${appSecret}`, 'POST', {
        client_id: appId, client_secret: appSecret, code: input.code,
    })
    if (typeof exchanged.access_token !== 'string') throw new Error('Meta did not return an account token.')
    const token = exchanged.access_token
    await provisionWhatsAppConnection(admin, organisationId, userId, {
        token, wabaId: input.wabaId, phoneNumberId: input.phoneNumberId, onboardingMode: session.onboarding_mode,
    })
}

// Server/operator use only: validates an owned-account token exactly as signup does.
// Never expose this as a browser action or accept service-role credentials in the UI.
export async function provisionWhatsAppConnection(admin: SupabaseClient, organisationId: string, userId: string,
    input: { token: string; wabaId: string; phoneNumberId: string; onboardingMode: 'business_app' | 'platform' }): Promise<void> {
    if (!/^\d+$/.test(input.wabaId) || !/^\d+$/.test(input.phoneNumberId) || !input.token.trim()) throw new Error('Invalid WhatsApp sender configuration.')
    const appId = metaEnvironment('THQ_META_APP_ID')
    const appSecret = metaEnvironment('THQ_META_APP_SECRET')
    const token = input.token
    const debug = await metaRequest(`debug_token?input_token=${encodeURIComponent(token)}`, `${appId}|${appSecret}`)
    const details = debug.data
    if (!details?.is_valid || String(details.app_id) !== appId ||
        !['whatsapp_business_management', 'whatsapp_business_messaging'].every((scope) => details.scopes?.includes(scope))) {
        throw new Error('Meta did not authorise the required WhatsApp permissions for TournamentHQ.')
    }
    const expires = [details.expires_at, details.data_access_expires_at].filter((value) => typeof value === 'number' && value > 0)
    if (expires.some((value: number) => value * 1000 <= Date.now())) throw new Error('The WhatsApp token has expired. Generate a new token.');
    const scopedAccounts = (details.granular_scopes ?? []).filter((item: any) =>
        item.scope === 'whatsapp_business_management').flatMap((item: any) => item.target_ids ?? [])
    if (scopedAccounts.length && !scopedAccounts.includes(input.wabaId)) {
        throw new Error('This WhatsApp account was not authorised in the connection flow.')
    }
    const numbers = await metaRequest(`${input.wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,platform_type&limit=100`, token)
    const number = numbers.data?.find((item: any) => String(item.id) === input.phoneNumberId)
    if (!number || number.platform_type !== 'CLOUD_API') {
        throw new Error('Select a registered WhatsApp Cloud API number. Provider-hosted numbers may require migration by their account owner.')
    }
    const { data: existing, error: existingError } = await admin.from('organisation_whatsapp_connections')
        .select('organisation_id').eq('phone_number_id', input.phoneNumberId).maybeSingle()
    if (existingError) throw new Error('Unable to verify the sender assignment.')
    if (existing && existing.organisation_id !== organisationId) throw new Error('This WhatsApp number is already connected to another club.')
    const ciphertext = await encryptToken(token, organisationId)
    const subscription = await metaRequest(`${input.wabaId}/subscribed_apps`, token, 'POST', {})
    if (subscription.success !== true) throw new Error('Meta did not confirm delivery tracking for this WhatsApp account.')

    const { error } = await admin.from('organisation_whatsapp_connections').upsert({
        organisation_id: organisationId, waba_id: input.wabaId, phone_number_id: input.phoneNumberId,
        display_phone_number: number.display_phone_number, verified_name: number.verified_name ?? '',
        token_ciphertext: ciphertext,
        token_expires_at: expires.length ? new Date(Math.min(...expires) * 1000).toISOString() : null,
        onboarding_mode: input.onboardingMode, connected_by: userId, updated_at: new Date().toISOString(),
    }, { onConflict: 'organisation_id' })
    if (error) throw new Error('Unable to save this WhatsApp connection. A sender can belong to only one club.')
}

export async function listWhatsAppTemplates(connection: WhatsAppConnection): Promise<WhatsAppTemplate[]> {
    const token = await decryptToken(connection)
    const templates: WhatsAppTemplate[] = []
    let cursor: string | undefined
    for (let page = 0; page < 20; page += 1) {
        const data = await metaRequest(`${connection.waba_id}/message_templates?fields=name,language,status,category,components,parameter_format&limit=100${cursor ? `&after=${encodeURIComponent(cursor)}` : ''}`, token)
        for (const item of data.data ?? []) {
            // Service-only communications: no marketing/authentication or media/button templates.
            if (item.status !== 'APPROVED' || item.category !== 'UTILITY' || !Array.isArray(item.components)) continue
            if (item.components.some((c: any) => !['HEADER', 'BODY', 'FOOTER'].includes(c.type) || (c.type === 'HEADER' && c.format !== 'TEXT'))) continue
            templates.push({ name: item.name, language: item.language, category: item.category,
                components: item.components.map((c: any) => ({ type: c.type, format: c.format, text: c.text ?? '' })) })
        }
        cursor = data.paging?.next ? data.paging?.cursors?.after : undefined
        if (!cursor) break
        if (page === 19) throw new Error('Too many templates to load. Reduce the active template list before sending.')
    }
    return templates
}

export function templateFields(template: WhatsAppTemplate): { key: string; label: string }[] {
    return template.components.flatMap((component) => Array.from(new Set(
        [...(component.text ?? '').matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((match) => match[1]),
    )).map((name) => ({ key: `${component.type.toLowerCase()}:${name}`, label: `${component.type.toLowerCase()} ${name}` })))
}

export function buildWhatsAppTemplate(template: WhatsAppTemplate, parameters: Record<string, string>) {
    const fields = templateFields(template)
    for (const field of fields) {
        if (typeof parameters[field.key] !== 'string' || !parameters[field.key].trim() || parameters[field.key].length > 1024 || /[\r\n\t]/.test(parameters[field.key])) {
            throw new Error(`Enter a single-line value for ${field.label} (maximum 1024 characters).`)
        }
    }
    return {
        name: template.name, language: { code: template.language },
        components: template.components.flatMap((component) => {
            const componentFields = fields.filter((field) => field.key.startsWith(`${component.type.toLowerCase()}:`))
            if (!componentFields.length) return []
            const numbered = componentFields.every((field) => /^\d+$/.test(field.key.split(':')[1]))
            if (numbered) componentFields.sort((a, b) => Number(a.key.split(':')[1]) - Number(b.key.split(':')[1]))
            return [{ type: component.type.toLowerCase(), parameters: componentFields.map((field) => ({
                type: 'text', text: parameters[field.key].trim(),
                ...(numbered ? {} : { parameter_name: field.key.split(':')[1] }),
            })) }]
        }),
    }
}
export function renderWhatsAppTemplate(template: WhatsAppTemplate, parameters: Record<string, string>): string {
    return template.components.map((component) => (component.text ?? '').replace(
        /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name: string) => parameters[`${component.type.toLowerCase()}:${name}`]?.trim() ?? '',
    )).join('\n\n')
}

export async function sendClubWhatsApp(connection: WhatsAppConnection, phone: string, template: WhatsAppTemplate,
    parameters: Record<string, string>, deliveryId: string) {
    if (!connectionReady(connection)) throw new Error('Reconnect the club WhatsApp account before sending.')
    const payload = { messaging_product: 'whatsapp', to: phone.replace(/^\+/, ''), type: 'template',
        template: buildWhatsAppTemplate(template, parameters), biz_opaque_callback_data: deliveryId }
    if (channelDryRunEnabled('whatsapp')) {
        return { provider: 'meta' as const, status: 'accepted' as const, providerMessageId: `dry-run-${crypto.randomUUID()}`, providerRequestId: null }
    }
    const result = await metaRequest(`${connection.phone_number_id}/messages`, await decryptToken(connection), 'POST', payload)
    const messageId = result.messages?.[0]?.id
    if (typeof messageId !== 'string') throw new Error('Meta did not return a message receipt.')
    return { provider: 'meta' as const, status: 'accepted' as const, providerMessageId: messageId, providerRequestId: null }
}
