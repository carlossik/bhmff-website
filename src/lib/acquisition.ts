export const ACQUISITION_QUERY_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_id',
    'utm_term',
    'utm_content',
    'gclid',
    'gbraid',
    'wbraid',
    'msclkid',
] as const

export type AcquisitionQueryKey =
    (typeof ACQUISITION_QUERY_KEYS)[number]

export type AcquisitionAttribution = Partial<
    Record<AcquisitionQueryKey, string>
> & {
    referrer_domain?: string
    landing_path?: string
}

const STORAGE_KEY =
    'tournamenthq-saas-acquisition-v1'

const MAX_CAMPAIGN_VALUE_LENGTH = 255
const MAX_CLICK_ID_LENGTH = 512
const MAX_PATH_LENGTH = 512

function normaliseValue(
    value: string | null | undefined,
    maxLength: number,
): string | undefined {
    const normalised = value?.trim()

    if (!normalised) {
        return undefined
    }

    return normalised.slice(0, maxLength)
}

function getQueryValueMaxLength(
    key: AcquisitionQueryKey,
): number {
    return key === 'gclid' ||
        key === 'gbraid' ||
        key === 'wbraid' ||
        key === 'msclkid'
        ? MAX_CLICK_ID_LENGTH
        : MAX_CAMPAIGN_VALUE_LENGTH
}

function readCurrentQueryAttribution(): AcquisitionAttribution {
    if (typeof window === 'undefined') {
        return {}
    }

    const params = new URLSearchParams(
        window.location.search,
    )
    const attribution: AcquisitionAttribution = {}

    for (const key of ACQUISITION_QUERY_KEYS) {
        const value = normaliseValue(
            params.get(key),
            getQueryValueMaxLength(key),
        )

        if (value) {
            attribution[key] = value
        }
    }

    return attribution
}

function hasCampaignAttribution(
    attribution: AcquisitionAttribution,
): boolean {
    return ACQUISITION_QUERY_KEYS.some(
        (key) => Boolean(attribution[key]),
    )
}

function getReferrerDomain(): string | undefined {
    if (
        typeof document === 'undefined' ||
        !document.referrer
    ) {
        return undefined
    }

    try {
        return normaliseValue(
            new URL(document.referrer).hostname.toLowerCase(),
            MAX_CAMPAIGN_VALUE_LENGTH,
        )
    } catch {
        return undefined
    }
}

function readStoredAttribution(): AcquisitionAttribution {
    if (typeof window === 'undefined') {
        return {}
    }

    try {
        const raw = window.localStorage.getItem(
            STORAGE_KEY,
        )

        if (!raw) {
            return {}
        }

        const parsed = JSON.parse(raw) as unknown

        if (
            !parsed ||
            typeof parsed !== 'object' ||
            Array.isArray(parsed)
        ) {
            return {}
        }

        const record = parsed as Record<
            string,
            unknown
        >
        const attribution: AcquisitionAttribution = {}

        for (const key of ACQUISITION_QUERY_KEYS) {
            const rawValue = record[key]

            if (typeof rawValue !== 'string') {
                continue
            }

            const value = normaliseValue(
                rawValue,
                getQueryValueMaxLength(key),
            )

            if (value) {
                attribution[key] = value
            }
        }

        const referrerDomain =
            typeof record.referrer_domain === 'string'
                ? normaliseValue(
                      record.referrer_domain,
                      MAX_CAMPAIGN_VALUE_LENGTH,
                  )
                : undefined
        const landingPath =
            typeof record.landing_path === 'string'
                ? normaliseValue(
                      record.landing_path,
                      MAX_PATH_LENGTH,
                  )
                : undefined

        if (referrerDomain) {
            attribution.referrer_domain =
                referrerDomain
        }

        if (landingPath) {
            attribution.landing_path = landingPath
        }

        return attribution
    } catch {
        return {}
    }
}

export function captureAcquisitionFromLocation(): AcquisitionAttribution {
    if (typeof window === 'undefined') {
        return {}
    }

    const current = readCurrentQueryAttribution()

    if (!hasCampaignAttribution(current)) {
        return readStoredAttribution()
    }

    const attribution: AcquisitionAttribution = {
        ...current,
        landing_path: normaliseValue(
            window.location.pathname,
            MAX_PATH_LENGTH,
        ),
        referrer_domain: getReferrerDomain(),
    }

    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(attribution),
        )
    } catch {
        // Acquisition persistence is non-blocking.
    }

    return attribution
}

export function getCurrentAcquisitionAttribution(): AcquisitionAttribution {
    if (typeof window === 'undefined') {
        return {}
    }

    const current = readCurrentQueryAttribution()

    if (hasCampaignAttribution(current)) {
        return captureAcquisitionFromLocation()
    }

    return readStoredAttribution()
}

export function appendAcquisitionQueryParameters(
    params: URLSearchParams,
    attribution: AcquisitionAttribution,
): void {
    for (const key of ACQUISITION_QUERY_KEYS) {
        const value = attribution[key]

        if (value) {
            params.set(key, value)
        }
    }
}

export function getAcquisitionUserMetadata(
    attribution: AcquisitionAttribution,
): Record<string, string> {
    const metadata: Record<string, string> = {}

    for (const key of ACQUISITION_QUERY_KEYS) {
        const value = attribution[key]

        if (value) {
            metadata[`acquisition_${key}`] = value
        }
    }

    if (attribution.referrer_domain) {
        metadata.acquisition_referrer_domain =
            attribution.referrer_domain
    }

    if (attribution.landing_path) {
        metadata.acquisition_landing_path =
            attribution.landing_path
    }

    return metadata
}
