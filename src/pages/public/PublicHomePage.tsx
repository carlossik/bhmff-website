import { useEffect, useMemo, useState } from 'react'

import type { Competition } from '../../types/competitionTypes'
import type {
    PublicArticle,
    PublicMediaItem,
    PublicSponsor,
} from '../../services/public/organisationPublicService'
import type { PublicFixture } from '../../components/FixtureList'
import type { PublicResult } from '../../components/ResultsList'
import type { PublicTeam } from '../../components/public/PublicTeams'
import type { PublicGoal } from '../../components/GoldenBootTable'

import { supabase } from '../../lib/supabaseClient'
import { useOptionalPublicOrganisation } from '../../context/PublicOrganisationContext'
import { usePublicArticles } from '../../hooks/usePublicArticles'
import { ArticlePage } from '../../components/ArticlePage'
import { HeroSection } from '../../components/public/home/HeroSection'
import { CompetitionStandardsSection } from '../../components/public/home/CompetitionStandardsSection'
import { CompetitionJourneySection } from '../../components/public/home/CompetitionJourneySection'
import { ResultsSection } from '../../components/public/home/ResultsSection'
import { TeamsSection } from '../../components/public/home/TeamsSection'
import { StatisticsSection } from '../../components/public/home/StatisticsSection'
import { MediaSection } from '../../components/public/home/MediaSection'
import { ArticlesSection } from '../../components/public/home/ArticlesSection'
import { SponsorsSection } from '../../components/public/home/SponsorsSection'

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

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null
}

function firstRecord(value: unknown): UnknownRecord | null {
    if (Array.isArray(value)) {
        const firstValue = value[0]
        return isRecord(firstValue) ? firstValue : null
    }

    return isRecord(value) ? value : null
}

function getString(
    value: UnknownRecord | null,
    key: string,
): string {
    const candidate = value?.[key]
    return typeof candidate === 'string' ? candidate : ''
}

function getNullableString(
    value: UnknownRecord | null,
    key: string,
): string | null {
    const candidate = value?.[key]
    return typeof candidate === 'string' ? candidate : null
}

function getNumber(
    value: UnknownRecord | null,
    key: string,
): number | null {
    const candidate = value?.[key]
    return typeof candidate === 'number' ? candidate : null
}

