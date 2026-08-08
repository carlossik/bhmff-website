export type PublicBrandingOrganisation = {
    name: string
    slug: string
    logo_url?: string | null
    primary_colour?: string | null
    background_colour?: string | null
}

export type PublicBrowserBranding = {
    title: string
    description: string
    faviconUrl: string
    appleTouchIconUrl: string
    themeColour: string
    organisationName: string
    shortName: string
}

const TOURNAMENTHQ_TITLE =
    'TournamentHQ | Tournament Management Platform'

const TOURNAMENTHQ_DESCRIPTION =
    'TournamentHQ is a professional SaaS platform for managing clubs, leagues, tournaments, fixtures, officials and competitions.'

const TOURNAMENTHQ_FAVICON =
    '/assets/tournamenthq-shield.png'

const TOURNAMENTHQ_THEME_COLOUR =
    '#0b1220'

let activeManifestObjectUrl: string | null =
    null

function normaliseOptionalText(
    value: string | null | undefined,
): string {
    return value?.trim() ?? ''
}

function createShortName(
    organisationName: string,
): string {
    const trimmedName =
        organisationName.trim()

    if (trimmedName.length <= 24) {
        return trimmedName
    }

    const words =
        trimmedName
            .split(/\s+/)
            .filter(Boolean)

    const initials =
        words
            .map((word) => word[0]?.toUpperCase() ?? '')
            .join('')

    return (
        initials.length >= 2 &&
        initials.length <= 12
            ? initials
            : trimmedName.slice(0, 24)
    )
}

function ensureMetaTag(
    selector: string,
    attributes: Record<string, string>,
): HTMLMetaElement {
    const existing =
        document.head.querySelector<HTMLMetaElement>(
            selector,
        )

    if (existing) {
        return existing
    }

    const element =
        document.createElement('meta')

    Object.entries(attributes).forEach(
        ([key, value]) => {
            element.setAttribute(
                key,
                value,
            )
        },
    )

    document.head.appendChild(element)

    return element
}

function ensureLinkTag(
    selector: string,
    attributes: Record<string, string>,
): HTMLLinkElement {
    const existing =
        document.head.querySelector<HTMLLinkElement>(
            selector,
        )

    if (existing) {
        return existing
    }

    const element =
        document.createElement('link')

    Object.entries(attributes).forEach(
        ([key, value]) => {
            element.setAttribute(
                key,
                value,
            )
        },
    )

    document.head.appendChild(element)

    return element
}

function setMetaContent(
    selector: string,
    attributes: Record<string, string>,
    content: string,
): void {
    const element =
        ensureMetaTag(
            selector,
            attributes,
        )

    element.setAttribute(
        'content',
        content,
    )
}

function setLinkHref(
    selector: string,
    attributes: Record<string, string>,
    href: string,
): void {
    const element =
        ensureLinkTag(
            selector,
            attributes,
        )

    element.setAttribute(
        'href',
        href,
    )
}

function clearActiveManifestObjectUrl(): void {
    if (!activeManifestObjectUrl) {
        return
    }

    URL.revokeObjectURL(
        activeManifestObjectUrl,
    )

    activeManifestObjectUrl = null
}

function applyManifest(
    branding: PublicBrowserBranding,
): void {
    clearActiveManifestObjectUrl()

    const manifest = {
        name: branding.organisationName,
        short_name: branding.shortName,
        description: branding.description,
        start_url: window.location.pathname || '/',
        scope: '/',
        display: 'standalone',
        background_color:
            branding.themeColour,
        theme_color:
            branding.themeColour,
        icons: [
            {
                src:
                    branding.faviconUrl,
                sizes: 'any',
                purpose:
                    'any maskable',
            },
        ],
    }

    const blob =
        new Blob(
            [
                JSON.stringify(
                    manifest,
                ),
            ],
            {
                type:
                    'application/manifest+json',
            },
        )

    activeManifestObjectUrl =
        URL.createObjectURL(
            blob,
        )

    setLinkHref(
        'link[rel="manifest"]',
        {
            rel: 'manifest',
        },
        activeManifestObjectUrl,
    )
}

