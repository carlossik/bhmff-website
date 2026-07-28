import {
    useEffect,
    type ReactNode,
} from 'react'

import {
    useOrganisation,
} from './OrganisationContext'

type OrganisationThemeProviderProps = {
    children: ReactNode
}

type ThemeOrganisation = {
    primary_colour?: string | null
    secondary_colour?: string | null
    accent_colour?: string | null
    background_colour?: string | null
    surface_colour?: string | null
    text_colour?: string | null
}

const DEFAULT_THEME = {
    primary: '#0f766e',
    secondary: '#0f172a',
    accent: '#10b981',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
}

const THEME_VARIABLES = [
    '--thq-primary',
    '--thq-secondary',
    '--thq-accent',
    '--thq-background',
    '--thq-surface',
    '--thq-text',
] as const

function getThemeValue(
    value: string | null | undefined,
    fallback: string
) {
    const trimmedValue = value?.trim()

    return trimmedValue || fallback
}

export function OrganisationThemeProvider({
                                              children,
                                          }: OrganisationThemeProviderProps) {
    const {
        currentOrganisation,
    } = useOrganisation()

    useEffect(() => {
        const organisation =
            currentOrganisation as unknown as ThemeOrganisation

        const root =
            document.documentElement

        root.style.setProperty(
            '--thq-primary',
            getThemeValue(
                organisation.primary_colour,
                DEFAULT_THEME.primary
            )
        )

        root.style.setProperty(
            '--thq-secondary',
            getThemeValue(
                organisation.secondary_colour,
                DEFAULT_THEME.secondary
            )
        )

        root.style.setProperty(
            '--thq-accent',
            getThemeValue(
                organisation.accent_colour,
                DEFAULT_THEME.accent
            )
        )

        root.style.setProperty(
            '--thq-background',
            getThemeValue(
                organisation.background_colour,
                DEFAULT_THEME.background
            )
        )

        root.style.setProperty(
            '--thq-surface',
            getThemeValue(
                organisation.surface_colour,
                DEFAULT_THEME.surface
            )
        )

        root.style.setProperty(
            '--thq-text',
            getThemeValue(
                organisation.text_colour,
                DEFAULT_THEME.text
            )
        )

        return () => {
            THEME_VARIABLES.forEach(
                (variable) => {
                    root.style.removeProperty(
                        variable
                    )
                }
            )
        }
    }, [currentOrganisation])

    return children
}