import { communicationsService } from './communicationsService'

export type WhatsAppConnectionStatus = {
    setupAvailable: boolean
    connected: boolean
    ready: boolean
    canManage: boolean
    sender: { displayPhoneNumber: string; verifiedName: string; onboardingMode: 'business_app' | 'platform'; tokenExpiresAt: string | null } | null
}
export type WhatsAppTemplate = {
    name: string
    language: string
    category: string
    components: { type: string; format?: string; text?: string }[]
}
type Signup = { sessionId: string; appId: string; configId: string; graphVersion: string }
type FacebookSdk = {
    init: (options: Record<string, unknown>) => void
    login: (callback: (response: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>) => void
}
export type PreparedWhatsAppSignup = { signup: Signup; sdk: FacebookSdk; onboardingMode: 'business_app' | 'platform'; preparedAt: number }
let sdkPromise: Promise<FacebookSdk> | null = null
function loadSdk(): Promise<FacebookSdk> {
    const sdk = (window as unknown as { FB?: FacebookSdk }).FB
    if (sdk) return Promise.resolve(sdk)
    if (sdkPromise) return sdkPromise
    sdkPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://connect.facebook.net/en_US/sdk.js'
        script.async = true
        const timeout = window.setTimeout(() => { script.remove(); sdkPromise = null; reject(new Error('Meta connection could not load. Please try again.')) }, 20000)
        script.onload = () => {
            window.clearTimeout(timeout)
            const loaded = (window as unknown as { FB?: FacebookSdk }).FB
            if (loaded) resolve(loaded)
            else { sdkPromise = null; reject(new Error('Meta connection could not load.')) }
        }
        script.onerror = () => { window.clearTimeout(timeout); script.remove(); sdkPromise = null; reject(new Error('Meta connection could not load.')) }
        document.head.appendChild(script)
    })
    return sdkPromise
}

export const whatsAppConnectionService = {
    status: (organisationId: string) => communicationsService.whatsAppAction<WhatsAppConnectionStatus>(organisationId, 'whatsapp_status'),
    templates: async (organisationId: string): Promise<WhatsAppTemplate[]> => {
        const result = await communicationsService.whatsAppAction<{ templates: WhatsAppTemplate[] }>(organisationId, 'whatsapp_templates')
        return result.templates
    },
    disconnect: (organisationId: string) => communicationsService.whatsAppAction(organisationId, 'whatsapp_disconnect'),
    async prepare(organisationId: string, onboardingMode: 'business_app' | 'platform'): Promise<PreparedWhatsAppSignup> {
        const signup = await communicationsService.whatsAppAction<Signup>(organisationId, 'whatsapp_begin', { onboardingMode })
        const sdk = await loadSdk()
        sdk.init({ appId: signup.appId, version: signup.graphVersion, autoLogAppEvents: false, xfbml: false })
        return { signup, sdk, onboardingMode, preparedAt: Date.now() }
    },
    // Called synchronously from the click so browsers permit the Meta popup.
    connect(organisationId: string, prepared: PreparedWhatsAppSignup) {
        let cancelled = false
        let cleanup = () => {}
        const promise = new Promise<void>((resolve, reject) => {
            let code: string | undefined
            let ids: { wabaId: string; phoneNumberId: string } | undefined
            let completing = false
            const timeout = window.setTimeout(() => fail('The Meta connection timed out. Please start again.'), 5 * 60 * 1000)
            cleanup = () => { window.clearTimeout(timeout); window.removeEventListener('message', onMessage) }
            const fail = (message: string) => { cleanup(); reject(new Error(message)) }
            const complete = () => {
                if (cancelled || completing || !code || !ids) return
                completing = true
                cleanup()
                void communicationsService.whatsAppAction(organisationId, 'whatsapp_connect', {
                    ...ids, code, sessionId: prepared.signup.sessionId,
                }).then(() => resolve(), reject)
            }
            const onMessage = (event: MessageEvent) => {
                if (!['https://www.facebook.com', 'https://web.facebook.com', 'https://business.facebook.com'].includes(event.origin)) return
                let data: any
                try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data } catch { return }
                if (data?.type !== 'WA_EMBEDDED_SIGNUP') return
                if (['FINISH', 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'].includes(data.event)) {
                    if (typeof data.data?.waba_id !== 'string' || typeof data.data?.phone_number_id !== 'string') return
                    ids = { wabaId: data.data.waba_id, phoneNumberId: data.data.phone_number_id }
                    complete()
                } else if (['CANCEL', 'ERROR'].includes(data.event)) fail('Meta connection was cancelled or could not be completed. Your existing connection has been retained.')
            }
            if (Date.now() - prepared.preparedAt > 9 * 60 * 1000) { fail('Refresh the connection options and try again.'); return }
            window.addEventListener('message', onMessage)
            try {
                prepared.sdk.login((response) => {
                    if (cancelled) return
                    code = response.authResponse?.code
                    if (!code) { fail('Meta connection was not authorised.'); return }
                    complete()
                }, {
                    config_id: prepared.signup.configId, response_type: 'code', override_default_response_type: true,
                    extras: { setup: {}, sessionInfoVersion: '3',
                        ...(prepared.onboardingMode === 'business_app' ? { featureType: 'whatsapp_business_app_onboarding' } : {}) },
                })
            } catch { fail('Unable to open Meta. Please allow the connection popup and try again.') }
        })
        return { promise, cancel: () => { cancelled = true; cleanup() } }
    },
}

export function whatsAppTemplateFields(template: WhatsAppTemplate): string[] {
    return template.components.flatMap((component) => [...new Set(
        [...(component.text ?? '').matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((match) => `${component.type.toLowerCase()}:${match[1]}`),
    )])
}
export function previewWhatsAppTemplate(template: WhatsAppTemplate, parameters: Record<string, string>): string {
    return template.components.map((component) => (component.text ?? '').replace(
        /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, name: string) => parameters[`${component.type.toLowerCase()}:${name}`] || match,
    )).join('\n\n')
}
