export type OrganisationThemeSource = {
    primary_colour?: string | null
    secondary_colour?: string | null
    accent_colour?: string | null
    background_colour?: string | null
    surface_colour?: string | null
    text_colour?: string | null
}

export type OrganisationTheme = {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    mutedText: string
    border: string
    accentText: string
    primaryText: string
    isLight: boolean
}

export const defaultOrganisationTheme: OrganisationTheme = {
    primary: '#0F766E',
    secondary: '#0F172A',
    accent: '#84CC16',
    background: '#071006',
    surface: '#10190F',
    text: '#FFFFFF',
    mutedText: '#94A3B8',
    border: '#29431F',
    accentText: '#071006',
    primaryText: '#FFFFFF',
    isLight: false,
}

const HEX_PATTERN = /^#[0-9A-F]{6}$/i

function normaliseHex(
    value: string | null | undefined,
    fallback: string,
): string {
    const candidate = value?.trim()

    if (!candidate) {
        return fallback
    }

    const withHash = candidate.startsWith('#')
        ? candidate
        : `#${candidate}`

    return HEX_PATTERN.test(withHash)
        ? withHash.toUpperCase()
        : fallback
}

function hexToRgb(value: string) {
    const hex = value.replace('#', '')

    return {
        red: Number.parseInt(hex.slice(0, 2), 16),
        green: Number.parseInt(hex.slice(2, 4), 16),
        blue: Number.parseInt(hex.slice(4, 6), 16),
    }
}

function getRelativeLuminance(value: string): number {
    const { red, green, blue } = hexToRgb(value)

    const channels = [red, green, blue].map((channel) => {
        const normalised = channel / 255

        return normalised <= 0.03928
            ? normalised / 12.92
            : ((normalised + 0.055) / 1.055) ** 2.4
    })

    return (
        0.2126 * channels[0] +
        0.7152 * channels[1] +
        0.0722 * channels[2]
    )
}

export function getContrastText(
    background: string,
): '#071006' | '#FFFFFF' {
    return getRelativeLuminance(background) > 0.52
        ? '#071006'
        : '#FFFFFF'
}

function mixColours(
    foreground: string,
    background: string,
    foregroundWeight: number,
): string {
    const foregroundRgb = hexToRgb(foreground)
    const backgroundRgb = hexToRgb(background)
    const weight = Math.min(1, Math.max(0, foregroundWeight))

    const values = [
        Math.round(
            foregroundRgb.red * weight +
            backgroundRgb.red * (1 - weight),
        ),
        Math.round(
            foregroundRgb.green * weight +
            backgroundRgb.green * (1 - weight),
        ),
        Math.round(
            foregroundRgb.blue * weight +
            backgroundRgb.blue * (1 - weight),
        ),
    ]

    return `#${values
        .map((channel) =>
            channel.toString(16).padStart(2, '0'),
        )
        .join('')
        .toUpperCase()}`
}

export function createOrganisationTheme(
    source?: OrganisationThemeSource | null,
): OrganisationTheme {
    const primary = normaliseHex(
        source?.primary_colour,
        defaultOrganisationTheme.primary,
    )
    const secondary = normaliseHex(
        source?.secondary_colour,
        defaultOrganisationTheme.secondary,
    )
    const accent = normaliseHex(
        source?.accent_colour,
        defaultOrganisationTheme.accent,
    )
    const background = normaliseHex(
        source?.background_colour,
        defaultOrganisationTheme.background,
    )
    const surface = normaliseHex(
        source?.surface_colour,
        defaultOrganisationTheme.surface,
    )
    const text = normaliseHex(
        source?.text_colour,
        defaultOrganisationTheme.text,
    )

    const isLight =
        getRelativeLuminance(background) >= 0.55

    return {
        primary,
        secondary,
        accent,
        background,
        surface,
        text,
        mutedText: mixColours(
            text,
            background,
            isLight ? 0.62 : 0.68,
        ),
        border: mixColours(
            accent,
            surface,
            isLight ? 0.24 : 0.2,
        ),
        accentText: getContrastText(accent),
        primaryText: getContrastText(primary),
        isLight,
    }
}

export type OrganisationThemeVariables = Record<
    | '--thq-primary'
    | '--thq-primary-text'
    | '--thq-secondary'
    | '--thq-accent'
    | '--thq-accent-text'
    | '--thq-background'
    | '--thq-surface'
    | '--thq-text'
    | '--thq-muted-text'
    | '--thq-border'
    | '--thq-colour-scheme',
    string
>

export function createOrganisationThemeVariables(
    theme: OrganisationTheme,
): OrganisationThemeVariables {
    return {
        '--thq-primary': theme.primary,
        '--thq-primary-text': theme.primaryText,
        '--thq-secondary': theme.secondary,
        '--thq-accent': theme.accent,
        '--thq-accent-text': theme.accentText,
        '--thq-background': theme.background,
        '--thq-surface': theme.surface,
        '--thq-text': theme.text,
        '--thq-muted-text': theme.mutedText,
        '--thq-border': theme.border,
        '--thq-colour-scheme': theme.isLight ? 'light' : 'dark',
    }
}