import {
    useEffect,
    useMemo,
    useState,
} from 'react'
import { useLocation } from 'react-router-dom'
import { PublicCompetitionsPage } from './PublicCompetitionsPage'
import type { Organisation } from '../../components/admin/Organisations/organisationTypes'
import {
    organisationPublicService,
    type PublicOrganisationData,
} from '../../services/public/organisationPublicService'
import { PublicHomePage } from './PublicHomePage'

function getOrganisationSlug(
    pathname: string,
) {
    const match =
        pathname.match(
            /^\/o\/([^/]+)(?:\/.*)?$/,
        )

    return match
        ? decodeURIComponent(match[1])
        : ''
}

function createReadableTextColour(
    backgroundColour: string,
) {
    const colour =
        backgroundColour.replace(
            '#',
            '',
        )

    if (colour.length !== 6) {
        return '#ffffff'
    }

    const red =
        parseInt(
            colour.substring(0, 2),
            16,
        )

    const green =
        parseInt(
            colour.substring(2, 4),
            16,
        )

    const blue =
        parseInt(
            colour.substring(4, 6),
            16,
        )

    const brightness =
        red * 0.299 +
        green * 0.587 +
        blue * 0.114

    return brightness > 160
        ? '#071006'
        : '#ffffff'
}

export function PublicOrganisationLayout() {
    const location = useLocation()

    const [
        publicData,
        setPublicData,
    ] =
        useState<PublicOrganisationData | null>(
            null,
        )

    const [
        loading,
        setLoading,
    ] =
        useState(true)

    const [
        error,
        setError,
    ] =
        useState('')

    useEffect(() => {
        async function loadOrganisation() {
            const slug =
                getOrganisationSlug(
                    location.pathname,
                )

            if (!slug) {
                setPublicData(null)
                setError(
                    'The organisation link is invalid.',
                )
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError('')

                const result =
                    await organisationPublicService
                        .getPublicOrganisationData(
                            slug,
                        )

                setPublicData(result)
            } catch (loadError) {
                console.error(
                    'Unable to load the public organisation:',
                    loadError,
                )

                setPublicData(null)
                setError(
                    'We could not load this organisation right now.',
                )
            } finally {
                setLoading(false)
            }
        }

        void loadOrganisation()
    }, [location.pathname])

    const organisation =
        publicData?.organisation ?? null

    const theme =
        useMemo(() => {
            const backgroundColour =
                organisation
                    ?.background_colour ||
                '#071006'

            const surfaceColour =
                organisation
                    ?.surface_colour ||
                '#10190f'

            const textColour =
                organisation
                    ?.text_colour ||
                '#ffffff'

            const primaryColour =
                organisation
                    ?.primary_colour ||
                '#84cc16'

            const secondaryColour =
                organisation
                    ?.secondary_colour ||
                '#0f172a'

            const accentColour =
                organisation
                    ?.accent_colour ||
                primaryColour

            return {
                backgroundColour,
                surfaceColour,
                textColour,
                primaryColour,
                secondaryColour,
                accentColour,
                accentTextColour:
                    createReadableTextColour(
                        accentColour,
                    ),
            }
        }, [organisation])

    if (loading) {
        return (
            <main
                style={{
                    minHeight: '100vh',
                    display: 'grid',
                    placeItems: 'center',
                    background: '#071006',
                    color: '#ffffff',
                    padding: '2rem',
                }}
            >
                <p>
                    Loading organisation...
                </p>
            </main>
        )
    }

    if (error) {
        return (
            <main
                style={{
                    minHeight: '100vh',
                    display: 'grid',
                    placeItems: 'center',
                    background: '#071006',
                    color: '#ffffff',
                    padding: '2rem',
                    textAlign: 'center',
                }}
            >
                <div>
                    <h1>
                        Public site unavailable
                    </h1>

                    <p>{error}</p>
                </div>
            </main>
        )
    }

    if (!organisation || !publicData) {
        return (
            <main
                style={{
                    minHeight: '100vh',
                    display: 'grid',
                    placeItems: 'center',
                    background: '#071006',
                    color: '#ffffff',
                    padding: '2rem',
                    textAlign: 'center',
                }}
            >
                <div>
                    <h1>
                        Organisation not found
                    </h1>

                    <p>
                        This public organisation site
                        does not exist or is not
                        currently published.
                    </p>
                </div>
            </main>
        )
    }

    const basePath =
        `/o/${encodeURIComponent(
            organisation.slug,
        )}`

    const navigationItems = [
        {
            label: 'Home',
            href: basePath,
        },
        {
            label: 'Competitions',
            href: `${basePath}/competitions`,
        },
        {
            label: 'Fixtures',
            href: `${basePath}/fixtures`,
        },
        {
            label: 'Results',
            href: `${basePath}/results`,
        },
        {
            label: 'Tables',
            href: `${basePath}/tables`,
        },
        {
            label: 'Teams',
            href: `${basePath}/teams`,
        },
        {
            label: 'News',
            href: `${basePath}/news`,
        },
        {
            label: 'Sponsors',
            href: `${basePath}/sponsors`,
        },
        {
            label: 'Contact',
            href: `${basePath}/contact`,
        },
        {
            label: 'Admin Portal',
            href: '/admin',
        },
    ]

    return (
        <main
            style={{
                minHeight: '100vh',
                background:
                theme.backgroundColour,
                color:
                theme.textColour,
            }}
        >
            <header
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    background:
                        `${theme.backgroundColour}f2`,
                    borderBottom:
                        `1px solid ${theme.accentColour}30`,
                    backdropFilter:
                        'blur(16px)',
                }}
            >
                <div
                    style={{
                        width:
                            'min(1240px, calc(100% - 2rem))',
                        margin: '0 auto',
                        minHeight: '76px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                            'space-between',
                        gap: '1.5rem',
                        flexWrap: 'wrap',
                        padding: '0.75rem 0',
                    }}
                >
                    <a
                        href={basePath}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.875rem',
                            color:
                            theme.textColour,
                            textDecoration: 'none',
                        }}
                    >
                        {organisation.logo_url ? (
                            <img
                                src={
                                    organisation.logo_url
                                }
                                alt={`${organisation.name} logo`}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    objectFit:
                                        'contain',
                                    borderRadius:
                                        '12px',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius:
                                        '12px',
                                    display: 'grid',
                                    placeItems: 'center',
                                    background:
                                    theme.accentColour,
                                    color:
                                    theme.accentTextColour,
                                    fontWeight: 900,
                                }}
                            >
                                {organisation.name
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>
                        )}

                        <div>
                            <strong
                                style={{
                                    display: 'block',
                                    fontSize: '1rem',
                                }}
                            >
                                {organisation.name}
                            </strong>

                            <span
                                style={{
                                    display: 'block',
                                    marginTop:
                                        '0.125rem',
                                    fontSize:
                                        '0.75rem',
                                    opacity: 0.65,
                                    textTransform:
                                        'uppercase',
                                    letterSpacing:
                                        '0.08em',
                                }}
                            >
                                Powered by
                                TournamentHQ
                            </span>
                        </div>
                    </a>

                    <a
                        href="https://tournamenthq.co.uk"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Visit TournamentHQ"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            textDecoration: 'none',
                        }}
                    >
                        <img
                            src="/assets/tournamenthq-logo.png"
                            alt="TournamentHQ"
                            style={{
                                display: 'block',
                                width: 'clamp(130px, 12vw, 175px)',
                                height: 'auto',
                                maxHeight: '48px',
                                objectFit: 'contain',
                            }}
                        />
                    </a>

                    <nav
                        aria-label="Public site navigation"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent:
                                'flex-end',
                            gap: '0.35rem',
                            flexWrap: 'wrap',
                        }}
                    >
                        {navigationItems.map(
                            ({
                                 label,
                                 href,
                             }) => (
                                <a
                                    key={label}
                                    href={href}
                                    style={{
                                        display:
                                            'inline-flex',
                                        alignItems:
                                            'center',
                                        minHeight: '40px',
                                        padding:
                                            '0.55rem 0.75rem',
                                        borderRadius:
                                            '999px',
                                        color:
                                        theme.textColour,
                                        textDecoration:
                                            'none',
                                        fontSize:
                                            '0.875rem',
                                        fontWeight: 700,
                                        opacity: 0.82,
                                    }}
                                >
                                    {label}
                                </a>
                            ),
                        )}
                    </nav>
                </div>
            </header>

            {location.pathname === basePath ? (
                <PublicHomePage
                    organisationName={organisation.name}
                    backgroundColour={theme.backgroundColour}
                    surfaceColour={theme.surfaceColour}
                    textColour={theme.textColour}
                    accentColour={theme.accentColour}
                    accentTextColour={theme.accentTextColour}
                    basePath={basePath}
                    competitions={publicData.competitions}
                    articles={publicData.articles}
                    sponsors={publicData.sponsors}
                    media={publicData.media}
                />
            ) : location.pathname === `${basePath}/competitions` ? (
                <PublicCompetitionsPage
                    organisationId={organisation.id}
                    organisationName={organisation.name}
                    surfaceColour={theme.surfaceColour}
                    textColour={theme.textColour}
                    accentColour={theme.accentColour}
                    basePath={basePath}
                />
            ) : (
                <PublicHomePage
                    organisationName={organisation.name}
                    backgroundColour={theme.backgroundColour}
                    surfaceColour={theme.surfaceColour}
                    textColour={theme.textColour}
                    accentColour={theme.accentColour}
                    accentTextColour={theme.accentTextColour}
                    basePath={basePath}
                    competitions={publicData.competitions}
                    articles={publicData.articles}
                    sponsors={publicData.sponsors}
                    media={publicData.media}
                />
            )}

            <footer
                style={{
                    borderTop:
                        `1px solid ${theme.accentColour}20`,
                    background:
                    theme.surfaceColour,
                }}
            >
                <div
                    style={{
                        width:
                            'min(1240px, calc(100% - 2rem))',
                        margin: '0 auto',
                        minHeight: '150px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                            'space-between',
                        gap: '1.5rem',
                        flexWrap: 'wrap',
                        padding: '2rem 0',
                    }}
                >
                    <div>
                        <strong>
                            {organisation.name}
                        </strong>

                        <p
                            style={{
                                margin:
                                    '0.5rem 0 0',
                                opacity: 0.65,
                            }}
                        >
                            Official competition
                            website
                        </p>
                    </div>

                    <a
                        href="https://tournamenthq.co.uk"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Visit TournamentHQ"
                        style={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '0.45rem',
                            color: theme.textColour,
                            textDecoration: 'none',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.75rem',
                                opacity: 0.65,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                            }}
                        >
                            Powered by
                        </span>

                        <img
                            src="/assets/tournamenthq-logo.png"
                            alt="TournamentHQ"
                            style={{
                                display: 'block',
                                width: '180px',
                                maxWidth: '100%',
                                height: 'auto',
                                maxHeight: '52px',
                                objectFit: 'contain',
                            }}
                        />
                    </a>
                </div>
            </footer>
        </main>
    )
}