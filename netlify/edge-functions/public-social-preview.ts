import type {
    Config,
    Context,
} from '@netlify/edge-functions'

type PublicOrganisation = {
    name: string
    slug: string
    logo_url: string | null
    primary_colour: string | null
    background_colour: string | null
    organisation_type: string | null
}

type NetlifyEnvironment = {
    env?: {
        get?: (
            name: string,
        ) => string | undefined
    }
}

const RESERVED_PUBLIC_PATHS =
    new Set([
        'admin',
        'api',
        'assets',
        'auth',
        'favicon.ico',
        'login',
        'logout',
        'onboarding',
        'request-demo',
        'robots.txt',
        'set-password',
        'signup',
        'site.webmanifest',
        'sitemap.xml',
    ])

const APP_HOSTS =
    new Set([
        'app.tournamenthq.co.uk',
    ])

const MARKETING_HOSTS =
    new Set([
        'tournamenthq.co.uk',
        'www.tournamenthq.co.uk',
    ])

function getEnvironmentVariable(
    name: string,
): string {
    const runtime =
        globalThis as typeof globalThis & {
            Netlify?: NetlifyEnvironment
        }

    return runtime.Netlify
        ?.env
        ?.get?.(name)
        ?.trim() ?? ''
}

function getSupabaseCredentials(): {
    url: string
    anonKey: string
} | null {
    const url =
        getEnvironmentVariable(
            'THQ_SUPABASE_URL',
        ) ||
        getEnvironmentVariable(
            'VITE_SUPABASE_URL',
        )

    const anonKey =
        getEnvironmentVariable(
            'THQ_SUPABASE_ANON_KEY',
        ) ||
        getEnvironmentVariable(
            'VITE_SUPABASE_ANON_KEY',
        )

    if (!url || !anonKey) {
        return null
    }

    return {
        url: url.replace(/\/+$/, ''),
        anonKey,
    }
}

function decodePathSegment(
    value: string,
): string {
    try {
        return decodeURIComponent(value)
    } catch {
        return value
    }
}

function getAppOrganisationRoute(
    pathname: string,
): {
    slug: string
    canonicalPath: string
} | null {
    const legacyMatch =
        pathname.match(
            /^\/o\/([^/]+)(\/.*)?$/,
        )

    if (legacyMatch) {
        const slug =
            decodePathSegment(
                legacyMatch[1],
            )
                .trim()
                .toLowerCase()

        if (!slug) {
            return null
        }

        return {
            slug,
            canonicalPath:
                `/${encodeURIComponent(slug)}${legacyMatch[2] ?? ''}`,
        }
    }

    const cleanMatch =
        pathname.match(
            /^\/([^/]+)(\/.*)?$/,
        )

    if (!cleanMatch) {
        return null
    }

    const slug =
        decodePathSegment(
            cleanMatch[1],
        )
            .trim()
            .toLowerCase()

    if (
        !slug ||
        RESERVED_PUBLIC_PATHS.has(slug)
    ) {
        return null
    }

    return {
        slug,
        canonicalPath:
            `/${encodeURIComponent(slug)}${cleanMatch[2] ?? ''}`,
    }
}

function getOrganisationRoute(
    url: URL,
): {
    slug: string
    canonicalUrl: string
} | null {
    const hostname =
        url.hostname
            .trim()
            .toLowerCase()

    if (MARKETING_HOSTS.has(hostname)) {
        return null
    }

    const isPreviewHost =
        hostname.endsWith(
            '.netlify.app',
        )

    const isLocalHost =
        hostname === 'localhost' ||
        hostname === '127.0.0.1'

    if (
        !APP_HOSTS.has(hostname) &&
        !isPreviewHost &&
        !isLocalHost
    ) {
        return null
    }

    const route =
        getAppOrganisationRoute(
            url.pathname,
        )

    if (!route) {
        return null
    }

    return {
        slug: route.slug,
        canonicalUrl:
            `${url.protocol}//${url.host}${route.canonicalPath}`,
    }
}