function applyCommonBranding(
    branding: PublicBrowserBranding,
): void {
    document.title =
        branding.title

    setMetaContent(
        'meta[name="description"]',
        {
            name: 'description',
        },
        branding.description,
    )

    setMetaContent(
        'meta[name="application-name"]',
        {
            name: 'application-name',
        },
        branding.organisationName,
    )

    setMetaContent(
        'meta[name="theme-color"]',
        {
            name: 'theme-color',
        },
        branding.themeColour,
    )

    setLinkHref(
        'link[rel="icon"]',
        {
            rel: 'icon',
        },
        branding.faviconUrl,
    )

    setLinkHref(
        'link[rel="apple-touch-icon"]',
        {
            rel:
                'apple-touch-icon',
        },
        branding.appleTouchIconUrl,
    )

    setMetaContent(
        'meta[property="og:title"]',
        {
            property: 'og:title',
        },
        branding.title,
    )

    setMetaContent(
        'meta[property="og:description"]',
        {
            property:
                'og:description',
        },
        branding.description,
    )

    setMetaContent(
        'meta[property="og:image"]',
        {
            property: 'og:image',
        },
        branding.faviconUrl,
    )

    setMetaContent(
        'meta[property="og:type"]',
        {
            property: 'og:type',
        },
        'website',
    )

    setMetaContent(
        'meta[property="og:url"]',
        {
            property: 'og:url',
        },
        window.location.href,
    )

    setMetaContent(
        'meta[name="twitter:card"]',
        {
            name: 'twitter:card',
        },
        'summary_large_image',
    )

    setMetaContent(
        'meta[name="twitter:title"]',
        {
            name: 'twitter:title',
        },
        branding.title,
    )

    setMetaContent(
        'meta[name="twitter:description"]',
        {
            name:
                'twitter:description',
        },
        branding.description,
    )

    setMetaContent(
        'meta[name="twitter:image"]',
        {
            name: 'twitter:image',
        },
        branding.faviconUrl,
    )

    applyManifest(
        branding,
    )
}

export function createOrganisationBrowserBranding(
    organisation: PublicBrandingOrganisation,
): PublicBrowserBranding {
    const organisationName =
        organisation.name.trim() ||
        'TournamentHQ Competition'

    const logoUrl =
        normaliseOptionalText(
            organisation.logo_url,
        ) ||
        TOURNAMENTHQ_FAVICON

    const themeColour =
        normaliseOptionalText(
            organisation.primary_colour,
        ) ||
        normaliseOptionalText(
            organisation.background_colour,
        ) ||
        TOURNAMENTHQ_THEME_COLOUR

    return {
        title:
            `${organisationName} | Powered by TournamentHQ`,
        description:
            `Official ${organisationName} website powered by TournamentHQ.`,
        faviconUrl:
            logoUrl,
        appleTouchIconUrl:
            logoUrl,
        themeColour,
        organisationName,
        shortName:
            createShortName(
                organisationName,
            ),
    }
}

export function applyOrganisationBrowserBranding(
    organisation: PublicBrandingOrganisation,
): () => void {
    if (
        typeof document ===
            'undefined' ||
        typeof window ===
            'undefined'
    ) {
        return () => undefined
    }

    const branding =
        createOrganisationBrowserBranding(
            organisation,
        )

    applyCommonBranding(
        branding,
    )

    return () => {
        resetTournamentHQBrowserBranding()
    }
}

export function resetTournamentHQBrowserBranding(): void {
    if (
        typeof document ===
            'undefined' ||
        typeof window ===
            'undefined'
    ) {
        return
    }

    clearActiveManifestObjectUrl()

    applyCommonBranding({
        title:
            TOURNAMENTHQ_TITLE,
        description:
            TOURNAMENTHQ_DESCRIPTION,
        faviconUrl:
            TOURNAMENTHQ_FAVICON,
        appleTouchIconUrl:
            TOURNAMENTHQ_FAVICON,
        themeColour:
            TOURNAMENTHQ_THEME_COLOUR,
        organisationName:
            'TournamentHQ',
        shortName:
            'TournamentHQ',
    })
}
