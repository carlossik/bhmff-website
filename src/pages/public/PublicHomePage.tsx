import { useEffect, useMemo, useState } from 'react'
import {
    Calendar,
    Camera,
    Handshake,
    Scale,
    Shield,
    Trophy,
    UserCheck,
    Users,
} from 'lucide-react'

import type { Competition } from '../../types/competitionTypes'
import type {
    PublicArticle,
    PublicMediaItem,
    PublicSponsor,
} from '../../services/public/organisationPublicService'

import { supabase } from '../../lib/supabaseClient'
import { useOptionalPublicOrganisation } from '../../context/PublicOrganisationContext'
import { TournamentCountdown } from '../../components/public/TournamentCountdown'
import { Hero } from '../../components/Hero'
import { Section } from '../../components/Section'
import { ArticleCard } from '../../components/ArticleCard'
import { ArticlePage } from '../../components/ArticlePage'
import { usePublicArticles } from '../../hooks/usePublicArticles'
import {
    FixtureList,
    type PublicFixture,
} from '../../components/FixtureList'
import {
    ResultsList,
    type PublicResult,
} from '../../components/ResultsList'
import {
    PublicTeams,
    type PublicTeam,
} from '../../components/public/PublicTeams'
import { PublicGroupStandings } from '../../components/public/PublicGroupStandings'
import {
    GoldenBootTable,
    type PublicGoal,
} from '../../components/GoldenBootTable'
import { PublicSponsors } from '../../components/public/PublicSponsors'

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

function first<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null
    return Array.isArray(value) ? value[0] ?? null : value
}

function getPublicString(
    value: Record<string, unknown>,
    keys: string[],
) {
    for (const key of keys) {
        const candidate = value[key];

        if (
            typeof candidate === "string" &&
            candidate.trim()
        ) {
            return candidate.trim();
        }
    }

    return "";
}

function getPublicBoolean(
    value: Record<string, unknown>,
    keys: string[],
) {
    for (const key of keys) {
        const candidate = value[key];

        if (typeof candidate === "boolean") {
            return candidate;
        }
    }

    return false;
}

const benefits = [
    [
        'Competition Format',
        'The tournament begins with group-stage football, where every team plays every other team in their group once. Group winners and runners-up qualify for the semi-finals, with the winners progressing to the Championship Final.',
        Trophy,
    ],
    [
        'Tournament Rules',
        'Every fixture is played under the Laws of the Game and the published tournament regulations. Player eligibility, substitutions, disciplinary procedures, scheduling and competition decisions are applied consistently.',
        Scale,
    ],
    [
        'Match Officials',
        'Qualified referees and supporting match officials will be appointed to fixtures. Officials will record match reports, disciplinary incidents and key match events through TournamentHQ.',
        UserCheck,
    ],
    [
        'Respect & Code of Conduct',
        'We operate a zero-tolerance policy towards racism, discrimination, referee abuse, violence, intimidation and unsporting behaviour. Players, coaches and supporters must uphold the highest standards of respect.',
        Shield,
    ],
    [
        'Player Welfare',
        'Fixtures are scheduled to provide sensible recovery time, reduce unnecessary congestion and create the safest possible competitive environment for every player.',
        Calendar,
    ],
    [
        'Professional Media Coverage',
        'Match filming, highlights, interviews, reports and digital storytelling will showcase players, clubs, partners and the wider community throughout the tournament.',
        Camera,
    ],
    [
        'Community Legacy',
        'The festival promotes education, Black History Month, community cohesion and opportunities for young people while building lasting relationships with businesses and public organisations.',
        Users,
    ],
    [
        'Partnership & Investment',
        'The tournament offers a credible platform for sponsors and strategic partners to support grassroots football, youth development, inclusion and measurable community impact.',
        Handshake,
    ],
] as const

