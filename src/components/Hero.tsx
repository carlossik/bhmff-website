import {
    CalendarDays,
    Play,
} from 'lucide-react'
import {
    useEffect,
    useState,
} from 'react'
import { lastYearFinalVideo } from '../data/festivalData'
import { supabase } from '../lib/supabaseClient'

type HeroSponsor = {
    id: string
    name: string
    logo_url: string | null
    website_url: string | null
}

export function Hero() {
    const [sponsors, setSponsors] =
        useState<HeroSponsor[]>([])

    useEffect(() => {
        let isMounted = true

        async function loadHeroData() {
            try {
                const {
                    data: competition,
                    error: competitionError,
                } = await supabase
                    .from('competitions')
                    .select('id')
                    .eq('status', 'ACTIVE')
                    .order('created_at', {
                        ascending: false,
                    })
                    .limit(1)
                    .maybeSingle()

                if (competitionError) {
                    throw competitionError
                }

                if (!competition) {
                    return
                }

                const {
                    data: sponsorsData,
                    error: sponsorsError,
                } = await supabase
                    .from('sponsors')
                    .select(`
            id,
            name,
            logo_url,
            website_url
          `)
                    .eq(
                        'competition_id',
                        competition.id,
                    )
                    .eq('active', true)
                    .order('created_at', {
                        ascending: true,
                    })

                if (!isMounted) {
                    return
                }

                if (sponsorsError) {
                    console.error(
                        'Failed to load hero sponsors:',
                        sponsorsError,
                    )
                    return
                }

                setSponsors(
                    (sponsorsData ??
                        []) as HeroSponsor[],
                )
            } catch (error) {
                console.error(
                    'Failed to load hero overview:',
                    error,
                )
            }
        }

        void loadHeroData()

        return () => {
            isMounted = false
        }
    }, [])

    const overviewItems = [
        {
            label: 'Teams',
            value: '8',
        },
        {
            label: 'Expected Fixtures',
            value: '16',
        },
        {
            label: 'Venues',
            value: '4–5',
        },
        {
            label: 'Match Officials',
            value: 'Qualified',
        },
        {
            label: 'Format',
            value: 'Groups to Finals',
        },
    ]

    return (
        <section id="home" className="hero">
            <div className="container">
                <div
                    style={{
                        minHeight: '148px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.9rem',
                        marginBottom: '1rem',
                        padding: '1rem 1.25rem',
                        overflowX: 'auto',
                        borderRadius: '13px',
                        border:
                            '1px solid rgba(132, 204, 22, 0.24)',
                        background:
                            'rgba(7, 16, 6, 0.76)',
                    }}
                >
          <span
              style={{
                  flexShrink: 0,
                  color: '#b8ff7a',
                  fontSize: '0.66rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.13em',
              }}
          >
            Official Partners
          </span>

                    {sponsors.length > 0 ? (
                        sponsors.map((sponsor) => {
                            const content =
                                sponsor.logo_url ? (
                                    <img
                                        src={sponsor.logo_url}
                                        alt={sponsor.name}
                                        style={{
                                            display: 'block',
                                            width: '112px',
                                            height: '42px',
                                            objectFit: 'contain',
                                        }}
                                    />
                                ) : (
                                    <strong
                                        style={{
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        {sponsor.name}
                                    </strong>
                                )

                            return sponsor.website_url ? (
                                <a
                                    key={sponsor.id}
                                    href={sponsor.website_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        flexShrink: 0,
                                        minWidth: '130px',
                                        minHeight: '50px',
                                        display: 'grid',
                                        placeItems: 'center',
                                        padding: '0.3rem 0.6rem',
                                        borderRadius: '9px',
                                        border:
                                            '1px solid rgba(132, 204, 22, 0.2)',
                                        background:
                                            'rgba(255, 255, 255, 0.025)',
                                        color: 'inherit',
                                        textDecoration: 'none',
                                    }}
                                >
                                    {content}
                                </a>
                            ) : (
                                <div
                                    key={sponsor.id}
                                    style={{
                                        flexShrink: 0,
                                        minWidth: '130px',
                                        minHeight: '50px',
                                        display: 'grid',
                                        placeItems: 'center',
                                        padding: '0.3rem 0.6rem',
                                        borderRadius: '9px',
                                        border:
                                            '1px solid rgba(132, 204, 22, 0.2)',
                                        background:
                                            'rgba(255, 255, 255, 0.025)',
                                        textAlign: 'center',
                                    }}
                                >
                                    {content}
                                </div>
                            )
                        })
                    ) : (
                        <span
                            style={{
                                fontSize: '0.78rem',
                                opacity: 0.72,
                            }}
                        >
              Partnership opportunities are currently available.
            </span>
                    )}
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'minmax(250px, 0.75fr) minmax(0, 2.25fr)',
                        alignItems: 'stretch',
                        gap: '1rem',
                        marginBottom: '1rem',
                    }}
                >
                    <a
                        href="https://tournamenthq.co.uk"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Visit TournamentHQ"
                        style={{
                            display: 'grid',
                            placeItems: 'center',
                            minHeight: '148px',
                            padding: '1rem 1.25rem',
                            borderRadius: '16px',
                            border:
                                '1px solid rgba(132, 204, 22, 0.38)',
                            background:
                                'linear-gradient(145deg, rgba(16, 25, 15, 0.98), rgba(7, 16, 6, 0.98))',
                            boxShadow:
                                '0 20px 50px rgba(0, 0, 0, 0.24)',
                            textDecoration: 'none',
                        }}
                    >
                        <div
                            style={{
                                textAlign: 'center',
                            }}
                        >
                            <img
                                src="/assets/tournamenthq-logo.png"
                                alt="TournamentHQ"
                                style={{
                                    display: 'block',
                                    width: '235px',
                                    maxWidth: '100%',
                                    height: 'auto',
                                    maxHeight: '82px',
                                    objectFit: 'contain',
                                    margin: '0 auto',
                                }}
                            />

                            <span
                                style={{
                                    display: 'block',
                                    marginTop: '0.65rem',
                                    color: '#b8ff7a',
                                    fontSize: '0.7rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.14em',
                                }}
                            >
                Official Tournament Platform
              </span>
                        </div>
                    </a>

                    <div
                        style={{
                            minHeight: '148px',
                            padding: '0.9rem',
                            borderRadius: '16px',
                            border:
                                '1px solid rgba(132, 204, 22, 0.3)',
                            background:
                                'rgba(10, 20, 9, 0.82)',
                            overflow: 'hidden',
                        }}
                    >
                        <p
                            style={{
                                margin: '0 0 0.75rem',
                                color: '#b8ff7a',
                                fontSize: '0.68rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.14em',
                            }}
                        >
                            Tournament Overview
                        </p>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'repeat(5, minmax(0, 1fr))',
                                gap: '0.6rem',
                            }}
                        >
                            {overviewItems.map(
                                (item) => (
                                    <div
                                        key={item.label}
                                        style={{
                                            minWidth: 0,
                                            minHeight: '92px',
                                            display: 'grid',
                                            alignContent: 'center',
                                            justifyItems: 'center',
                                            padding: '0.65rem 0.45rem',
                                            borderRadius: '10px',
                                            border:
                                                '1px solid rgba(132, 204, 22, 0.24)',
                                            background:
                                                'rgba(132, 204, 22, 0.055)',
                                            textAlign: 'center',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <strong
                                            style={{
                                                display: 'block',
                                                maxWidth: '100%',
                                                color: '#b8ff7a',
                                                fontSize:
                                                    item.value.length > 10
                                                        ? '0.76rem'
                                                        : '1.35rem',
                                                lineHeight: 1.08,
                                                overflowWrap:
                                                    'anywhere',
                                            }}
                                        >
                                            {item.value}
                                        </strong>

                                        <span
                                            style={{
                                                display: 'block',
                                                maxWidth: '100%',
                                                marginTop: '0.45rem',
                                                fontSize: '0.58rem',
                                                fontWeight: 900,
                                                lineHeight: 1.25,
                                                textTransform:
                                                    'uppercase',
                                                letterSpacing:
                                                    '0.07em',
                                                opacity: 0.78,
                                                overflowWrap:
                                                    'anywhere',
                                            }}
                                        >
                      {item.label}
                    </span>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                </div>

                <style>
                    {`
            .bhmffHeroMainGrid {
              display: grid;
              grid-template-columns: minmax(0, 1fr) minmax(440px, 480px);
              align-items: center;
              gap: 2.5rem;
              width: 100%;
            }

            .bhmffHeroCopy {
              min-width: 0;
              max-width: 660px;
            }

            .hero .bhmffHeroTitle {
              margin: 1rem 0 1.2rem !important;
              max-width: 660px;
              font-size: clamp(2.55rem, 2.9vw, 3.4rem) !important;
              line-height: 0.96 !important;
              letter-spacing: -0.035em !important;
              text-transform: uppercase;
            }

            .hero .bhmffHeroTitleLine {
              display: block;
              white-space: nowrap;
            }

            .bhmffFeaturedMatch {
              width: 100%;
              max-width: 480px;
              justify-self: end;
            }

            @media (max-width: 1180px) {
              .bhmffHeroMainGrid {
                grid-template-columns: minmax(0, 1fr) 410px;
                gap: 2rem;
              }

              .hero .bhmffHeroTitle {
                font-size: clamp(2.35rem, 3vw, 3.05rem) !important;
              }
            }

            @media (max-width: 980px) {
              .bhmffHeroMainGrid {
                grid-template-columns: 1fr;
              }

              .bhmffHeroCopy {
                max-width: 100%;
                overflow: visible;
              }

              .bhmffFeaturedMatch {
                max-width: 100%;
                justify-self: stretch;
              }

              .hero .bhmffHeroTitle {
                max-width: 100%;
              }

              .hero .bhmffHeroTitleLine {
                white-space: normal;
              }
            }
          `}
                </style>

                <div className="bhmffHeroMainGrid">
                    <div className="heroCopy bhmffHeroCopy">
                        <p className="eyebrow">
                            OFFICIAL BLACK HISTORY MONTH FOOTBALL FESTIVAL WEBSITE
                        </p>

                        <h1 className="bhmffHeroTitle">
              <span className="bhmffHeroTitleLine">
                Black History Month
              </span>

                            <span className="bhmffHeroTitleLine">
                Football Festival
              </span>
                        </h1>

                        <div
                            className="powered"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                flexWrap: 'wrap',
                            }}
                        >
                            <span>Powered by</span>

                            <img
                                src="/assets/tournamenthq-logo.png"
                                alt="TournamentHQ"
                                style={{
                                    display: 'block',
                                    width: '220px',
                                    maxWidth: '100%',
                                    height: 'auto',
                                    maxHeight: '58px',
                                    objectFit: 'contain',
                                }}
                            />
                        </div>

                        <p
                            className="heroText"
                            style={{
                                maxWidth: '700px',
                                fontSize: '1.08rem',
                                lineHeight: 1.7,
                            }}
                        >
                            Experience a month of competitive grassroots football,
                            community celebration and professional media coverage as
                            clubs compete for Black History Month Football Festival glory
                            while inspiring the next generation of players.
                        </p>

                        <div className="ctaRow">
                            <a className="btn primary" href="#teams">
                                View Teams
                            </a>

                            <a className="btn secondary" href="#fixtures">
                                <CalendarDays size={18} />
                                Fixtures
                            </a>

                            <a className="btn secondary" href="#media">
                                <Play size={18} />
                                Watch Highlights
                            </a>

                            <a className="btn secondary" href="#sponsors">
                                Become a Sponsor
                            </a>
                        </div>
                    </div>

                    <div className="heroVideoCard premiumVideoCard bhmffFeaturedMatch">
                        <div className="featuredLabel">
                            Featured Match
                        </div>

                        <iframe
                            src={lastYearFinalVideo.embedUrl}
                            title={lastYearFinalVideo.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />

                        <div className="heroVideoMeta premiumVideoMeta">
              <span>
                Official Tournament Coverage
              </span>

                            <strong>
                                {lastYearFinalVideo.title}
                            </strong>

                            <p>
                                {lastYearFinalVideo.subtitle}
                            </p>
                        </div>

                        <a
                            className="watchLink"
                            href={lastYearFinalVideo.youtubeUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Watch on YouTube →
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}