function isPublicOrganisation(
    value: unknown,
): value is PublicOrganisation {
    if (
        typeof value !== 'object' ||
        value === null
    ) {
        return false
    }

    const row =
        value as Record<string, unknown>

    return (
        typeof row.name === 'string' &&
        typeof row.slug === 'string' &&
        (
            row.logo_url === null ||
            typeof row.logo_url === 'string'
        ) &&
        (
            row.primary_colour === null ||
            typeof row.primary_colour === 'string'
        ) &&
        (
            row.background_colour === null ||
            typeof row.background_colour === 'string'
        ) &&
        (
            row.organisation_type === null ||
            typeof row.organisation_type === 'string'
        )
    )
}

async function loadPublicOrganisation(
    slug: string,
): Promise<PublicOrganisation | null> {
    const credentials =
        getSupabaseCredentials()

    if (!credentials) {
        return null
    }

    const query =
        new URLSearchParams({
            select:
                'name,slug,logo_url,primary_colour,background_colour,organisation_type',
            slug: `eq.${slug}`,
            public_site_enabled:
                'eq.true',
            status: 'eq.active',
            limit: '1',
        })

    const controller =
        new AbortController()

    const timeout =
        setTimeout(
            () => controller.abort(),
            2500,
        )

    try {
        const response =
            await fetch(
                `${credentials.url}/rest/v1/organisations?${query.toString()}`,
                {
                    headers: {
                        apikey:
                            credentials.anonKey,
                        Authorization:
                            `Bearer ${credentials.anonKey}`,
                        Accept:
                            'application/json',
                    },
                    signal:
                        controller.signal,
                },
            )

        if (!response.ok) {
            return null
        }

        const payload: unknown =
            await response.json()

        if (!Array.isArray(payload)) {
            return null
        }

        const first = payload[0]

        return isPublicOrganisation(first)
            ? first
            : null
    } catch {
        return null
    } finally {
        clearTimeout(timeout)
    }
}

function escapeHtmlAttribute(
    value: string,
): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function escapeHtmlText(
    value: string,
): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function replaceOrInsertTag(
    html: string,
    pattern: RegExp,
    tag: string,
): string {
    if (pattern.test(html)) {
        return html.replace(
            pattern,
            tag,
        )
    }

    return html.replace(
        /<\/head>/i,
        `    ${tag}\n</head>`,
    )
}

function setTitle(
    html: string,
    title: string,
): string {
    const tag =
        `<title>${escapeHtmlText(title)}</title>`

    return replaceOrInsertTag(
        html,
        /<title[^>]*>[\s\S]*?<\/title>/i,
        tag,
    )
}

function setMeta(
    html: string,
    attributeName: 'name' | 'property',
    attributeValue: string,
    content: string,
): string {
    const escapedContent =
        escapeHtmlAttribute(content)

    const tag =
        `<meta ${attributeName}="${attributeValue}" content="${escapedContent}" />`

    const pattern =
        new RegExp(
            `<meta\\s+[^>]*${attributeName}=["']${attributeValue.replace(':', '\\:')}["'][^>]*>`,
            'i',
        )

    return replaceOrInsertTag(
        html,
        pattern,
        tag,
    )
}

function setCanonical(
    html: string,
    canonicalUrl: string,
): string {
    const tag =
        `<link rel="canonical" href="${escapeHtmlAttribute(canonicalUrl)}" />`

    return replaceOrInsertTag(
        html,
        /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
        tag,
    )
}

function resolveImageUrl(
    organisation: PublicOrganisation,
    requestUrl: URL,
): string {
    const logoUrl =
        organisation.logo_url?.trim() ?? ''

    if (logoUrl) {
        try {
            const parsed =
                new URL(logoUrl)

            if (
                parsed.protocol === 'https:' ||
                parsed.protocol === 'http:'
            ) {
                return parsed.href
            }
        } catch {
            // Use the TournamentHQ fallback below.
        }
    }

    return new URL(
        '/assets/tournamenthq-logo.png',
        requestUrl.origin,
    ).href
}

function createDescription(
    organisation: PublicOrganisation,
): string {
    const organisationName =
        organisation.name.trim()

    if (
        organisation.organisation_type ===
        'club'
    ) {
        return `Official club website for ${organisationName}, powered by TournamentHQ.`
    }

    return `Official competition website for ${organisationName}, powered by TournamentHQ.`
}