function getBoolean(
    value: UnknownRecord | null,
    key: string,
): boolean {
    return value?.[key] === true
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
    media = [],
}: PublicHomePageProps) {
    const publicOrganisation = useOptionalPublicOrganisation()
    const organisationId = publicOrganisation?.organisationId ?? null
    const isBhmff = basePath.toLowerCase() === '/o/bhmff'

    const primaryCompetition = competitions[0]
    const competitionName =
        primaryCompetition?.name?.trim() || organisationName

    const {
        articles: publicArticles,
        loading: articlesLoading,
        error: articlesError,
    } = usePublicArticles()

    const [activeArticleId, setActiveArticleId] =
        useState<string | null>(null)
    const [publicTeams, setPublicTeams] = useState<PublicTeam[]>([])
    const [publicFixtures, setPublicFixtures] = useState<PublicFixture[]>([])
    const [publicResults, setPublicResults] = useState<PublicResult[]>([])
    const [publicGoals, setPublicGoals] = useState<PublicGoal[]>([])
    const [loading, setLoading] = useState(true)

    const activeArticle = useMemo(
        () =>
            publicArticles.find(
                (article) => article.id === activeArticleId,
            ),
        [activeArticleId, publicArticles],
    )

    useEffect(() => {
        let disposed = false

        async function loadHomepageData() {
            if (!organisationId) {
                if (!disposed) {
                    setPublicTeams([])
                    setPublicFixtures([])
                    setPublicResults([])
                    setPublicGoals([])
                    setLoading(false)
                }

                return
            }

            setLoading(true)

            const {
                data: competition,
                error: competitionError,
            } = await supabase
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

            if (disposed) {
                return
            }

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

            const [
                teamsResponse,
                fixturesResponse,
                resultsResponse,
            ] = await Promise.all([
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

            if (disposed) {
                return
            }

            if (teamsResponse.error) {
                console.error(
                    'Failed to load public teams:',
                    teamsResponse.error,
                )
                setPublicTeams([])
            } else {
                const mappedTeams = (teamsResponse.data ?? [])
                    .map((row): PublicTeam | null => {
                        const rowRecord = isRecord(row) ? row : null
                        const team = firstRecord(rowRecord?.team)

                        if (
                            !team ||
                            !getBoolean(team, 'published') ||
                            getString(team, 'participation_status') !==
                                'confirmed'
                        ) {
                            return null
                        }

                        const id = getString(team, 'id')
                        const name = getString(team, 'name').trim()

                        if (!id || !name) {
                            return null
                        }

                        return {
                            id,
                            name,
                            manager_name:
                                getNullableString(team, 'manager_name'),
                            logo_url: getNullableString(team, 'logo_url'),
                        }
                    })
                    .filter(
                        (team): team is PublicTeam => team !== null,
                    )
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
                const mappedFixtures = (fixturesResponse.data ?? [])
                    .map((fixture): PublicFixture | null => {
                        const fixtureRecord = isRecord(fixture)
                            ? fixture
                            : null

                        if (!fixtureRecord) {
                            return null
                        }

                        const homeCompetitionTeam = firstRecord(
                            fixtureRecord.home_competition_team,
                        )
                        const awayCompetitionTeam = firstRecord(
                            fixtureRecord.away_competition_team,
                        )
                        const homeTeam = firstRecord(
                            homeCompetitionTeam?.team,
                        )
                        const awayTeam = firstRecord(
                            awayCompetitionTeam?.team,
                        )
                        const venue = firstRecord(fixtureRecord.venue)
                        const id = getString(fixtureRecord, 'id')

                        if (!id) {
                            return null
                        }

                        return {
                            id,
                            stage: getString(
                                fixtureRecord,
                                'stage',
                            ),
                            kickoffTime: getString(
                                fixtureRecord,
                                'kickoff_time',
                            ),
                            status:
                                getString(fixtureRecord, 'status') ||
                                'scheduled',
                            homeTeam:
                                getString(homeTeam, 'name').trim() ||
                                'Home team TBC',
                            awayTeam:
                                getString(awayTeam, 'name').trim() ||
                                'Away team TBC',
                            venueName:
                                getString(venue, 'name') ||
                                'Venue to be confirmed',
                            venueAddress:
                                getString(venue, 'address'),
                            venuePostcode:
                                getString(venue, 'postcode'),
                            venueNotes:
                                getString(venue, 'notes'),
                        }
                    })
                    .filter(
                        (
                            fixture,
                        ): fixture is PublicFixture =>
                            fixture !== null,
                    )

                setPublicFixtures(mappedFixtures)
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
                    .map((result): PublicResult | null => {
                        const resultRecord = isRecord(result)
                            ? result
                            : null
                        const fixture = firstRecord(
                            resultRecord?.fixture,
                        )

                        if (!resultRecord || !fixture) {
                            return null
                        }

                        const homeCompetitionTeam = firstRecord(
                            fixture.home_competition_team,
                        )
                        const awayCompetitionTeam = firstRecord(
                            fixture.away_competition_team,
                        )
                        const homeTeam = firstRecord(
                            homeCompetitionTeam?.team,
                        )
                        const awayTeam = firstRecord(
                            awayCompetitionTeam?.team,
                        )

                        const id = getString(resultRecord, 'id')
                        const fixtureId = getString(
                            resultRecord,
                            'fixture_id',
                        )
                        const homeTeamId = getString(homeTeam, 'id')
                        const awayTeamId = getString(awayTeam, 'id')
                        const homeTeamName = getString(
                            homeTeam,
                            'name',
                        ).trim()
                        const awayTeamName = getString(
                            awayTeam,
                            'name',
                        ).trim()
                        const homeScore = getNumber(
                            resultRecord,
                            'home_score',
                        )
                        const awayScore = getNumber(
                            resultRecord,
                            'away_score',
                        )

                        if (
                            !id ||
                            !fixtureId ||
                            !homeTeamId ||
                            !awayTeamId ||
                            !homeTeamName ||
                            !awayTeamName ||
                            homeScore === null ||
                            awayScore === null
                        ) {
                            return null
                        }

                        return {
                            id,
                            fixtureId,
                            stage: getString(
                                fixture,
                                'stage',
                            ),
                            kickoffTime: getString(
                                fixture,
                                'kickoff_time',
                            ),
                            homeTeamId,
                            awayTeamId,
                            homeTeam: homeTeamName,
                            awayTeam: awayTeamName,
                            homeScore,
                            awayScore,
                            playerOfMatch:
                                getString(
                                    resultRecord,
                                    'player_of_match',
                                ),
                            matchReport:
                                getString(
                                    resultRecord,
                                    'match_report',
                                ),
                        }
                    })
                    .filter(
                        (
                            result,
                        ): result is PublicResult =>
                            result !== null,
                    )

                setPublicResults(mappedResults)
            }

            const fixtureIds = mappedResults.map(
                (result) => result.fixtureId,
            )

            if (fixtureIds.length === 0) {
                setPublicGoals([])
                setLoading(false)
                return
            }

            const {
                data: goalsData,
                error: goalsError,
            } = await supabase
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

            if (disposed) {
                return
            }

            if (goalsError) {
                console.error(
                    'Failed to load public goals:',
                    goalsError,
                )
                setPublicGoals([])
            } else {
                const mappedGoals = (goalsData ?? [])
                    .map((goal): PublicGoal | null => {
                        const goalRecord = isRecord(goal)
                            ? goal
                            : null
                        const team = firstRecord(goalRecord?.team)

                        if (!goalRecord || !team) {
                            return null
                        }

                        const id = getString(goalRecord, 'id')
                        const fixtureId = getString(
                            goalRecord,
                            'fixture_id',
                        )
                        const teamId = getString(team, 'id')
                        const teamName = getString(
                            team,
                            'name',
                        ).trim()
                        const playerName = getString(
                            goalRecord,
                            'player_name',
                        ).trim()
                        const minute = getNumber(
                            goalRecord,
                            'minute',
                        )

                        if (
                            !id ||
                            !fixtureId ||
                            !teamId ||
                            !teamName ||
                            !playerName ||
                            minute === null
                        ) {
                            return null
                        }

                        return {
                            id,
                            fixtureId,
                            teamId,
                            teamName,
                            teamLogoUrl:
                                getString(team, 'logo_url'),
                            playerName,
                            minute,
                            videoTimestamp:
                                getString(
                                    goalRecord,
                                    'video_timestamp',
                                ),
                        }
                    })
                    .filter(
                        (goal): goal is PublicGoal =>
                            goal !== null,
                    )

                setPublicGoals(mappedGoals)
            }

            setLoading(false)
        }

        void loadHomepageData()

        return () => {
            disposed = true
        }
    }, [organisationId])

    if (activeArticle && isBhmff) {
        return (
            <ArticlePage
                article={activeArticle}
                onBack={() => setActiveArticleId(null)}
            />
        )
    }

    return (
        <>
            <HeroSection
                organisationName={organisationName}
                backgroundColour={backgroundColour}
                surfaceColour={surfaceColour}
                textColour={textColour}
                accentColour={accentColour}
                accentTextColour={accentTextColour}
                basePath={basePath}
                competitions={competitions}
                media={media}
            />

            <CompetitionStandardsSection
                organisationName={organisationName}
                isBhmff={isBhmff}
                surfaceColour={surfaceColour}
                textColour={textColour}
                accentColour={accentColour}
            />

            <CompetitionJourneySection
                isBhmff={isBhmff}
                competitionName={competitionName}
                fixtures={publicFixtures}
                loading={loading}
                surfaceColour={surfaceColour}
                textColour={textColour}
                accentColour={accentColour}
            />

            <ResultsSection
                organisationName={organisationName}
                results={publicResults}
            />

            <TeamsSection
                isBhmff={isBhmff}
                teams={publicTeams}
                competitionId={
                    primaryCompetition?.id ?? null
                }
            />

            <StatisticsSection
                goals={publicGoals}
                organisationName={organisationName}
                isBhmff={isBhmff}
            />

            <MediaSection
                media={media}
                organisationName={organisationName}
                accentColour={accentColour}
                surfaceColour={surfaceColour}
                textColour={textColour}
            />

            <ArticlesSection
                isBhmff={isBhmff}
                organisationName={organisationName}
                basePath={basePath}
                articles={articles}
                publicArticles={publicArticles}
                articlesLoading={articlesLoading}
                articlesError={articlesError}
                onReadArticle={setActiveArticleId}
                surfaceColour={surfaceColour}
                textColour={textColour}
                accentColour={accentColour}
            />

            <SponsorsSection
                organisationName={organisationName}
                isBhmff={isBhmff}
            />
        </>
    )
}
