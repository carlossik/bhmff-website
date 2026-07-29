import {
    CalendarDays,
    Contact,
    Image,
    Newspaper,
    Shield,
    TableProperties,
    Trophy,
    Users,
} from 'lucide-react'

type PublicHomePageProps = {
    organisationName: string
    backgroundColour: string
    surfaceColour: string
    textColour: string
    accentColour: string
    accentTextColour: string
    basePath: string
}

const publicSections = [
    {
        path: 'competitions',
        title: 'Competitions',
        description:
            'View active leagues, cups and tournaments managed by this organisation.',
        icon: Trophy,
    },
    {
        path: 'fixtures',
        title: 'Upcoming Fixtures',
        description:
            'Follow upcoming matches, kick-off times and venues.',
        icon: CalendarDays,
    },
    {
        path: 'results',
        title: 'Latest Results',
        description:
            'See published match scores and recent results.',
        icon: Shield,
    },
    {
        path: 'tables',
        title: 'League Tables',
        description:
            'Track standings, points, form and competition positions.',
        icon: TableProperties,
    },
    {
        path: 'teams',
        title: 'Teams',
        description:
            'Explore participating clubs and teams.',
        icon: Users,
    },
    {
        path: 'news',
        title: 'Latest News',
        description:
            'Read announcements, tournament updates and match reports.',
        icon: Newspaper,
    },
    {
        path: 'sponsors',
        title: 'Sponsors',
        description:
            'Meet the partners supporting this organisation.',
        icon: Image,
    },
    {
        path: 'contact',
        title: 'Contact',
        description:
            'Contact the organisation for enquiries, registration and support.',
        icon: Contact,
    },
] as const