function applySocialMetadata(
    html: string,
    organisation: PublicOrganisation,
    canonicalUrl: string,
    requestUrl: URL,
): string {
    const organisationName =
        organisation.name.trim()

    const title =
        `${organisationName} | TournamentHQ`

    const description =
        createDescription(
            organisation,
        )

    const imageUrl =
        resolveImageUrl(
            organisation,
            requestUrl,
        )

    const themeColour =
        organisation.primary_colour
            ?.trim() ||
        organisation.background_colour
            ?.trim() ||
        '#0b1220'

    let nextHtml =
        setTitle(
            html,
            title,
        )

    nextHtml =
        setCanonical(
            nextHtml,
            canonicalUrl,
        )

    const metas: Array<{
        attributeName:
            'name' | 'property'
        attributeValue: string
        content: string
    }> = [
        {
            attributeName: 'name',
            attributeValue:
                'description',
            content: description,
        },
        {
            attributeName: 'name',
            attributeValue:
                'application-name',
            content: organisationName,
        },
        {
            attributeName: 'name',
            attributeValue:
                'theme-color',
            content: themeColour,
        },
        {
            attributeName: 'property',
            attributeValue:
                'og:site_name',
            content: 'TournamentHQ',
        },
        {
            attributeName: 'property',
            attributeValue:
                'og:title',
            content: title,
        },
        {
            attributeName: 'property',
            attributeValue:
                'og:description',
            content: description,
        },
        {
            attributeName: 'property',
            attributeValue:
                'og:type',
            content: 'website',
        },
        {
            attributeName: 'property',
            attributeValue:
                'og:url',
            content: canonicalUrl,
        },
        {
            attributeName: 'property',
            attributeValue:
                'og:image',
            content: imageUrl,
        },
        {
            attributeName: 'property',
            attributeValue:
                'og:image:secure_url',
            content: imageUrl,
        },
        {
            attributeName: 'property',
            attributeValue:
                'og:image:alt',
            content:
                `${organisationName} logo`,
        },
        {
            attributeName: 'name',
            attributeValue:
                'twitter:card',
            content:
                'summary_large_image',
        },
        {
            attributeName: 'name',
            attributeValue:
                'twitter:title',
            content: title,
        },
        {
            attributeName: 'name',
            attributeValue:
                'twitter:description',
            content: description,
        },
        {
            attributeName: 'name',
            attributeValue:
                'twitter:image',
            content: imageUrl,
        },
        {
            attributeName: 'name',
            attributeValue:
                'twitter:image:alt',
            content:
                `${organisationName} logo`,
        },
    ]

    for (const meta of metas) {
        nextHtml =
            setMeta(
                nextHtml,
                meta.attributeName,
                meta.attributeValue,
                meta.content,
            )
    }

    return nextHtml
}

export default async function handler(
    request: Request,
    context: Context,
): Promise<Response> {
    const requestUrl =
        new URL(request.url)

    const route =
        getOrganisationRoute(
            requestUrl,
        )

    if (!route) {
        return context.next()
    }

    const [response, organisation] =
        await Promise.all([
            context.next(),
            loadPublicOrganisation(
                route.slug,
            ),
        ])

    if (!organisation) {
        return response
    }

    const contentType =
        response.headers
            .get('content-type') ?? ''

    if (
        !response.ok ||
        !contentType
            .toLowerCase()
            .includes('text/html')
    ) {
        return response
    }

    const html =
        await response.text()

    const transformedHtml =
        applySocialMetadata(
            html,
            organisation,
            route.canonicalUrl,
            requestUrl,
        )

    const headers =
        new Headers(
            response.headers,
        )

    headers.delete(
        'content-length',
    )
    headers.delete(
        'content-encoding',
    )
    headers.set(
        'x-tournamenthq-social-preview',
        route.slug,
    )

    return new Response(
        transformedHtml,
        {
            status: response.status,
            statusText:
                response.statusText,
            headers,
        },
    )
}

export const config: Config = {
    path: '/*',
    excludedPath: [
        '/assets/*',
        '/favicon.ico',
        '/favicon-16x16.png',
        '/favicon-32x32.png',
        '/apple-touch-icon.png',
        '/site.webmanifest',
    ],
    method: ['GET'],
    onError: 'bypass',
}