const timeline = [
    [
        'Group Stage',
        'Opening Fixtures',
        'Teams begin their group-stage campaigns, with each side playing every other team in its group once.',
    ],
    [
        'Group Stage',
        'Qualification Decided',
        'The remaining group fixtures determine the group winners and runners-up who progress to the semi-finals.',
    ],
    [
        'Semi Finals',
        'Final Places at Stake',
        'The four qualifying teams compete in two semi-finals, with both winners progressing to the Championship Final.',
    ],
    [
        'Finals',
        'Final & Third-Place Match',
        'The semi-final winners compete for the Black History Month Football Festival title, while the remaining teams contest the third-place match before presentations and awards.',
    ],
] as const

const genericBenefits = [
    [
        'Competition Format',
        'Competition stages, team eligibility and progression are managed through TournamentHQ and published by the organiser.',
        Trophy,
    ],
    [
        'Competition Rules',
        'Fixtures are played under the organiser’s published regulations, player eligibility requirements and applicable governing-body rules.',
        Scale,
    ],
    [
        'Match Officials',
        'Referees and supporting officials can be assigned to fixtures, with availability and match responsibilities managed centrally.',
        UserCheck,
    ],
    [
        'Respect & Conduct',
        'Players, coaches, officials and supporters are expected to uphold high standards of respect, safety and sporting behaviour.',
        Shield,
    ],
    [
        'Player Welfare',
        'Scheduling, venues and recovery periods can be managed to support a safe and well-organised competition experience.',
        Calendar,
    ],
    [
        'Media & Updates',
        'Published news, match coverage, highlights and organiser updates appear on this official competition website.',
        Camera,
    ],
    [
        'Community',
        'The competition provides a platform for teams, participants, families and local communities to connect through sport.',
        Users,
    ],
    [
        'Partners',
        'Sponsors and strategic partners can support the competition and gain visibility through its official public platform.',
        Handshake,
    ],
] as const

