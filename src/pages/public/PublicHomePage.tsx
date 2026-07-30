import {
    Calendar,
    Camera,
    ExternalLink,
    Handshake,
    Newspaper,
    Shield,
    Trophy,
    Users,
} from 'lucide-react'
import type { Competition } from '../../types/competitionTypes'
import type {
    PublicArticle,
    PublicMediaItem,
    PublicSponsor,
} from '../../services/public/organisationPublicService'

type PublicHomePageProps = {
    organisationName: string
    backgroundColour: string
    surfaceColour: string
    textColour: string
    accentColour: string
    accentTextColour: string
    basePath: string
    competitions?: Competition[]
    articles?: PublicArticle[]
    sponsors?: PublicSponsor[]
    media?: PublicMediaItem[]
}

type LooseRecord = Record<string, unknown>

function getString(
    value: LooseRecord | undefined,
    keys: string[],
) {
    if (!value) return ''

    for (const key of keys) {
        const candidate = value[key]

        if (
            typeof candidate === 'string' &&
            candidate.trim()
        ) {
            return candidate.trim()
        }
    }

    return ''
}

function getDate(
    value: LooseRecord | undefined,
    keys: string[],
) {
    const raw = getString(value, keys)

    if (!raw) return null

    const date = new Date(raw)

    return Number.isNaN(date.getTime())
        ? null
        : date
}

function formatDate(date: Date | null) {
    if (!date) return ''

    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date)
}

function getCountdownParts(target: Date | null) {
    if (!target) return null

    const difference =
        target.getTime() - Date.now()

    if (difference <= 0) return null

    const totalSeconds =
        Math.floor(difference / 1000)

    return {
        days: Math.floor(
            totalSeconds / 86400,
        ),
        hours: Math.floor(
            (totalSeconds % 86400) / 3600,
        ),
        minutes: Math.floor(
            (totalSeconds % 3600) / 60,
        ),
        seconds:
            totalSeconds % 60,
    }
}

function sectionTitle(
    organisationName: string,
    suffix: string,
) {
    return organisationName
        .toLowerCase()
        .includes('festival')
        ? suffix
        : suffix.replace(
            'Festival',
            'Competition',
        )
}

