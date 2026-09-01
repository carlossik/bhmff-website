import {
    GA4_MEASUREMENT_ID,
    SAAS_ANALYTICS_CONFIGURED,
} from '../config/analytics'
import {
    captureAcquisitionFromLocation,
    getCurrentAcquisitionAttribution,
} from './acquisition'

export type SaasAnalyticsParameters = Record<
    string,
    string | number | boolean | null | undefined
>

declare global {
    interface Window {
        dataLayer?: unknown[]
    }
}

const CONSENT_COOKIE_NAME =
    'thq_analytics_consent'
const MILESTONE_STORAGE_PREFIX =
    'tournamenthq-saas-analytics-milestone-v1'

function ensureDataLayer(): unknown[] {
    window.dataLayer = window.dataLayer ?? []
    return window.dataLayer
}

function pushGtagArguments(
    ...args: unknown[]
): void {
    Reflect.apply(
        function (): void {
            // Google gtag.js expects an Arguments object in dataLayer.
            // eslint-disable-next-line prefer-rest-params
            ensureDataLayer().push(arguments)
        },
        null,
        args,
    )
}

function gtagCommand(
    command: string,
    ...args: unknown[]
): void {
    pushGtagArguments(command, ...args)
}

export type SaasAnalyticsConsentValue =
    | 'granted'
    | 'denied'

export function getSaasAnalyticsConsent():
    | SaasAnalyticsConsentValue
    | null {
    if (typeof document === 'undefined') {
        return null
    }

    const match = document.cookie
        .split(';')
        .map((item) => item.trim())
        .find((item) =>
            item.startsWith(
                `${CONSENT_COOKIE_NAME}=`,
            ),
        )

    if (!match) {
        return null
    }

    const value = match.split('=')[1]?.trim()

    if (
        value === 'granted' ||
        value === 'denied'
    ) {
        return value
    }

    return null
}

function applyConsent(): void {
    const consent = getSaasAnalyticsConsent()

    gtagCommand('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage:
            consent === 'granted'
                ? 'granted'
                : 'denied',
        functionality_storage: 'granted',
        security_storage: 'granted',
        wait_for_update: 500,
    })
}

function loadGa4(): void {
    if (
        !GA4_MEASUREMENT_ID ||
        document.getElementById(
            'thq-saas-ga4-script',
        )
    ) {
        return
    }

    const script = document.createElement('script')
    script.id = 'thq-saas-ga4-script'
    script.async = true
    script.src =
        `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
            GA4_MEASUREMENT_ID,
        )}`

    document.head.appendChild(script)

    gtagCommand('js', new Date())
    gtagCommand(
        'config',
        GA4_MEASUREMENT_ID,
        {
            cookie_domain: 'auto',
            send_page_view: true,
        },
    )
}

export function initialiseSaasAnalytics(): void {
    if (typeof window === 'undefined') {
        return
    }

    captureAcquisitionFromLocation()

    if (!SAAS_ANALYTICS_CONFIGURED) {
        return
    }

    ensureDataLayer()
    applyConsent()

    if (getSaasAnalyticsConsent() === 'granted') {
        loadGa4()
    }
}


function getConsentCookieDomain(): string | null {
    if (typeof window === 'undefined') {
        return null
    }

    const hostname =
        window.location.hostname
            .trim()
            .toLowerCase()

    if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.localhost')
    ) {
        return null
    }

    if (
        hostname === 'tournamenthq.co.uk' ||
        hostname === 'app.tournamenthq.co.uk' ||
        hostname.endsWith('.tournamenthq.co.uk')
    ) {
        return '.tournamenthq.co.uk'
    }

    return null
}

function writeConsentCookie(
    consent: SaasAnalyticsConsentValue,
): void {
    if (typeof document === 'undefined') {
        return
    }

    const cookieParts = [
        `${CONSENT_COOKIE_NAME}=${consent}`,
        'Path=/',
        'Max-Age=31536000',
        'SameSite=Lax',
    ]

    const domain = getConsentCookieDomain()

    if (domain) {
        cookieParts.push(`Domain=${domain}`)
    }

    if (
        typeof window !== 'undefined' &&
        window.location.protocol === 'https:'
    ) {
        cookieParts.push('Secure')
    }

    document.cookie = cookieParts.join('; ')
}

function consentCommandValue(
    consent: SaasAnalyticsConsentValue,
) {
    return {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: consent,
        functionality_storage: 'granted',
        security_storage: 'granted',
    }
}

export function setSaasAnalyticsConsent(
    consent: SaasAnalyticsConsentValue,
): void {
    if (typeof window === 'undefined') {
        return
    }

    writeConsentCookie(consent)
    ensureDataLayer()

    gtagCommand(
        'consent',
        'update',
        consentCommandValue(consent),
    )

    if (consent === 'granted') {
        loadGa4()
    }
}

function buildEventParameters(
    parameters: SaasAnalyticsParameters,
): SaasAnalyticsParameters {
    return {
        ...getCurrentAcquisitionAttribution(),
        page_path: window.location.pathname,
        ...parameters,
    }
}

export function trackSaasAnalyticsEvent(
    eventName: string,
    parameters: SaasAnalyticsParameters = {},
): void {
    if (
        !SAAS_ANALYTICS_CONFIGURED ||
        getSaasAnalyticsConsent() !== 'granted'
    ) {
        return
    }

    loadGa4()
    gtagCommand(
        'event',
        eventName,
        buildEventParameters(parameters),
    )
}

export function trackSaasAnalyticsMilestone(
    milestoneKey: string,
    eventName: string,
    parameters: SaasAnalyticsParameters = {},
): void {
    if (typeof window === 'undefined') {
        return
    }

    const storageKey =
        `${MILESTONE_STORAGE_PREFIX}:${milestoneKey}`

    try {
        if (
            window.localStorage.getItem(
                storageKey,
            ) === '1'
        ) {
            return
        }

        trackSaasAnalyticsEvent(
            eventName,
            parameters,
        )

        if (
            SAAS_ANALYTICS_CONFIGURED &&
            getSaasAnalyticsConsent() === 'granted'
        ) {
            window.localStorage.setItem(
                storageKey,
                '1',
            )
        }
    } catch {
        trackSaasAnalyticsEvent(
            eventName,
            parameters,
        )
    }
}
