import {
    useEffect,
    useState,
} from 'react'
import {
    ArrowRight,
    CalendarDays,
    Trophy,
} from 'lucide-react'

import type { Competition } from '../../types/competitionTypes'
import { competitionPublicService } from '../../services/public/competitionPublicService'

type PublicCompetitionsPageProps = {
    organisationId: string
    organisationName: string
    surfaceColour: string
    textColour: string
    accentColour: string
    basePath: string
}

function formatCompetitionFormat(
    format: Competition['format'],
) {
    return format
        .toLowerCase()
        .split('_')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1),
        )
        .join(' ')
}

function formatDate(
    value: string | null,
) {
    if (!value) {
        return null
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        },
    ).format(new Date(value))
}

export function PublicCompetitionsPage({
                                           organisationId,
                                           organisationName,
                                           surfaceColour,
                                           textColour,
                                           accentColour,
                                           basePath,
                                       }: PublicCompetitionsPageProps) {
    const [
        competitions,
        setCompetitions,
    ] =
        useState<Competition[]>([])

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
        async function loadCompetitions() {
            try {
                setLoading(true)
                setError('')

                const result =
                    await competitionPublicService
                        .getPublishedCompetitions(
                            organisationId,
                        )

                setCompetitions(result)
            } catch (loadError) {
                console.error(
                    'Unable to load public competitions:',
                    loadError,
                )

                setError(
                    'We could not load competitions right now.',
                )
            } finally {
                setLoading(false)
            }
        }

        void loadCompetitions()
    }, [organisationId])

    return (
        <section
            style={{
                width:
                    'min(1240px, calc(100% - 2rem))',
                margin: '0 auto',
                padding: '4.5rem 0 6rem',
            }}
        >
            <div
                style={{
                    maxWidth: '760px',
                    marginBottom: '2.5rem',
                }}
            >
                <p
                    style={{
                        margin: '0 0 0.75rem',
                        color: accentColour,
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                    }}
                >
                    Competitions
                </p>

                <h1
                    style={{
                        margin: 0,
                        fontSize:
                            'clamp(2.5rem, 7vw, 5rem)',
                        lineHeight: 0.98,
                        letterSpacing: '-0.045em',
                    }}
                >
                    Current competitions
                </h1>

                <p
                    style={{
                        margin: '1.25rem 0 0',
                        fontSize:
                            'clamp(1rem, 2vw, 1.2rem)',
                        lineHeight: 1.7,
                        opacity: 0.7,
                    }}
                >
                    Explore published leagues, cups
                    and tournaments managed by{' '}
                    {organisationName}.
                </p>
            </div>

            {loading && (
                <div
                    style={{
                        padding: '2rem',
                        borderRadius: '18px',
                        background: surfaceColour,
                        border:
                            `1px solid ${accentColour}25`,
                    }}
                >
                    Loading competitions...
                </div>
            )}

            {!loading && error && (
                <div
                    style={{
                        padding: '2rem',
                        borderRadius: '18px',
                        background: surfaceColour,
                        border:
                            `1px solid ${accentColour}25`,
                    }}
                >
                    {error}
                </div>
            )}

            {!loading &&
                !error &&
                competitions.length === 0 && (
                    <div
                        style={{
                            padding: '2rem',
                            borderRadius: '18px',
                            background: surfaceColour,
                            border:
                                `1px solid ${accentColour}25`,
                        }}
                    >
                        <h2
                            style={{
                                margin: 0,
                            }}
                        >
                            No published competitions
                        </h2>

                        <p
                            style={{
                                margin:
                                    '0.75rem 0 0',
                                opacity: 0.68,
                            }}
                        >
                            Published competitions will
                            appear here.
                        </p>
                    </div>
                )}

            {!loading &&
                !error &&
                competitions.length > 0 && (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '1rem',
                        }}
                    >
                        {competitions.map(
                            (competition) => {
                                const startDate =
                                    formatDate(
                                        competition.start_date,
                                    )

                                const endDate =
                                    formatDate(
                                        competition.end_date,
                                    )

                                const dateLabel =
                                    startDate && endDate
                                        ? `${startDate} – ${endDate}`
                                        : startDate ||
                                        endDate ||
                                        'Dates to be confirmed'

                                return (
                                    <article
                                        key={competition.id}
                                        style={{
                                            minHeight: '310px',
                                            padding: '1.5rem',
                                            borderRadius: '22px',
                                            background:
                                            surfaceColour,
                                            border:
                                                `1px solid ${accentColour}28`,
                                            display: 'flex',
                                            flexDirection:
                                                'column',
                                            justifyContent:
                                                'space-between',
                                        }}
                                    >
                                        <div>
                                            <div
                                                style={{
                                                    display:
                                                        'flex',
                                                    alignItems:
                                                        'center',
                                                    justifyContent:
                                                        'space-between',
                                                    gap: '1rem',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width:
                                                            '50px',
                                                        height:
                                                            '50px',
                                                        borderRadius:
                                                            '15px',
                                                        display:
                                                            'grid',
                                                        placeItems:
                                                            'center',
                                                        color:
                                                        accentColour,
                                                        background:
                                                            `${accentColour}15`,
                                                    }}
                                                >
                                                    <Trophy
                                                        size={24}
                                                    />
                                                </div>

                                                <span
                                                    style={{
                                                        padding:
                                                            '0.45rem 0.7rem',
                                                        borderRadius:
                                                            '999px',
                                                        color:
                                                        accentColour,
                                                        background:
                                                            `${accentColour}12`,
                                                        fontSize:
                                                            '0.72rem',
                                                        fontWeight:
                                                            900,
                                                        textTransform:
                                                            'uppercase',
                                                        letterSpacing:
                                                            '0.06em',
                                                    }}
                                                >
                                                    {competition.status}
                                                </span>
                                            </div>

                                            <h2
                                                style={{
                                                    margin:
                                                        '1.35rem 0 0.6rem',
                                                    fontSize:
                                                        '1.5rem',
                                                }}
                                            >
                                                {competition.name}
                                            </h2>

                                            <p
                                                style={{
                                                    margin: 0,
                                                    lineHeight:
                                                        1.65,
                                                    opacity: 0.68,
                                                }}
                                            >
                                                {competition.description ||
                                                    'Competition information, fixtures and results.'}
                                            </p>
                                        </div>

                                        <div
                                            style={{
                                                marginTop:
                                                    '1.5rem',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display:
                                                        'flex',
                                                    alignItems:
                                                        'center',
                                                    gap:
                                                        '0.5rem',
                                                    fontSize:
                                                        '0.86rem',
                                                    opacity: 0.72,
                                                }}
                                            >
                                                <CalendarDays
                                                    size={17}
                                                />
                                                {dateLabel}
                                            </div>

                                            <p
                                                style={{
                                                    margin:
                                                        '0.65rem 0 0',
                                                    fontSize:
                                                        '0.86rem',
                                                    opacity: 0.72,
                                                }}
                                            >
                                                {competition.season ||
                                                    'Season not specified'}{' '}
                                                ·{' '}
                                                {formatCompetitionFormat(
                                                    competition.format,
                                                )}
                                            </p>

                                            <a
                                                href={`${basePath}/competitions/${encodeURIComponent(
                                                    competition.slug,
                                                )}`}
                                                style={{
                                                    display:
                                                        'inline-flex',
                                                    alignItems:
                                                        'center',
                                                    gap:
                                                        '0.5rem',
                                                    marginTop:
                                                        '1.25rem',
                                                    color:
                                                    accentColour,
                                                    textDecoration:
                                                        'none',
                                                    fontWeight:
                                                        900,
                                                }}
                                            >
                                                Open competition
                                                <ArrowRight
                                                    size={18}
                                                />
                                            </a>
                                        </div>
                                    </article>
                                )
                            },
                        )}
                    </div>
                )}
        </section>
    )
}