export function PublicHomePage({
                                   organisationName,
                                   backgroundColour,
                                   surfaceColour,
                                   textColour,
                                   accentColour,
                                   accentTextColour,
                                   basePath,
                                   competitions = [],
                                   articles = [],
                                   sponsors = [],
                                   media = [],
                               }: PublicHomePageProps) {
    const primaryCompetition =
        competitions[0] as
            | (Competition &
            LooseRecord)
            | undefined

    const competitionName =
        getString(primaryCompetition, [
            'name',
            'title',
        ]) || organisationName

    const competitionDescription =
        getString(primaryCompetition, [
            'description',
            'summary',
        ]) ||
        `Follow fixtures, results, teams, news and official updates from ${organisationName}.`

    const startDate = getDate(
        primaryCompetition,
        ['start_date'],
    )

    const countdown =
        getCountdownParts(startDate)

    const startDateLabel =
        formatDate(startDate)

    const benefits = [
        {
            title: 'Competition Format',
            text:
                'Teams compete in group stages, playing every other team in their group once. The group winners and runners-up progress to the semi-finals, with the two semi-final winners meeting in the final.',
            icon: Trophy,
        },
        {
            title: 'Tournament Rules',
            text:
                'All teams, coaches and players must respect the Laws of the Game, competition regulations, player eligibility requirements, match schedules and decisions made by appointed officials.',
            icon: Shield,
        },
        {
            title: 'Code of Conduct',
            text:
                'Abuse of referees, racism, discrimination, threatening behaviour and violence will not be tolerated. Everyone is expected to protect the spirit, safety and reputation of the tournament.',
            icon: Users,
        },
        {
            title: 'Match Officials',
            text:
                'Qualified referees and supporting match officials will be assigned to fixtures, with appointments, availability and match responsibilities managed through TournamentHQ.',
            icon: Calendar,
        },
        {
            title: 'Official Media Coverage',
            text:
                'Professional highlights, interviews, match reports and digital storytelling will showcase the players, clubs, sponsors and wider community throughout the tournament.',
            icon: Camera,
        },
        {
            title: 'Community & Investment',
            text:
                'The tournament provides a credible platform for community engagement, youth opportunity, commercial partnerships and long-term investment in grassroots football.',
            icon: Handshake,
        },
    ]

    const scheduleItems = [
        {
            label: 'Stage 1',
            title: 'Opening Fixtures',
            text:
                'Competition opening, team welcome and the first published fixtures.',
        },
        {
            label: 'Stage 2',
            title: 'Competition Continues',
            text:
                'Further scheduled matches, results, sponsor activity and media coverage.',
        },
        {
            label: 'Stage 3',
            title: 'Knockout or Final Stages',
            text:
                'Qualifying teams progress through the decisive stages of the competition.',
        },
        {
            label: 'Final',
            title: 'Final and Awards',
            text:
                'The competition concludes with the final, recognition and celebration.',
        },
    ]

    const ecosystem = [
        {
            title: 'Fixtures',
            text:
                'View confirmed matches, dates, kick-off times and venues.',
            href: `${basePath}/fixtures`,
        },
        {
            title: 'Results',
            text:
                'Follow confirmed scores and published match reports.',
            href: `${basePath}/results`,
        },
        {
            title: 'Teams',
            text:
                'Explore participating clubs, teams and competition groups.',
            href: `${basePath}/teams`,
        },
        {
            title: 'TournamentHQ',
            text:
                'The competition management platform powering this public website.',
            href: 'https://tournamenthq.co.uk',
            external: true,
        },
    ]

    const page = {
        width:
            'min(1280px, calc(100% - 2.5rem))',
        border:
            `1px solid ${accentColour}35`,
        muted:
            `${textColour}b8`,
        card:
            `linear-gradient(180deg, ${surfaceColour}f2, ${backgroundColour}f5)`,
    }

    return (
        <div
            style={{
                background:
                    `radial-gradient(circle at 75% 28%, ${accentColour}18, transparent 28%), ${backgroundColour}`,
                color: textColour,
            }}
        >
            {countdown ? (
                <section
                    style={{
                        padding: '2.25rem 0',
                        textAlign: 'center',
                        background:
                            `linear-gradient(90deg, ${accentColour}20, ${accentColour}38, ${accentColour}20)`,
                        borderBottom:
                            `1px solid ${accentColour}45`,
                    }}
                >
                    <div
                        style={{
                            width: page.width,
                            margin: '0 auto',
                        }}
                    >
                        <p
                            style={{
                                margin:
                                    '0 0 0.35rem',
                                color:
                                accentColour,
                                fontSize:
                                    '0.75rem',
                                fontWeight: 900,
                                textTransform:
                                    'uppercase',
                                letterSpacing:
                                    '0.18em',
                            }}
                        >
                            {competitionName}
                        </p>

                        <h2
                            style={{
                                margin:
                                    '0 0 1.25rem',
                                fontSize:
                                    'clamp(1.8rem, 4vw, 3rem)',
                                lineHeight: 0.95,
                                textTransform:
                                    'uppercase',
                            }}
                        >
                            The competition begins in
                        </h2>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent:
                                    'center',
                                gap: '0.6rem',
                                flexWrap: 'wrap',
                            }}
                        >
                            {[
                                [
                                    countdown.days,
                                    'Days',
                                ],
                                [
                                    countdown.hours,
                                    'Hours',
                                ],
                                [
                                    countdown.minutes,
                                    'Minutes',
                                ],
                                [
                                    countdown.seconds,
                                    'Seconds',
                                ],
                            ].map(
                                ([value, label]) => (
                                    <div
                                        key={label}
                                        style={{
                                            width: '88px',
                                            minHeight:
                                                '86px',
                                            display:
                                                'grid',
                                            placeItems:
                                                'center',
                                            padding:
                                                '0.6rem',
                                            borderRadius:
                                                '12px',
                                            background:
                                            surfaceColour,
                                            border:
                                            page.border,
                                        }}
                                    >
                                        <strong
                                            style={{
                                                display:
                                                    'block',
                                                color:
                                                accentColour,
                                                fontSize:
                                                    '2rem',
                                                lineHeight: 1,
                                            }}
                                        >
                                            {String(
                                                value,
                                            ).padStart(
                                                2,
                                                '0',
                                            )}
                                        </strong>

                                        <span
                                            style={{
                                                display:
                                                    'block',
                                                marginTop:
                                                    '0.35rem',
                                                fontSize:
                                                    '0.62rem',
                                                fontWeight: 900,
                                                textTransform:
                                                    'uppercase',
                                                letterSpacing:
                                                    '0.1em',
                                            }}
                                        >
                                            {label}
                                        </span>
                                    </div>
                                ),
                            )}
                        </div>

                        {startDateLabel ? (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent:
                                        'center',
                                    marginTop:
                                        '1rem',
                                }}
                            >
                                <span
                                    style={{
                                        padding:
                                            '0.55rem 1rem',
                                        borderRadius:
                                            '999px',
                                        border:
                                        page.border,
                                        fontSize:
                                            '0.75rem',
                                        fontWeight: 800,
                                    }}
                                >
                                    {startDateLabel}
                                </span>
                            </div>
                        ) : null}
                    </div>
                </section>
            ) : null}

            <section
                style={{
                    minHeight: '690px',
                    display: 'grid',
                    alignItems: 'center',
                    padding: '5rem 0',
                    borderBottom:
                        `1px solid ${accentColour}25`,
                }}
            >
                <div
                    style={{
                        width: page.width,
                        margin: '0 auto',
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(360px, 1fr))',
                        alignItems: 'center',
                        gap: '3rem',
                    }}
                >
                    <div>
                        <div
                            style={{
                                width: '210px',
                                minHeight: '92px',
                                display: 'grid',
                                placeItems: 'center',
                                marginBottom:
                                    '1.4rem',
                                borderRadius:
                                    '14px',
                                background:
                                    `linear-gradient(145deg, ${surfaceColour}, ${backgroundColour})`,
                                border:
                                    `1px solid ${accentColour}50`,
                                boxShadow:
                                    `0 18px 50px ${accentColour}12`,
                            }}
                        >
                            <img
                                src="/assets/tournamenthq-logo.png"
                                alt="TournamentHQ"
                                style={{
                                    width: '178px',
                                    maxWidth: '88%',
                                    height: 'auto',
                                    objectFit:
                                        'contain',
                                }}
                            />
                        </div>

                        <p
                            style={{
                                margin: 0,
                                color:
                                accentColour,
                                fontSize:
                                    '0.72rem',
                                fontWeight: 900,
                                textTransform:
                                    'uppercase',
                                letterSpacing:
                                    '0.18em',
                            }}
                        >
                            Official competition website
                        </p>

                        <h1
                            style={{
                                margin:
                                    '0.75rem 0',
                                maxWidth: '720px',
                                fontSize:
                                    'clamp(3.6rem, 7vw, 7rem)',
                                lineHeight: 0.87,
                                letterSpacing:
                                    '-0.055em',
                                textTransform:
                                    'uppercase',
                            }}
                        >
                            {organisationName}
                        </h1>

                        <p
                            style={{
                                margin:
                                    '0 0 0.9rem',
                                color:
                                accentColour,
                                fontSize:
                                    '0.75rem',
                                fontWeight: 900,
                                textTransform:
                                    'uppercase',
                                letterSpacing:
                                    '0.18em',
                            }}
                        >
                            Powered by TournamentHQ
                        </p>

                        <p
                            style={{
                                maxWidth: '680px',
                                margin:
                                    '0 0 1.5rem',
                                color: page.muted,
                                fontSize:
                                    '1.12rem',
                                lineHeight: 1.72,
                            }}
                        >
                            {competitionDescription}
                        </p>

                        <div
                            style={{
                                display: 'flex',
                                gap: '0.75rem',
                                flexWrap: 'wrap',
                            }}
                        >
                            <a
                                href={`${basePath}/teams`}
                                style={{
                                    padding:
                                        '0.75rem 1.2rem',
                                    borderRadius:
                                        '8px',
                                    background:
                                    accentColour,
                                    color:
                                    accentTextColour,
                                    textDecoration:
                                        'none',
                                    fontSize:
                                        '0.78rem',
                                    fontWeight: 900,
                                    textTransform:
                                        'uppercase',
                                }}
                            >
                                View teams
                            </a>

                            <a
                                href={`${basePath}/fixtures`}
                                style={{
                                    padding:
                                        '0.75rem 1.2rem',
                                    borderRadius:
                                        '8px',
                                    border:
                                    page.border,
                                    color:
                                    textColour,
                                    textDecoration:
                                        'none',
                                    fontSize:
                                        '0.78rem',
                                    fontWeight: 900,
                                    textTransform:
                                        'uppercase',
                                }}
                            >
                                Fixtures
                            </a>

                            <a
                                href={`${basePath}/sponsors`}
                                style={{
                                    padding:
                                        '0.75rem 1.2rem',
                                    borderRadius:
                                        '8px',
                                    border:
                                    page.border,
                                    color:
                                    textColour,
                                    textDecoration:
                                        'none',
                                    fontSize:
                                        '0.78rem',
                                    fontWeight: 900,
                                    textTransform:
                                        'uppercase',
                                }}
                            >
                                Become a sponsor
                            </a>
                        </div>
                    </div>

                    <article
                        style={{
                            overflow: 'hidden',
                            borderRadius: '16px',
                            background:
                            page.card,
                            border: page.border,
                            padding: '0.85rem',
                        }}
                    >
                        <div
                            style={{
                                minHeight: '290px',
                                display: 'grid',
                                placeItems: 'center',
                                textAlign: 'center',
                                borderRadius:
                                    '12px',
                                background:
                                    `radial-gradient(circle at center, ${accentColour}30, transparent 35%), ${backgroundColour}`,
                                border:
                                    `1px solid ${accentColour}25`,
                            }}
                        >
                            <div>
                                <Camera
                                    size={44}
                                    color={
                                        accentColour
                                    }
                                />

                                <p
                                    style={{
                                        margin:
                                            '0.8rem 0 0',
                                        color:
                                        accentColour,
                                        fontSize:
                                            '0.72rem',
                                        fontWeight: 900,
                                        textTransform:
                                            'uppercase',
                                        letterSpacing:
                                            '0.14em',
                                    }}
                                >
                                    Featured match
                                </p>

                                <h3
                                    style={{
                                        maxWidth:
                                            '320px',
                                        margin:
                                            '0.55rem auto 0',
                                        fontSize:
                                            '1.45rem',
                                    }}
                                >
                                    Official video coverage coming soon
                                </h3>
                            </div>
                        </div>

                        <a
                            href={`${basePath}/news`}
                            style={{
                                display: 'flex',
                                justifyContent:
                                    'space-between',
                                alignItems: 'center',
                                padding:
                                    '1rem 0.4rem 0.3rem',
                                color:
                                accentColour,
                                textDecoration:
                                    'none',
                                fontSize:
                                    '0.76rem',
                                fontWeight: 900,
                                textTransform:
                                    'uppercase',
                            }}
                        >
                            Latest competition updates
                            <ExternalLink
                                size={15}
                            />
                        </a>
                    </article>
                </div>
            </section>

            <section
                style={{
                    padding: '4.5rem 0',
                    borderBottom:
                        `1px solid ${accentColour}25`,
                }}
            >
                <div
                    style={{
                        width: page.width,
                        margin: '0 auto',
                    }}
                >
                    <h2
                        style={{
                            margin:
                                '0 0 0.75rem',
                            color:
                            accentColour,
                            fontSize:
                                'clamp(2rem, 4vw, 3rem)',
                        }}
                    >
                        Tournament Structure, Standards & Vision
                    </h2>

                    <p
                        style={{
                            maxWidth: '850px',
                            margin: 0,
                            color: page.muted,
                        }}
                    >
                        A professionally organised tournament with a clear competitive pathway, strong governance, qualified match officials, zero tolerance for discrimination and a platform capable of attracting credible partners and long-term investment.
                    </p>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '1rem',
                            marginTop: '2rem',
                        }}
                    >
                        {benefits.map(
                            ({
                                 title,
                                 text,
                                 icon: Icon,
                             }) => (
                                <article
                                    key={title}
                                    style={{
                                        minHeight:
                                            '250px',
                                        padding:
                                            '1.65rem',
                                        borderRadius:
                                            '14px',
                                        background:
                                        page.card,
                                        border:
                                        page.border,
                                    }}
                                >
                                    <Icon
                                        size={25}
                                        color={
                                            accentColour
                                        }
                                    />

                                    <h3
                                        style={{
                                            margin:
                                                '1rem 0 0.6rem',
                                            fontSize:
                                                '1.25rem',
                                        }}
                                    >
                                        {title}
                                    </h3>

                                    <p
                                        style={{
                                            margin: 0,
                                            color:
                                            page.muted,
                                            fontSize:
                                                '1rem',
                                            lineHeight: 1.7,
                                        }}
                                    >
                                        {text}
                                    </p>
                                </article>
                            ),
                        )}
                    </div>
                </div>
            </section>

            <section
                id="fixtures"
                style={{
                    padding: '4.5rem 0',
                    borderBottom:
                        `1px solid ${accentColour}25`,
                }}
            >
                <div
                    style={{
                        width: page.width,
                        margin: '0 auto',
                    }}
                >
                    <h2
                        style={{
                            margin:
                                '0 0 0.75rem',
                            color:
                            accentColour,
                            fontSize:
                                'clamp(2rem, 4vw, 3rem)',
                        }}
                    >
                        Competition Schedule
                    </h2>

                    <p
                        style={{
                            maxWidth: '850px',
                            margin:
                                '0 0 1.75rem',
                            color: page.muted,
                        }}
                    >
                        Published fixtures and stages will appear here as they are confirmed by the organiser.
                    </p>

                    <div
                        style={{
                            display: 'grid',
                            gap: '0.85rem',
                        }}
                    >
                        {scheduleItems.map(
                            (item) => (
                                <article
                                    key={
                                        item.label
                                    }
                                    style={{
                                        display:
                                            'grid',
                                        gridTemplateColumns:
                                            '72px 1fr',
                                        alignItems:
                                            'center',
                                        gap: '1rem',
                                        padding:
                                            '1rem 1.2rem',
                                        borderRadius:
                                            '13px',
                                        background:
                                        page.card,
                                        border:
                                        page.border,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '58px',
                                            height: '58px',
                                            display:
                                                'grid',
                                            placeItems:
                                                'center',
                                            borderRadius:
                                                '50%',
                                            color:
                                            accentColour,
                                            border:
                                            page.border,
                                            fontSize:
                                                '0.68rem',
                                            fontWeight: 900,
                                            textAlign:
                                                'center',
                                        }}
                                    >
                                        {
                                            item.label
                                        }
                                    </div>

                                    <div>
                                        <h3
                                            style={{
                                                margin: 0,
                                            }}
                                        >
                                            {
                                                item.title
                                            }
                                        </h3>

                                        <p
                                            style={{
                                                margin:
                                                    '0.25rem 0 0',
                                                color:
                                                page.muted,
                                                fontSize:
                                                    '0.9rem',
                                            }}
                                        >
                                            {
                                                item.text
                                            }
                                        </p>
                                    </div>
                                </article>
                            ),
                        )}
                    </div>

                    <div
                        style={{
                            marginTop: '1.2rem',
                            padding: '1.4rem',
                            textAlign: 'center',
                            borderRadius:
                                '13px',
                            border:
                                `1px dashed ${accentColour}70`,
                            color: page.muted,
                        }}
                    >
                        Confirmed fixtures will appear here once published.
                    </div>
                </div>
            </section>

            {[
                {
                    id: 'results',
                    title: 'Latest Results',
                    intro:
                        'Confirmed and published match results from this competition.',
                    message:
                        'No published results yet.',
                },
                {
                    id: 'teams',
                    title: 'Teams & Group Standings',
                    intro:
                        'Meet the confirmed participating teams and follow published competition tables.',
                    message:
                        'Confirmed teams and standings will appear here.',
                },
                {
                    id: 'golden-boot',
                    title: 'Golden Boot',
                    intro:
                        'The leading goalscorers from published competition matches.',
                    message:
                        'Goalscorer statistics will appear here.',
                },
            ].map((section) => (
                <section
                    id={section.id}
                    key={section.id}
                    style={{
                        padding: '4.5rem 0',
                        borderBottom:
                            `1px solid ${accentColour}25`,
                    }}
                >
                    <div
                        style={{
                            width: page.width,
                            margin: '0 auto',
                        }}
                    >
                        <h2
                            style={{
                                margin:
                                    '0 0 0.75rem',
                                color:
                                accentColour,
                                fontSize:
                                    'clamp(2rem, 4vw, 3rem)',
                            }}
                        >
                            {section.title}
                        </h2>

                        <p
                            style={{
                                maxWidth:
                                    '850px',
                                margin:
                                    '0 0 1.5rem',
                                color:
                                page.muted,
                            }}
                        >
                            {section.intro}
                        </p>

                        <div
                            style={{
                                padding:
                                    '1.6rem',
                                textAlign:
                                    'center',
                                borderRadius:
                                    '13px',
                                background:
                                page.card,
                                border:
                                    `1px dashed ${accentColour}70`,
                                color:
                                page.muted,
                            }}
                        >
                            {section.message}
                        </div>
                    </div>
                </section>
            ))}

            <section
                id="media"
                style={{
                    padding: '4.5rem 0',
                    borderBottom:
                        `1px solid ${accentColour}25`,
                }}
            >
                <div
                    style={{
                        width: page.width,
                        margin: '0 auto',
                    }}
                >
                    <h2
                        style={{
                            margin:
                                '0 0 0.75rem',
                            color:
                            accentColour,
                            fontSize:
                                'clamp(2rem, 4vw, 3rem)',
                        }}
                    >
                        Official Media Coverage
                    </h2>

                    <p
                        style={{
                            maxWidth: '850px',
                            margin:
                                '0 0 1.75rem',
                            color: page.muted,
                        }}
                    >
                        Featured matches, highlights, interviews and official competition coverage.
                    </p>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(230px, 1fr))',
                            gap: '1rem',
                        }}
                    >
                        {[
                            {
                                title:
                                    'Competition Highlights',
                                text:
                                    'Watch featured matches, finals and official tournament highlights.',
                            },
                            {
                                title:
                                    'Match Highlights',
                                text:
                                    'Catch goals, saves, celebrations and important match moments.',
                            },
                            {
                                title:
                                    'Live Coverage & Interviews',
                                text:
                                    'Follow interviews, reactions, player stories and behind-the-scenes coverage.',
                            },
                        ].map(
                            (item, index) => {
                                const mediaItem =
                                    media[index]

                                const image =
                                    mediaItem
                                        ?.image_url ||
                                    mediaItem
                                        ?.thumbnail_url ||
                                    mediaItem
                                        ?.media_url ||
                                    mediaItem?.url

                                return (
                                    <article
                                        key={
                                            item.title
                                        }
                                        style={{
                                            overflow:
                                                'hidden',
                                            borderRadius:
                                                '14px',
                                            background:
                                            page.card,
                                            border:
                                            page.border,
                                        }}
                                    >
                                        {image ? (
                                            <img
                                                src={
                                                    image
                                                }
                                                alt={
                                                    mediaItem?.title ||
                                                    item.title
                                                }
                                                style={{
                                                    display:
                                                        'block',
                                                    width: '100%',
                                                    height: '190px',
                                                    objectFit:
                                                        'cover',
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    minHeight:
                                                        '190px',
                                                    display:
                                                        'grid',
                                                    placeItems:
                                                        'center',
                                                    color:
                                                    accentColour,
                                                    background:
                                                        `radial-gradient(circle, ${accentColour}25, transparent 45%)`,
                                                    fontSize:
                                                        '0.78rem',
                                                    fontWeight: 900,
                                                    textTransform:
                                                        'uppercase',
                                                    letterSpacing:
                                                        '0.08em',
                                                    textAlign:
                                                        'center',
                                                    padding:
                                                        '1rem',
                                                }}
                                            >
                                                {
                                                    item.title
                                                }
                                            </div>
                                        )}

                                        <div
                                            style={{
                                                padding:
                                                    '1.15rem',
                                            }}
                                        >
                                            <h3
                                                style={{
                                                    margin:
                                                        '0 0 0.45rem',
                                                }}
                                            >
                                                {mediaItem?.title ||
                                                    item.title}
                                            </h3>

                                            <p
                                                style={{
                                                    margin: 0,
                                                    color:
                                                    page.muted,
                                                    fontSize:
                                                        '0.9rem',
                                                }}
                                            >
                                                {mediaItem?.description ||
                                                    item.text}
                                            </p>
                                        </div>
                                    </article>
                                )
                            },
                        )}
                    </div>
                </div>
            </section>

            <section
                id="news"
                style={{
                    padding: '4.5rem 0',
                    borderBottom:
                        `1px solid ${accentColour}25`,
                }}
            >
                <div
                    style={{
                        width: page.width,
                        margin: '0 auto',
                    }}
                >
                    <h2
                        style={{
                            margin:
                                '0 0 0.75rem',
                            color:
                            accentColour,
                            fontSize:
                                'clamp(2rem, 4vw, 3rem)',
                        }}
                    >
                        Competition News
                    </h2>

                    <p
                        style={{
                            maxWidth: '850px',
                            margin:
                                '0 0 1.75rem',
                            color: page.muted,
                        }}
                    >
                        News, community stories, announcements and official competition updates.
                    </p>

                    {articles.length ? (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'repeat(auto-fit, minmax(230px, 1fr))',
                                gap: '1rem',
                            }}
                        >
                            {articles
                                .slice(0, 4)
                                .map(
                                    (article) => (
                                        <article
                                            key={
                                                article.id
                                            }
                                            style={{
                                                minHeight:
                                                    '290px',
                                                display:
                                                    'flex',
                                                flexDirection:
                                                    'column',
                                                padding:
                                                    '1.25rem',
                                                borderRadius:
                                                    '14px',
                                                background:
                                                page.card,
                                                border:
                                                page.border,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    display:
                                                        'inline-flex',
                                                    alignSelf:
                                                        'flex-start',
                                                    padding:
                                                        '0.3rem 0.55rem',
                                                    borderRadius:
                                                        '999px',
                                                    background:
                                                        `${accentColour}20`,
                                                    color:
                                                    accentColour,
                                                    fontSize:
                                                        '0.65rem',
                                                    fontWeight: 900,
                                                    textTransform:
                                                        'uppercase',
                                                }}
                                            >
                                                Published
                                            </span>

                                            <h3
                                                style={{
                                                    margin:
                                                        '1rem 0 0.65rem',
                                                }}
                                            >
                                                {article.title ||
                                                    'Competition update'}
                                            </h3>

                                            <p
                                                style={{
                                                    margin: 0,
                                                    color:
                                                    page.muted,
                                                    fontSize:
                                                        '0.9rem',
                                                    lineHeight: 1.6,
                                                }}
                                            >
                                                {article.excerpt ||
                                                    article.summary ||
                                                    'Read the latest update from the organiser.'}
                                            </p>

                                            <a
                                                href={`${basePath}/news`}
                                                style={{
                                                    marginTop:
                                                        'auto',
                                                    paddingTop:
                                                        '1rem',
                                                    color:
                                                    accentColour,
                                                    textDecoration:
                                                        'none',
                                                    fontSize:
                                                        '0.72rem',
                                                    fontWeight: 900,
                                                    textTransform:
                                                        'uppercase',
                                                }}
                                            >
                                                Read article →
                                            </a>
                                        </article>
                                    ),
                                )}
                        </div>
                    ) : (
                        <div
                            style={{
                                padding:
                                    '1.6rem',
                                textAlign:
                                    'center',
                                borderRadius:
                                    '13px',
                                border:
                                    `1px dashed ${accentColour}70`,
                                color:
                                page.muted,
                            }}
                        >
                            Published news and articles will appear here.
                        </div>
                    )}
                </div>
            </section>

            <section
                id="sponsors"
                style={{
                    padding: '4.5rem 0',
                    borderBottom:
                        `1px solid ${accentColour}25`,
                }}
            >
                <div
                    style={{
                        width: page.width,
                        margin: '0 auto',
                    }}
                >
                    <h2
                        style={{
                            margin:
                                '0 0 0.75rem',
                            color:
                            accentColour,
                            fontSize:
                                'clamp(2rem, 4vw, 3rem)',
                        }}
                    >
                        Competition Partners
                    </h2>

                    <p
                        style={{
                            maxWidth: '850px',
                            margin:
                                '0 0 1.75rem',
                            color: page.muted,
                        }}
                    >
                        Organisations supporting grassroots sport, community development and opportunities for participants.
                    </p>

                    {sponsors.length ? (
                        <div
                            style={{
                                display: 'flex',
                                alignItems:
                                    'stretch',
                                gap: '1rem',
                                flexWrap: 'wrap',
                            }}
                        >
                            {sponsors.map(
                                (sponsor) => (
                                    <a
                                        key={
                                            sponsor.id
                                        }
                                        href={
                                            sponsor.website_url ||
                                            `${basePath}/sponsors`
                                        }
                                        target={
                                            sponsor.website_url
                                                ? '_blank'
                                                : undefined
                                        }
                                        rel={
                                            sponsor.website_url
                                                ? 'noreferrer'
                                                : undefined
                                        }
                                        style={{
                                            width: '220px',
                                            minHeight:
                                                '140px',
                                            display:
                                                'grid',
                                            placeItems:
                                                'center',
                                            padding:
                                                '1.25rem',
                                            borderRadius:
                                                '14px',
                                            background:
                                            page.card,
                                            border:
                                            page.border,
                                            color:
                                            textColour,
                                            textDecoration:
                                                'none',
                                            textAlign:
                                                'center',
                                        }}
                                    >
                                        {sponsor.logo_url ? (
                                            <img
                                                src={
                                                    sponsor.logo_url
                                                }
                                                alt={
                                                    sponsor.name ||
                                                    'Sponsor'
                                                }
                                                style={{
                                                    maxWidth:
                                                        '165px',
                                                    maxHeight:
                                                        '82px',
                                                    objectFit:
                                                        'contain',
                                                }}
                                            />
                                        ) : (
                                            <strong>
                                                {
                                                    sponsor.name
                                                }
                                            </strong>
                                        )}
                                    </a>
                                ),
                            )}
                        </div>
                    ) : (
                        <article
                            style={{
                                maxWidth: '360px',
                                padding:
                                    '1.25rem',
                                borderRadius:
                                    '14px',
                                background:
                                page.card,
                                border:
                                page.border,
                            }}
                        >
                            <Handshake
                                size={26}
                                color={
                                    accentColour
                                }
                            />

                            <h3>
                                Partnership opportunities
                            </h3>

                            <p
                                style={{
                                    color:
                                    page.muted,
                                }}
                            >
                                Sponsor this competition and support its teams, players and community.
                            </p>

                            <a
                                href={`${basePath}/contact`}
                                style={{
                                    color:
                                    accentColour,
                                    fontWeight: 900,
                                    textDecoration:
                                        'none',
                                    fontSize:
                                        '0.75rem',
                                    textTransform:
                                        'uppercase',
                                }}
                            >
                                Become a partner
                            </a>
                        </article>
                    )}
                </div>
            </section>

            <section
                style={{
                    padding: '4.5rem 0',
                }}
            >
                <div
                    style={{
                        width: page.width,
                        margin: '0 auto',
                    }}
                >
                    <h2
                        style={{
                            margin:
                                '0 0 0.75rem',
                            color:
                            accentColour,
                            fontSize:
                                'clamp(2rem, 4vw, 3rem)',
                        }}
                    >
                        Competition Centre
                    </h2>

                    <p
                        style={{
                            maxWidth: '850px',
                            margin:
                                '0 0 1.75rem',
                            color: page.muted,
                        }}
                    >
                        Explore the connected areas of this TournamentHQ-powered public website.
                    </p>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(210px, 1fr))',
                            gap: '1rem',
                        }}
                    >
                        {ecosystem.map(
                            (item) => (
                                <a
                                    key={
                                        item.title
                                    }
                                    href={
                                        item.href
                                    }
                                    target={
                                        item.external
                                            ? '_blank'
                                            : undefined
                                    }
                                    rel={
                                        item.external
                                            ? 'noreferrer'
                                            : undefined
                                    }
                                    style={{
                                        minHeight:
                                            '180px',
                                        padding:
                                            '1.25rem',
                                        borderRadius:
                                            '14px',
                                        background:
                                        page.card,
                                        border:
                                        page.border,
                                        color:
                                        textColour,
                                        textDecoration:
                                            'none',
                                    }}
                                >
                                    <span
                                        style={{
                                            display:
                                                'inline-flex',
                                            padding:
                                                '0.3rem 0.55rem',
                                            borderRadius:
                                                '999px',
                                            background:
                                                `${accentColour}20`,
                                            color:
                                            accentColour,
                                            fontSize:
                                                '0.65rem',
                                            fontWeight: 900,
                                            textTransform:
                                                'uppercase',
                                        }}
                                    >
                                        TournamentHQ
                                    </span>

                                    <h3>
                                        {item.title}
                                    </h3>

                                    <p
                                        style={{
                                            color:
                                            page.muted,
                                            fontSize:
                                                '0.9rem',
                                        }}
                                    >
                                        {item.text}
                                    </p>
                                </a>
                            ),
                        )}
                    </div>
                </div>
            </section>
        </div>
    )
}