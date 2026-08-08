import {
    createContext,
    useContext,
    useMemo,
    type CSSProperties,
    type ReactNode,
} from 'react'

import {
    createOrganisationTheme,
    createOrganisationThemeVariables,
    type OrganisationTheme,
    type OrganisationThemeSource,
} from './organisationTheme'

type OrganisationThemeContextValue = {
    theme: OrganisationTheme
    themeStyle: CSSProperties
}

const OrganisationThemeContext =
    createContext<OrganisationThemeContextValue | null>(null)

type OrganisationThemeProviderProps = {
    organisation?: OrganisationThemeSource | null
    children: ReactNode
    className?: string
}

export function OrganisationThemeProvider({
                                              organisation,
                                              children,
                                              className = '',
                                          }: OrganisationThemeProviderProps) {
    const theme = useMemo(
        () => createOrganisationTheme(organisation),
        [organisation],
    )

    const themeStyle = useMemo(
        () =>
            createOrganisationThemeVariables(theme) as CSSProperties,
        [theme],
    )

    const value = useMemo<OrganisationThemeContextValue>(
        () => ({
            theme,
            themeStyle,
        }),
        [theme, themeStyle],
    )

    return (
        <OrganisationThemeContext.Provider value={value}>
            <div
                data-thq-theme={theme.isLight ? 'light' : 'dark'}
                className={[
                    'min-h-full',
                    'bg-[var(--thq-background)]',
                    'text-[var(--thq-text)]',
                    className,
                ]
                    .filter(Boolean)
                    .join(' ')}
                style={themeStyle}
            >
                {children}
            </div>
        </OrganisationThemeContext.Provider>
    )
}

export function useOrganisationTheme():
    OrganisationThemeContextValue {
    const context = useContext(OrganisationThemeContext)

    if (!context) {
        throw new Error(
            'useOrganisationTheme must be used within an OrganisationThemeProvider.',
        )
    }

    return context
}