const genericTimeline = [
    [
        'Setup',
        'Competition Preparation',
        'The organiser confirms participating teams, venues, regulations and the competition schedule.',
    ],
    [
        'Fixtures',
        'Competition Begins',
        'Published fixtures, kick-off times and venues become available to teams and supporters.',
    ],
    [
        'Results',
        'Competition Progress',
        'Confirmed results, tables and statistics update as matches are completed and published.',
    ],
    [
        'Completion',
        'Awards & Recognition',
        'The competition concludes with final standings, awards and official organiser updates.',
    ],
] as const

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
                                   media = [],
                               }: PublicHomePageProps) {
    const publicOrganisation = useOptionalPublicOrganisation()
    const organisationId = publicOrganisation?.organisationId ?? null

    const isBhmff =
        basePath.toLowerCase() ===
        '/o/bhmff'

    const primaryCompetition =
        competitions[0] as
            | (Competition &
            Record<string, unknown>)
            | undefined

    const competitionName =
        primaryCompetition &&
        typeof primaryCompetition.name ===
        'string' &&
        primaryCompetition.name.trim()
            ? primaryCompetition.name.trim()
            : organisationName

    const competitionDescription =
        primaryCompetition &&
        typeof primaryCompetition.description ===
        'string' &&
        primaryCompetition.description.trim()
            ? primaryCompetition.description.trim()
            : `Welcome to the official ${organisationName} competition website. Follow teams, fixtures, results, tables, news and media as they are published.`

    const competitionStartDate =
        primaryCompetition &&
        typeof primaryCompetition.start_date ===
        'string'
            ? primaryCompetition.start_date
            : null

    const genericFeaturedMedia =
        media.find((item) =>
            getPublicBoolean(item, [
                'featured',
            ]),
        ) ?? media[0]

    const {
        articles: publicArticles,
        loading: articlesLoading,
        error: articlesError,
    } = usePublicArticles()

    const [activeArticleId, setActiveArticleId] =
        useState<string | null>(null)

    const activeArticle = useMemo(
        () =>
            publicArticles.find(
                (article) =>
                    article.id === activeArticleId,
            ),
        [activeArticleId, publicArticles],
    )
    const [publicTeams, setPublicTeams] = useState<PublicTeam[]>([])
    const [publicFixtures, setPublicFixtures] = useState<PublicFixture[]>([])
    const [publicResults, setPublicResults] = useState<PublicResult[]>([])
    const [publicGoals, setPublicGoals] = useState<PublicGoal[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let disposed = false

        async function loadHomepageData() {
            if (!organisationId) {
                setLoading(false)
                return
            }

            setLoading(true)

            const { data: competition, error: competitionError } =
                await supabase
                    .from('competitions')
                    .select('id')
                    .eq('organisation_id', organisationId)
                    .eq('status', 'ACTIVE')
                    .eq('published', true)
                    .order('start_date', {
                        ascending: false,
                        nullsFirst: false,
                    })
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

            if (disposed) return

            if (competitionError || !competition) {
                if (competitionError) {
                    console.error(
                        'Failed to load public competition:',
                        competitionError,
                    )
                }

                setPublicTeams([])
                setPublicFixtures([])
                setPublicResults([])
                setPublicGoals([])
                setLoading(false)
                return
            }

            const [teamsResponse, fixturesResponse, resultsResponse] =
                await Promise.all([
                    supabase
                        .from('competition_teams')
                        .select(`
                            id,
                            team_id,
                            team:teams!competition_teams_team_id_fkey (
                                id,
                                name,
                                manager_name,
                                logo_url,
                                published,
                                participation_status
                            )
                        `)
                        .eq('competition_id', competition.id)
                        .order('team_id', { ascending: true }),

                    supabase
                        .from('fixtures')
                        .select(`
                            id,
                            stage,
                            kickoff_time,
                            status,
                            home_competition_team:competition_teams!fixtures_home_competition_team_fkey (
                                id,
                                team_id,
                                team:teams!competition_teams_team_id_fkey (
                                    id,
                                    name
                                )
                            ),
                            away_competition_team:competition_teams!fixtures_away_competition_team_fkey (
                                id,
                                team_id,
                                team:teams!competition_teams_team_id_fkey (
                                    id,
                                    name
                                )
                            ),
                            venue:venues!fixtures_venue_id_fkey (
                                name,
                                address,
                                postcode,
                                notes
                            )
                        `)
                        .eq('competition_id', competition.id)
                        .neq('status', 'cancelled')
                        .order('kickoff_time', {
                            ascending: true,
                            nullsFirst: false,
                        }),

                    supabase
                        .from('results')
                        .select(`
                            id,
                            fixture_id,
                            home_score,
                            away_score,
                            player_of_match,
                            match_report,
                            fixture:fixtures!results_fixture_id_fkey!inner (
                                id,
                                competition_id,
                                stage,
                                kickoff_time,
                                home_competition_team:competition_teams!fixtures_home_competition_team_fkey (
                                    id,
                                    team_id,
                                    team:teams!competition_teams_team_id_fkey (
                                        id,
                                        name
                                    )
                                ),
                                away_competition_team:competition_teams!fixtures_away_competition_team_fkey (
                                    id,
                                    team_id,
                                    team:teams!competition_teams_team_id_fkey (
                                        id,
                                        name
                                    )
                                )
                            )
                        `)
                        .eq('published', true)
                        .eq('fixture.competition_id', competition.id),
                ])

            if (disposed) return

            if (teamsResponse.error) {
                console.error(
                    'Failed to load public teams:',
                    teamsResponse.error,
                )
                setPublicTeams([])
            } else {
                const mappedTeams = (teamsResponse.data ?? [])
                    .map((row: any) => {
                        const team = first(row.team)

                        if (
                            !team ||
                            !team.published ||
                            team.participation_status !== 'confirmed'
                        ) {
                            return null
                        }

                        return {
                            id: team.id,
                            name: team.name,
                            manager_name: team.manager_name,
                            logo_url: team.logo_url,
                        }
                    })
                    .filter((team): team is PublicTeam => team !== null)
                    .sort((firstTeam, secondTeam) =>
                        firstTeam.name.localeCompare(secondTeam.name),
                    )

                setPublicTeams(mappedTeams)
            }

            if (fixturesResponse.error) {
                console.error(
                    'Failed to load public fixtures:',
                    fixturesResponse.error,
                )
                setPublicFixtures([])
            } else {
                setPublicFixtures(
                    (fixturesResponse.data ?? []).map((fixture: any) => {
                        const homeCompetitionTeam = first(
                            fixture.home_competition_team,
                        )
                        const awayCompetitionTeam = first(
                            fixture.away_competition_team,
                        )
                        const homeTeam = first(homeCompetitionTeam?.team)
                        const awayTeam = first(awayCompetitionTeam?.team)
                        const venue = first(fixture.venue)

                        return {
                            id: fixture.id,
                            stage: fixture.stage,
                            kickoffTime: fixture.kickoff_time,
                            status: fixture.status ?? 'scheduled',
                            homeTeam: homeTeam?.name?.trim() ?? 'Home team TBC',
                            awayTeam: awayTeam?.name?.trim() ?? 'Away team TBC',
                            venueName: venue?.name ?? 'Venue to be confirmed',
                            venueAddress: venue?.address ?? '',
                            venuePostcode: venue?.postcode ?? '',
                            venueNotes: venue?.notes ?? '',
                        }
                    }),
                )
            }

            let mappedResults: PublicResult[] = []

            if (resultsResponse.error) {
                console.error(
                    'Failed to load public results:',
                    resultsResponse.error,
                )
                setPublicResults([])
            } else {
                mappedResults = (resultsResponse.data ?? [])
                    .map((result: any) => {
                        const fixture = first(result.fixture)
                        if (!fixture) return null

                        const homeCompetitionTeam = first(
                            fixture.home_competition_team,
                        )
                        const awayCompetitionTeam = first(
                            fixture.away_competition_team,
                        )
                        const homeTeam = first(homeCompetitionTeam?.team)
                        const awayTeam = first(awayCompetitionTeam?.team)

                        if (!homeTeam || !awayTeam) return null

                        return {
                            id: result.id,
                            fixtureId: result.fixture_id,
                            stage: fixture.stage,
                            kickoffTime: fixture.kickoff_time,
                            homeTeamId: homeTeam.id,
                            awayTeamId: awayTeam.id,
                            homeTeam: homeTeam.name.trim(),
                            awayTeam: awayTeam.name.trim(),
                            homeScore: result.home_score,
                            awayScore: result.away_score,
                            playerOfMatch: result.player_of_match ?? '',
                            matchReport: result.match_report ?? '',
                        }
                    })
                    .filter((result): result is PublicResult => result !== null)

                setPublicResults(mappedResults)
            }

            const fixtureIds = mappedResults.map((result) => result.fixtureId)

            if (!fixtureIds.length) {
                setPublicGoals([])
                setLoading(false)
                return
            }

            const { data: goalsData, error: goalsError } = await supabase
                .from('goals')
                .select(`
                    id,
                    fixture_id,
                    player_name,
                    minute,
                    video_timestamp,
                    team:teams!goals_team_id_fkey (
                        id,
                        name,
                        logo_url
                    )
                `)
                .in('fixture_id', fixtureIds)
                .order('created_at', { ascending: true })

            if (disposed) return

            if (goalsError) {
                console.error('Failed to load public goals:', goalsError)
                setPublicGoals([])
            } else {
                setPublicGoals(
                    (goalsData ?? [])
                        .map((goal: any) => {
                            const team = first(goal.team)
                            if (!team || !goal.fixture_id) return null

                            return {
                                id: goal.id,
                                fixtureId: goal.fixture_id,
                                teamId: team.id,
                                teamName: team.name.trim(),
                                teamLogoUrl: team.logo_url ?? '',
                                playerName: goal.player_name.trim(),
                                minute: goal.minute,
                                videoTimestamp: goal.video_timestamp ?? '',
                            }
                        })
                        .filter((goal): goal is PublicGoal => goal !== null),
                )
            }

            setLoading(false)
        }

        void loadHomepageData()

        return () => {
            disposed = true
        }
    }, [organisationId])

    const displayedBenefits =
        isBhmff
            ? benefits
            : genericBenefits

    const displayedTimeline =
        isBhmff
            ? timeline
            : genericTimeline

    const genericArticleTitle =
        'News & Updates'

    const genericArticleIntro =
        `Latest news, announcements and community updates from ${organisationName}.`

    const genericSponsorTitle =
        'Competition Partners'

    const genericSponsorIntro =
        `Organisations supporting ${organisationName}, its teams and participants.`

    if (activeArticle && isBhmff) {
        return (
            <ArticlePage
                article={activeArticle}
                onBack={() =>
                    setActiveArticleId(null)
                }
            />
        )
    }

    return (
        <>
            {isBhmff ? (
                <>
                    <TournamentCountdown />
                    <Hero />
                </>
            ) : (
                <>
                    {competitionStartDate && (
                        <section
                            className="border-b py-10 text-center"
                            style={{
                                background: `linear-gradient(90deg, ${accentColour}18, ${accentColour}30, ${accentColour}18)`,
                                borderColor: `${accentColour}35`,
                            }}
                        >
                            <p
                                className="text-xs font-black uppercase tracking-[0.2em]"
                                style={{ color: accentColour }}
                            >
                                Upcoming competition
                            </p>
                            <h2 className="mt-3 text-3xl font-black uppercase sm:text-5xl">
                                {competitionName}
                            </h2>
                            <p className="mt-3 text-sm opacity-75">
                                Starts {new Intl.DateTimeFormat('en-GB', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            }).format(new Date(competitionStartDate))}
                            </p>
                        </section>
                    )}

                    <section
                        className="border-b py-16 sm:py-24"
                        style={{
                            background: `radial-gradient(circle at 78% 30%, ${accentColour}20, transparent 30%), ${backgroundColour}`,
                            borderColor: `${accentColour}25`,
                        }}
                    >
                        <div className="mx-auto grid w-[min(1180px,calc(100%-2rem))] items-center gap-10 lg:grid-cols-2">
                            <div>
                                <p
                                    className="text-xs font-black uppercase tracking-[0.2em]"
                                    style={{ color: accentColour }}
                                >
                                    Official competition website
                                </p>
                                <h1 className="mt-4 text-5xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-7xl">
                                    {organisationName}
                                </h1>
                                <p
                                    className="mt-4 text-xs font-black uppercase tracking-[0.2em]"
                                    style={{ color: accentColour }}
                                >
                                    Powered by TournamentHQ
                                </p>
                                <p className="mt-6 max-w-2xl text-base leading-7 opacity-75 sm:text-lg">
                                    {competitionDescription}
                                </p>
                                <div className="mt-7 flex flex-wrap gap-3">
                                    <a
                                        href={`${basePath}#teams`}
                                        className="rounded-xl px-5 py-3 text-sm font-black uppercase no-underline"
                                        style={{
                                            background: accentColour,
                                            color: accentTextColour,
                                        }}
                                    >
                                        View Teams
                                    </a>
                                    <a
                                        href={`${basePath}#fixtures`}
                                        className="rounded-xl border px-5 py-3 text-sm font-black uppercase no-underline"
                                        style={{
                                            borderColor: `${accentColour}55`,
                                            color: textColour,
                                        }}
                                    >
                                        Fixtures
                                    </a>
                                </div>
                            </div>

                            <article
                                className="overflow-hidden rounded-2xl border p-3"
                                style={{
                                    background: surfaceColour,
                                    borderColor: `${accentColour}35`,
                                }}
                            >
                                {genericFeaturedMedia &&
                                getPublicString(genericFeaturedMedia, ['embed_url']) ? (
                                    <iframe
                                        className="aspect-video w-full rounded-xl"
                                        src={getPublicString(genericFeaturedMedia, ['embed_url'])}
                                        title={getPublicString(genericFeaturedMedia, ['title']) || `${organisationName} featured media`}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : genericFeaturedMedia &&
                                getPublicString(genericFeaturedMedia, ['thumbnail_url', 'image_url']) ? (
                                    <img
                                        className="aspect-video w-full rounded-xl object-cover"
                                        src={getPublicString(genericFeaturedMedia, ['thumbnail_url', 'image_url'])}
                                        alt={getPublicString(genericFeaturedMedia, ['title']) || `${organisationName} featured media`}
                                    />
                                ) : (
                                    <div
                                        className="grid aspect-video place-items-center rounded-xl border text-center"
                                        style={{ borderColor: `${accentColour}25` }}
                                    >
                                        <div>
                                            <Camera
                                                className="mx-auto"
                                                style={{ color: accentColour }}
                                            />
                                            <p className="mt-3 font-bold">
                                                Published competition media will appear here.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </article>
                        </div>
                    </section>
                </>
            )}

            <Section
                id="festival"
                title={
                    isBhmff
                        ? 'Tournament Standards & Governance'
                        : 'Competition Standards & Governance'
                }
                intro={
                    isBhmff
                        ? 'A professionally organised tournament with a clear competitive pathway, qualified match officials, strong safeguarding standards, zero tolerance for discrimination and a platform designed to attract credible partners and long-term investment.'
                        : `Key standards, operating principles and participant expectations for ${organisationName}.`
                }
            >
                <div className="cardGrid four tournamentStandardsGrid">
                    {displayedBenefits.map(([title, text, Icon]) => (
                        <article className="card" key={title}>
                            <Icon className="icon" />
                            <h3>{title}</h3>
                            <p>{text}</p>
                        </article>
                    ))}
                </div>
            </Section>

            <Section
                id="fixtures"
                title={
                    isBhmff
                        ? 'Tournament Pathway'
                        : 'Competition Journey'
                }
                intro={
                    isBhmff
                        ? 'The competition progresses from a single round-robin group stage to the semi-finals, followed by the final and third-place match, with fixtures scheduled to give every game proper focus.'
                        : `Follow the setup, fixtures, results and completion of ${competitionName}.`
                }
            >
                <div className="timeline">
                    {displayedTimeline.map(([stage, title, detail]) => (
                        <article
                            className="timelineItem"
                            key={`${stage}-${title}`}
                        >
                            <div className="timelineIcon">
                                <span>{stage}</span>
                            </div>

                            <div className="timelineContent">
                                <h3>{title}</h3>
                                <p>{detail}</p>
                            </div>
                        </article>
                    ))}
                </div>

                <h3 className="subheading">Confirmed Fixtures</h3>

                {loading ? (
                    <p className="muted">Loading fixtures...</p>
                ) : (
                    <FixtureList fixtures={publicFixtures} />
                )}
            </Section>

            <Section
                id="results"
                title="Latest Results"
                intro={`Confirmed and published match results from ${organisationName}.`}
            >
                <ResultsList results={publicResults} />
            </Section>

            <Section
                id="teams"
                title="Teams & Group Standings"
                intro="Meet the confirmed participating clubs and follow live group tables calculated automatically from published group-stage results."
            >
                <PublicTeams teams={publicTeams} />
                {isBhmff ? (
                    <PublicGroupStandings />
                ) : (
                    <div className="teamsEmptyState">
                        <h3>Competition tables</h3>
                        <p>
                            Published standings will appear when results are available.
                        </p>
                    </div>
                )}
            </Section>

            <Section
                id="statistics"
                title="Statistics Centre"
                intro="Official tournament statistics calculated from published match data."
            >
                <h3 className="subheading">Top Scorers</h3>

                <p
                    style={{
                        marginTop: '-0.35rem',
                        marginBottom: '1.25rem',
                        opacity: 0.78,
                    }}
                >
                    Live goalscoring leaderboard from confirmed tournament
                    matches. The leading scorer at the end of the competition
                    will receive the Golden Boot Award.
                </p>

                <GoldenBootTable goals={publicGoals} />
            </Section>

            <Section
                id="media"
                title="Official Media Coverage"
                intro="Featured matches are professionally filmed, with highlights, interviews and exclusive coverage presented through the official TournamentHQ-powered competition website."
            >
                {media.length ? (
                    <div className="cardGrid three">
                        {media.map((item) => (
                            <article
                                className={`videoCard ${
                                    getPublicBoolean(item, ['featured']) ? 'featuredVideo' : ''
                                }`}
                                key={item.id}
                            >
                                {getPublicString(item, ['embed_url']) ? (
                                    <iframe
                                        className="mediaIframe"
                                        src={getPublicString(item, ['embed_url'])}
                                        title={getPublicString(item, ['title']) || 'Competition media'}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : getPublicString(item, ['thumbnail_url', 'image_url']) ? (
                                    <img
                                        className="mediaIframe"
                                        src={getPublicString(item, ['thumbnail_url', 'image_url'])}
                                        alt={getPublicString(item, ['title']) || 'Competition media'}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="videoPlaceholder">
                                        {getPublicString(item, ['media_type', 'category']) || 'Media'}
                                    </div>
                                )}

                                <div className="articleAdminRecordBadges">
                                    <span className="badge">
                                        {getPublicString(item, ['media_type', 'category']) || 'Media'}
                                    </span>

                                    {getPublicBoolean(item, ['featured']) && (
                                        <span className="featuredBadge">
                                            Featured
                                        </span>
                                    )}
                                </div>

                                <h3>{getPublicString(item, ['title']) || 'Competition media'}</h3>
                                <p>
                                    {getPublicString(item, ['description']) ||
                                        'Official tournament media coverage.'}
                                </p>

                                {getPublicString(item, ['media_url', 'url', 'youtube_url']) && (
                                    <a
                                        className="btn secondary small"
                                        href={getPublicString(item, ['media_url', 'url', 'youtube_url'])}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Watch Media
                                    </a>
                                )}
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="teamsEmptyState">
                        <h3>Media coverage coming soon</h3>
                        <p>
                            Published highlights, interviews and livestreams
                            will appear here.
                        </p>
                    </div>
                )}
            </Section>

            <Section
                id="history"
                title={
                    isBhmff
                        ? 'Black History Hub'
                        : genericArticleTitle
                }
                intro={
                    isBhmff
                        ? 'Connecting the football festival to Black History Month through articles, community stories and learning content.'
                        : genericArticleIntro
                }
            >
                {isBhmff ? (
                    <>
                        {articlesLoading && (
                            <p>Loading articles...</p>
                        )}

                        {articlesError && (
                            <p className="formError">
                                {articlesError}
                            </p>
                        )}

                        {!articlesLoading && (
                            <div className="cardGrid four">
                                {publicArticles.map(
                                    (article) => (
                                        <ArticleCard
                                            key={article.id}
                                            article={article}
                                            onRead={
                                                setActiveArticleId
                                            }
                                        />
                                    ),
                                )}
                            </div>
                        )}
                    </>
                ) : articles.length ? (
                    <div className="cardGrid four">
                        {articles.map((article) => {
                            const title =
                                getPublicString(article, ['title']) ||
                                'Competition update'
                            const summary =
                                getPublicString(article, ['summary', 'excerpt']) ||
                                'Read the latest update from the organiser.'
                            const category =
                                getPublicString(article, ['category']) ||
                                'News'
                            const image =
                                getPublicString(article, ['image_url', 'hero'])

                            return (
                                <article
                                    className="articleCard"
                                    key={article.id}
                                >
                                    {image && (
                                        <img
                                            src={image}
                                            alt={
                                                getPublicString(article, ['image_alt']) ||
                                                title
                                            }
                                            className="articleImage"
                                        />
                                    )}
                                    <span className="badge">
                                        {category}
                                    </span>
                                    <h3>{title}</h3>
                                    <p>{summary}</p>
                                    <a
                                        className="textButton"
                                        href={`${basePath}/news`}
                                    >
                                        Read article →
                                    </a>
                                </article>
                            )
                        })}
                    </div>
                ) : (
                    <div className="teamsEmptyState">
                        <h3>News coming soon</h3>
                        <p>
                            Published articles and organiser updates will appear here.
                        </p>
                    </div>
                )}
            </Section>

            <Section
                id="sponsors"
                title={
                    isBhmff
                        ? 'Festival Partners'
                        : genericSponsorTitle
                }
                intro={
                    isBhmff
                        ? 'The festival is supported by organisations committed to grassroots football, community development and creating opportunities for young people. Additional partners are welcome.'
                        : genericSponsorIntro
                }
            >
                <PublicSponsors />
            </Section>
        </>
    )
}