export function PublicHomePage({
                                   organisationName,
                                   backgroundColour,
                                   surfaceColour,
                                   textColour,
                                   accentColour,
                                   accentTextColour,
                                   basePath,
                               }: PublicHomePageProps) {
    return (
        <>
            <section
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderBottom:
                        `1px solid ${accentColour}20`,
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        width: '520px',
                        height: '520px',
                        top: '-240px',
                        right: '-180px',
                        borderRadius: '999px',
                        background: accentColour,
                        opacity: 0.08,
                        filter: 'blur(8px)',
                    }}
                />

                <div
                    style={{
                        width:
                            'min(1240px, calc(100% - 2rem))',
                        margin: '0 auto',
                        minHeight: '560px',
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(300px, 1fr))',
                        alignItems: 'center',
                        gap: '3rem',
                        padding: '5rem 0',
                        position: 'relative',
                    }}
                >
                    <div>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding:
                                    '0.55rem 0.9rem',
                                border:
                                    `1px solid ${accentColour}45`,
                                borderRadius: '999px',
                                color: accentColour,
                                background:
                                    `${accentColour}10`,
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                letterSpacing: '0.08em',
                                textTransform:
                                    'uppercase',
                            }}
                        >
                            <span
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius:
                                        '999px',
                                    background:
                                    accentColour,
                                }}
                            />
                            Official public site
                        </div>

                        <h1
                            style={{
                                margin:
                                    '1.5rem 0 1.25rem',
                                fontSize:
                                    'clamp(3rem, 8vw, 6.5rem)',
                                lineHeight: 0.95,
                                letterSpacing:
                                    '-0.055em',
                                maxWidth: '900px',
                            }}
                        >
                            {organisationName}
                        </h1>

                        <p
                            style={{
                                margin: 0,
                                maxWidth: '700px',
                                fontSize:
                                    'clamp(1rem, 2vw, 1.3rem)',
                                lineHeight: 1.7,
                                opacity: 0.74,
                            }}
                        >
                            Follow competitions, fixtures,
                            results, league tables, teams and
                            the latest news from{' '}
                            {organisationName}.
                        </p>

                        <div
                            style={{
                                display: 'flex',
                                gap: '0.75rem',
                                flexWrap: 'wrap',
                                marginTop: '2rem',
                            }}
                        >
                            <a
                                href={`${basePath}/fixtures`}
                                style={{
                                    display:
                                        'inline-flex',
                                    alignItems:
                                        'center',
                                    justifyContent:
                                        'center',
                                    minHeight: '50px',
                                    padding:
                                        '0.8rem 1.25rem',
                                    borderRadius:
                                        '12px',
                                    background:
                                    accentColour,
                                    color:
                                    accentTextColour,
                                    textDecoration:
                                        'none',
                                    fontWeight: 900,
                                }}
                            >
                                View fixtures
                            </a>

                            <a
                                href={`${basePath}/results`}
                                style={{
                                    display:
                                        'inline-flex',
                                    alignItems:
                                        'center',
                                    justifyContent:
                                        'center',
                                    minHeight: '50px',
                                    padding:
                                        '0.8rem 1.25rem',
                                    borderRadius:
                                        '12px',
                                    border:
                                        `1px solid ${accentColour}40`,
                                    color: textColour,
                                    textDecoration:
                                        'none',
                                    fontWeight: 800,
                                }}
                            >
                                Latest results
                            </a>
                        </div>
                    </div>

                    <div
                        style={{
                            background: surfaceColour,
                            border:
                                `1px solid ${accentColour}35`,
                            borderRadius: '28px',
                            padding: '1.5rem',
                            boxShadow:
                                '0 32px 80px rgba(0, 0, 0, 0.28)',
                        }}
                    >
                        <div
                            style={{
                                minHeight: '360px',
                                borderRadius: '20px',
                                padding: '2rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent:
                                    'space-between',
                                background:
                                    `linear-gradient(145deg, ${accentColour}20, ${backgroundColour})`,
                                border:
                                    `1px solid ${accentColour}30`,
                            }}
                        >
                            <div>
                                <p
                                    style={{
                                        margin: 0,
                                        color: accentColour,
                                        fontSize:
                                            '0.75rem',
                                        fontWeight: 900,
                                        textTransform:
                                            'uppercase',
                                        letterSpacing:
                                            '0.1em',
                                    }}
                                >
                                    Tournament centre
                                </p>

                                <h2
                                    style={{
                                        margin:
                                            '0.75rem 0 0',
                                        fontSize:
                                            'clamp(2rem, 5vw, 3.5rem)',
                                        lineHeight: 1,
                                    }}
                                >
                                    Everything in one place.
                                </h2>
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns:
                                        'repeat(2, minmax(0, 1fr))',
                                    gap: '0.75rem',
                                }}
                            >
                                {[
                                    'Fixtures',
                                    'Results',
                                    'Tables',
                                    'Teams',
                                ].map((item) => (
                                    <div
                                        key={item}
                                        style={{
                                            padding: '1rem',
                                            borderRadius:
                                                '14px',
                                            background:
                                            surfaceColour,
                                            border:
                                                `1px solid ${accentColour}20`,
                                            fontWeight: 800,
                                        }}
                                    >
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section
                style={{
                    width:
                        'min(1240px, calc(100% - 2rem))',
                    margin: '0 auto',
                    padding: '5rem 0',
                }}
            >
                <div style={{ marginBottom: '2rem' }}>
                    <p
                        style={{
                            margin: '0 0 0.6rem',
                            color: accentColour,
                            fontWeight: 900,
                            textTransform:
                                'uppercase',
                            letterSpacing: '0.1em',
                            fontSize: '0.8rem',
                        }}
                    >
                        Explore
                    </p>

                    <h2
                        style={{
                            margin: 0,
                            fontSize:
                                'clamp(2rem, 5vw, 3.5rem)',
                            lineHeight: 1.05,
                        }}
                    >
                        Organisation centre
                    </h2>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1rem',
                    }}
                >
                    {publicSections.map(
                        ({
                             path,
                             title,
                             description,
                             icon: Icon,
                         }) => (
                            <a
                                href={`${basePath}/${path}`}
                                key={path}
                                style={{
                                    minHeight: '230px',
                                    padding: '1.5rem',
                                    borderRadius: '20px',
                                    background:
                                    surfaceColour,
                                    border:
                                        `1px solid ${accentColour}25`,
                                    display: 'flex',
                                    flexDirection:
                                        'column',
                                    justifyContent:
                                        'space-between',
                                    color: textColour,
                                    textDecoration:
                                        'none',
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius:
                                                '14px',
                                            display: 'grid',
                                            placeItems:
                                                'center',
                                            background:
                                                `${accentColour}15`,
                                            color:
                                            accentColour,
                                        }}
                                    >
                                        <Icon size={23} />
                                    </div>

                                    <h3
                                        style={{
                                            margin:
                                                '1.25rem 0 0.7rem',
                                            fontSize:
                                                '1.3rem',
                                        }}
                                    >
                                        {title}
                                    </h3>

                                    <p
                                        style={{
                                            margin: 0,
                                            lineHeight: 1.65,
                                            opacity: 0.68,
                                        }}
                                    >
                                        {description}
                                    </p>
                                </div>

                                <span
                                    style={{
                                        marginTop: '1.5rem',
                                        color:
                                        accentColour,
                                        fontWeight: 800,
                                        fontSize:
                                            '0.8rem',
                                        textTransform:
                                            'uppercase',
                                        letterSpacing:
                                            '0.08em',
                                    }}
                                >
                                    View page
                                </span>
                            </a>
                        ),
                    )}
                </div>
            </section>
        </>
    )
}