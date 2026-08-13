import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    CalendarDays,
    CircleDot,
    Clock3,
    MapPin,
    ShieldCheck,
    Target,
    Trophy,
    Users,
} from "lucide-react";

import {
    supabase,
} from "../../lib/supabaseClient";

import {
    useOptionalPublicOrganisation,
} from "../../context/PublicOrganisationContext";

import {
    usePublicArticles,
} from "../../hooks/usePublicArticles";

import {
    ArticlePage,
} from "../../components/ArticlePage";

import {
    MediaSection,
} from "../../components/public/home/MediaSection";

import {
    ArticlesSection,
} from "../../components/public/home/ArticlesSection";

import {
    SponsorsSection,
} from "../../components/public/home/SponsorsSection";

import type {
    PublicArticle,
    PublicMediaItem,
    PublicSponsor,
} from "../../services/public/organisationPublicService";

type Fixture = {
    id: string;
    fixture_date: string;
    kickoff_time: string | null;
    home_away: string;
    fixture_type: string;
    venue_name: string | null;
    opponent_id: string | null;
    club_opponents: {
        name: string;
    } | null;
};

type Result = {
    id: string;
    fixture_id: string;
    home_score: number;
    away_score: number;
    player_of_the_match: string | null;
};

type Squad = {
    id: string;
    squad_number: number | null;
    position: string | null;
    club_players: {
        first_name: string;
        last_name: string;
    } | null;
};

type Goal = {
    id: string;
    player_name: string;
    squad_member_id: string | null;
};

type SeasonRecord = {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
};

export type ClubPublicHomePageProps = {
    organisationName: string;
    backgroundColour: string;
    surfaceColour: string;
    textColour: string;
    accentColour: string;
    accentTextColour?: string;
    basePath?: string;
    articles?: PublicArticle[];
    media?: PublicMediaItem[];
    sponsors?: PublicSponsor[];
};

function formatDate(value: string) {
    const date =
        new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "en-GB",
        {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
        },
    ).format(date);
}

export function ClubPublicHomePage({
    organisationName,
    backgroundColour,
    surfaceColour,
    textColour,
    accentColour,
    accentTextColour = "#071006",
    basePath = "",
    articles = [],
    media = [],
}: ClubPublicHomePageProps) {
    const publicOrganisation =
        useOptionalPublicOrganisation();

    const organisationId =
        publicOrganisation?.organisationId ??
        null;

    const organisationLogoUrl =
        publicOrganisation?.organisation
            .logo_url ??
        null;

    const {
        articles: publicArticles,
        loading: articlesLoading,
        error: articlesError,
    } = usePublicArticles();

    const [
        activeArticleId,
        setActiveArticleId,
    ] =
        useState<string | null>(
            null,
        );

    const [
        seasonLabel,
        setSeasonLabel,
    ] =
        useState("");

    const [
        fixtures,
        setFixtures,
    ] =
        useState<Fixture[]>([]);

    const [
        results,
        setResults,
    ] =
        useState<Result[]>([]);

    const [
        squad,
        setSquad,
    ] =
        useState<Squad[]>([]);

    const [
        goals,
        setGoals,
    ] =
        useState<Goal[]>([]);

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState<string | null>(
            null,
        );

    const activeArticle =
        useMemo(
            () =>
                publicArticles.find(
                    (article) =>
                        article.id ===
                        activeArticleId,
                ) ?? null,
            [
                activeArticleId,
                publicArticles,
            ],
        );

    useEffect(() => {
        if (!organisationId) {
            setLoading(false);
            return;
        }

        let disposed =
            false;

        async function loadClubData() {
            setLoading(true);
            setErrorMessage(null);

            const {
                data: season,
                error: seasonError,
            } =
                await supabase
                    .from(
                        "club_seasons",
                    )
                    .select(
                        "id,name,season_label",
                    )
                    .eq(
                        "organisation_id",
                        organisationId,
                    )
                    .eq(
                        "status",
                        "active",
                    )
                    .order(
                        "start_date",
                        {
                            ascending: false,
                        },
                    )
                    .limit(1)
                    .maybeSingle();

            if (disposed) {
                return;
            }

            if (seasonError) {
                setErrorMessage(
                    seasonError.message,
                );
                setLoading(false);
                return;
            }

            if (!season) {
                setFixtures([]);
                setResults([]);
                setSquad([]);
                setGoals([]);
                setSeasonLabel("");
                setLoading(false);
                return;
            }

            setSeasonLabel(
                season.season_label ??
                    season.name ??
                    "",
            );

            const [
                fixtureResponse,
                resultResponse,
                squadResponse,
                goalResponse,
            ] =
                await Promise.all([
                    supabase
                        .from(
                            "club_fixtures",
                        )
                        .select(`
                            id,
                            fixture_date,
                            kickoff_time,
                            home_away,
                            fixture_type,
                            venue_name,
                            opponent_id,
                            club_opponents(name)
                        `)
                        .eq(
                            "organisation_id",
                            organisationId,
                        )
                        .eq(
                            "season_id",
                            season.id,
                        )
                        .eq(
                            "published",
                            true,
                        )
                        .order(
                            "fixture_date",
                            {
                                ascending:
                                    true,
                            },
                        ),
                    supabase
                        .from(
                            "club_results",
                        )
                        .select(`
                            id,
                            fixture_id,
                            home_score,
                            away_score,
                            player_of_the_match
                        `)
                        .eq(
                            "organisation_id",
                            organisationId,
                        )
                        .eq(
                            "season_id",
                            season.id,
                        )
                        .eq(
                            "published",
                            true,
                        ),
                    supabase
                        .from(
                            "club_squad_members",
                        )
                        .select(`
                            id,
                            squad_number,
                            position,
                            club_players(
                                first_name,
                                last_name
                            )
                        `)
                        .eq(
                            "organisation_id",
                            organisationId,
                        )
                        .eq(
                            "season_id",
                            season.id,
                        )
                        .eq(
                            "active",
                            true,
                        )
                        .order(
                            "squad_number",
                            {
                                ascending:
                                    true,
                                nullsFirst:
                                    false,
                            },
                        ),
                    supabase
                        .from(
                            "club_goals",
                        )
                        .select(
                            "id,player_name,squad_member_id",
                        )
                        .eq(
                            "organisation_id",
                            organisationId,
                        )
                        .eq(
                            "season_id",
                            season.id,
                        ),
                ]);

            if (disposed) {
                return;
            }

            const firstError =
                fixtureResponse.error ??
                resultResponse.error ??
                squadResponse.error ??
                goalResponse.error;

            if (firstError) {
                setErrorMessage(
                    firstError.message,
                );
            }

            setFixtures(
                (
                    fixtureResponse.data ??
                    []
                ) as unknown as Fixture[],
            );

            setResults(
                (
                    resultResponse.data ??
                    []
                ) as Result[],
            );

            setSquad(
                (
                    squadResponse.data ??
                    []
                ) as unknown as Squad[],
            );

            setGoals(
                (
                    goalResponse.data ??
                    []
                ) as Goal[],
            );

            setLoading(false);
        }

        void loadClubData();

        return () => {
            disposed = true;
        };
    }, [organisationId]);

    const today =
        new Date()
            .toISOString()
            .slice(0, 10);

    const fixtureById =
        useMemo(
            () =>
                new Map(
                    fixtures.map(
                        (fixture) => [
                            fixture.id,
                            fixture,
                        ],
                    ),
                ),
            [fixtures],
        );

    const nextFixture =
        useMemo(
            () =>
                fixtures.find(
                    (fixture) =>
                        fixture.fixture_date >=
                        today,
                ) ?? null,
            [
                fixtures,
                today,
            ],
        );

    const recentResults =
        useMemo(
            () =>
                [...results]
                    .sort(
                        (
                            left,
                            right,
                        ) => {
                            const leftDate =
                                fixtureById.get(
                                    left.fixture_id,
                                )
                                    ?.fixture_date ??
                                "";

                            const rightDate =
                                fixtureById.get(
                                    right.fixture_id,
                                )
                                    ?.fixture_date ??
                                "";

                            return rightDate.localeCompare(
                                leftDate,
                            );
                        },
                    )
                    .slice(
                        0,
                        5,
                    ),
            [
                fixtureById,
                results,
            ],
        );

    const topScorers =
        useMemo(() => {
            const totals =
                new Map<
                    string,
                    number
                >();

            goals.forEach(
                (goal) => {
                    totals.set(
                        goal.player_name,
                        (
                            totals.get(
                                goal.player_name,
                            ) ??
                            0
                        ) + 1,
                    );
                },
            );

            return [
                ...totals.entries(),
            ]
                .sort(
                    (
                        left,
                        right,
                    ) =>
                        right[1] -
                        left[1],
                )
                .slice(
                    0,
                    5,
                );
        }, [goals]);

    const seasonRecord =
        useMemo<SeasonRecord>(() => {
            const initial: SeasonRecord = {
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0,
            };

            return results.reduce(
                (
                    record,
                    result,
                ) => {
                    const fixture =
                        fixtureById.get(
                            result.fixture_id,
                        );

                    if (!fixture) {
                        return record;
                    }

                    const isAway =
                        fixture.home_away ===
                        "away";

                    const goalsFor =
                        isAway
                            ? result.away_score
                            : result.home_score;

                    const goalsAgainst =
                        isAway
                            ? result.home_score
                            : result.away_score;

                    record.played += 1;
                    record.goalsFor +=
                        goalsFor;
                    record.goalsAgainst +=
                        goalsAgainst;

                    if (
                        goalsFor >
                        goalsAgainst
                    ) {
                        record.won += 1;
                    } else if (
                        goalsFor <
                        goalsAgainst
                    ) {
                        record.lost += 1;
                    } else {
                        record.drawn += 1;
                    }

                    return record;
                },
                initial,
            );
        }, [
            fixtureById,
            results,
        ]);

    const getOpponentName = (
        fixture:
            | Fixture
            | null
            | undefined,
    ) =>
        fixture
            ?.club_opponents
            ?.name ??
        "TBC";

    const getFixtureTitle = (
        fixture: Fixture,
    ) => {
        const opponent =
            getOpponentName(
                fixture,
            );

        return fixture.home_away ===
            "away"
            ? `${opponent} vs ${organisationName}`
            : `${organisationName} vs ${opponent}`;
    };

    const cardStyle = {
        background:
            surfaceColour,
        borderColor:
            `${accentColour}35`,
    };

    if (activeArticle) {
        return (
            <ArticlePage
                article={
                    activeArticle
                }
                onBack={() =>
                    setActiveArticleId(
                        null,
                    )
                }
            />
        );
    }

    return (
        <>
            <div
                className="club-public-site"
                style={{
                    background:
                        backgroundColour,
                    color:
                        textColour,
                }}
            >
                <style>
                    {`
                        /*
                         * TournamentHQ public typography standard.
                         *
                         * The legacy public stylesheet contains global h1/h2 rules.
                         * These scoped rules intentionally mirror the mature BHMFF
                         * hierarchy and prevent those globals from inflating club pages.
                         */
                        .club-public-site .club-public-hero-title {
                            margin: 0.75rem 0 0 !important;
                            max-width: 660px;
                            font-size: clamp(2.55rem, 2.9vw, 3.4rem) !important;
                            font-weight: 800 !important;
                            line-height: 0.96 !important;
                            letter-spacing: -0.035em !important;
                            text-transform: uppercase;
                            overflow-wrap: anywhere;
                        }

                        .club-public-site .club-public-section-title {
                            margin: 0.2rem 0 0 !important;
                            font-size: clamp(2rem, 4vw, 3.1rem) !important;
                            font-weight: 700 !important;
                            line-height: 1.05 !important;
                            letter-spacing: -0.03em !important;
                        }

                        .club-public-site .club-public-card-title {
                            margin: 1rem 0 0 !important;
                            font-size: 1.25rem !important;
                            font-weight: 800 !important;
                            line-height: 1.25 !important;
                            letter-spacing: -0.015em !important;
                        }

                        .club-public-site .club-public-eyebrow {
                            font-size: 0.78rem !important;
                            font-weight: 900 !important;
                            line-height: 1.25 !important;
                            letter-spacing: 0.16em !important;
                            text-transform: uppercase;
                        }

                        .club-public-site .club-public-body {
                            font-size: 1rem !important;
                            line-height: 1.7 !important;
                        }

                        @media (max-width: 1180px) {
                            .club-public-site .club-public-hero-title {
                                font-size: clamp(2.35rem, 3vw, 3.05rem) !important;
                            }
                        }

                        @media (max-width: 720px) {
                            .club-public-site .club-public-hero-title {
                                font-size: clamp(2.15rem, 10vw, 2.75rem) !important;
                                line-height: 0.98 !important;
                            }

                            .club-public-site .club-public-section-title {
                                font-size: clamp(1.8rem, 8vw, 2.35rem) !important;
                            }
                        }
                    `}
                </style>
                <section className="mx-auto max-w-7xl px-5 pb-8 pt-10">
                    <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
                        <div
                            className="rounded-2xl border p-6 sm:p-8"
                            style={
                                cardStyle
                            }
                        >
                            <div className="flex items-center gap-5 sm:gap-6">
                                {organisationLogoUrl && (
                                    <div
                                        className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border p-2 sm:h-28 sm:w-28"
                                        style={{
                                            borderColor: `${accentColour}35`,
                                            background: `${backgroundColour}55`,
                                        }}
                                    >
                                        <img
                                            src={organisationLogoUrl}
                                            alt={`${organisationName} logo`}
                                            className="h-full w-full object-contain"
                                        />
                                    </div>
                                )}

                                <div className="min-w-0">
                                    <p
                                        className="club-public-eyebrow"
                                        style={{ color: accentColour }}
                                    >
                                        Official Club Website
                                    </p>

                                    <h1 className="club-public-hero-title">
                                        {organisationName}
                                    </h1>
                                </div>
                            </div>

                            <p className="club-public-body mt-4 max-w-2xl opacity-70">
                                Fixtures, results,
                                squad, player
                                statistics, news and
                                match media throughout
                                the season.
                            </p>

                            {seasonLabel && (
                                <span
                                    className="mt-5 inline-flex rounded-full px-3 py-1 text-xs font-bold"
                                    style={{
                                        background:
                                            `${accentColour}16`,
                                        color:
                                            accentColour,
                                    }}
                                >
                                    {
                                        seasonLabel
                                    }{" "}
                                    Season
                                </span>
                            )}
                        </div>

                        <div
                            className="rounded-2xl border p-5 sm:p-6"
                            style={
                                cardStyle
                            }
                        >
                            <p
                                className="club-public-eyebrow"
                                style={{
                                    color:
                                        accentColour,
                                }}
                            >
                                Next Fixture
                            </p>

                            {nextFixture ? (
                                <>
                                    <h2 className="club-public-card-title">
                                        {getFixtureTitle(
                                            nextFixture,
                                        )}
                                    </h2>

                                    <div className="mt-4 space-y-2 text-sm opacity-70">
                                        <p className="flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4" />
                                            {formatDate(
                                                nextFixture.fixture_date,
                                            )}
                                        </p>

                                        {nextFixture.kickoff_time && (
                                            <p className="flex items-center gap-2">
                                                <Clock3 className="h-4 w-4" />
                                                {nextFixture.kickoff_time.slice(
                                                    0,
                                                    5,
                                                )}
                                            </p>
                                        )}

                                        {nextFixture.venue_name && (
                                            <p className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                {
                                                    nextFixture.venue_name
                                                }
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <p className="mt-4 text-sm opacity-65">
                                    No upcoming
                                    published fixture.
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {errorMessage && (
                    <div className="mx-auto max-w-7xl px-5 pb-4">
                        <p className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm">
                            {
                                errorMessage
                            }
                        </p>
                    </div>
                )}

                <section
                    id="overview"
                    className="mx-auto max-w-7xl scroll-mt-28 px-5 py-7"
                >
                    <p
                        className="club-public-eyebrow"
                        style={{
                            color:
                                accentColour,
                        }}
                    >
                        Season Overview
                    </p>

                    <h2 className="club-public-section-title">
                        Club at a glance
                    </h2>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        {[
                            [
                                Trophy,
                                "Played",
                                seasonRecord.played,
                            ],
                            [
                                ShieldCheck,
                                "Won",
                                seasonRecord.won,
                            ],
                            [
                                CircleDot,
                                "Drawn",
                                seasonRecord.drawn,
                            ],
                            [
                                Target,
                                "Lost",
                                seasonRecord.lost,
                            ],
                            [
                                Target,
                                "Goals For",
                                seasonRecord.goalsFor,
                            ],
                            [
                                ShieldCheck,
                                "Goals Against",
                                seasonRecord.goalsAgainst,
                            ],
                        ].map(
                            ([
                                Icon,
                                label,
                                value,
                            ]) => {
                                const MetricIcon =
                                    Icon as typeof Trophy;

                                return (
                                    <article
                                        key={
                                            String(
                                                label,
                                            )
                                        }
                                        className="rounded-xl border p-4"
                                        style={
                                            cardStyle
                                        }
                                    >
                                        <MetricIcon className="h-4 w-4 opacity-60" />
                                        <strong className="mt-3 block text-2xl">
                                            {String(
                                                value,
                                            )}
                                        </strong>
                                        <span className="text-xs font-semibold opacity-60">
                                            {String(
                                                label,
                                            )}
                                        </span>
                                    </article>
                                );
                            },
                        )}
                    </div>
                </section>

                <section
                    id="fixtures"
                    className="mx-auto max-w-7xl scroll-mt-28 px-5 py-7"
                >
                    <p
                        className="club-public-eyebrow"
                        style={{
                            color:
                                accentColour,
                        }}
                    >
                        Match Centre
                    </p>

                    <h2 className="club-public-section-title">
                        Fixtures
                    </h2>

                    <div className="mt-4 space-y-3">
                        {fixtures
                            .slice(
                                0,
                                6,
                            )
                            .map(
                                (
                                    fixture,
                                ) => (
                                    <article
                                        key={
                                            fixture.id
                                        }
                                        className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                                        style={
                                            cardStyle
                                        }
                                    >
                                        <div>
                                            <p className="font-bold">
                                                {getFixtureTitle(
                                                    fixture,
                                                )}
                                            </p>

                                            <p className="mt-1 text-sm opacity-65">
                                                {formatDate(
                                                    fixture.fixture_date,
                                                )}
                                                {fixture.kickoff_time
                                                    ? ` · ${fixture.kickoff_time.slice(
                                                          0,
                                                          5,
                                                      )}`
                                                    : ""}
                                                {fixture.venue_name
                                                    ? ` · ${fixture.venue_name}`
                                                    : ""}
                                            </p>
                                        </div>

                                        <span
                                            className="w-fit rounded-full px-3 py-1 text-[11px] font-black uppercase"
                                            style={{
                                                background:
                                                    `${accentColour}15`,
                                                color:
                                                    accentColour,
                                            }}
                                        >
                                            {
                                                fixture.fixture_type
                                            }
                                        </span>
                                    </article>
                                ),
                            )}

                        {!loading &&
                            fixtures.length ===
                                0 && (
                                <p
                                    className="rounded-xl border p-5 text-sm opacity-65"
                                    style={
                                        cardStyle
                                    }
                                >
                                    No published
                                    fixtures yet.
                                </p>
                            )}
                    </div>
                </section>

                <section
                    id="results"
                    className="mx-auto max-w-7xl scroll-mt-28 px-5 py-7"
                >
                    <p
                        className="club-public-eyebrow"
                        style={{
                            color:
                                accentColour,
                        }}
                    >
                        Form & Results
                    </p>

                    <h2 className="club-public-section-title">
                        Recent Results
                    </h2>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {recentResults.map(
                            (result) => {
                                const fixture =
                                    fixtureById.get(
                                        result.fixture_id,
                                    );

                                return (
                                    <article
                                        key={
                                            result.id
                                        }
                                        className="rounded-xl border p-4"
                                        style={
                                            cardStyle
                                        }
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-bold">
                                                    {fixture
                                                        ? getFixtureTitle(
                                                              fixture,
                                                          )
                                                        : "Fixture"}
                                                </p>

                                                {fixture && (
                                                    <p className="mt-1 text-xs opacity-55">
                                                        {formatDate(
                                                            fixture.fixture_date,
                                                        )}
                                                    </p>
                                                )}
                                            </div>

                                            <strong className="text-xl">
                                                {
                                                    result.home_score
                                                }{" "}
                                                -{" "}
                                                {
                                                    result.away_score
                                                }
                                            </strong>
                                        </div>

                                        {result.player_of_the_match && (
                                            <p className="mt-3 text-xs opacity-65">
                                                Player of the
                                                match:{" "}
                                                <strong>
                                                    {
                                                        result.player_of_the_match
                                                    }
                                                </strong>
                                            </p>
                                        )}
                                    </article>
                                );
                            },
                        )}

                        {recentResults.length ===
                            0 && (
                            <p
                                className="rounded-xl border p-5 text-sm opacity-65 md:col-span-2"
                                style={
                                    cardStyle
                                }
                            >
                                No published results
                                yet.
                            </p>
                        )}
                    </div>
                </section>

                <section
                    id="squad"
                    className="mx-auto max-w-7xl scroll-mt-28 px-5 py-7"
                >
                    <p
                        className="club-public-eyebrow"
                        style={{
                            color:
                                accentColour,
                        }}
                    >
                        Players
                    </p>

                    <h2 className="club-public-section-title">
                        Squad
                    </h2>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {squad
                            .slice(
                                0,
                                12,
                            )
                            .map(
                                (
                                    player,
                                ) => (
                                    <article
                                        key={
                                            player.id
                                        }
                                        className="rounded-xl border p-4"
                                        style={
                                            cardStyle
                                        }
                                    >
                                        <span
                                            className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-black"
                                            style={{
                                                background:
                                                    `${accentColour}15`,
                                                color:
                                                    accentColour,
                                            }}
                                        >
                                            {player.squad_number ??
                                                "—"}
                                        </span>

                                        <p className="mt-3 font-bold">
                                            {player.club_players
                                                ? `${player.club_players.first_name} ${player.club_players.last_name}`
                                                : "Player"}
                                        </p>

                                        <p className="mt-1 text-xs opacity-60">
                                            {player.position ??
                                                "Squad member"}
                                        </p>
                                    </article>
                                ),
                            )}
                    </div>
                </section>

                <section
                    id="statistics"
                    className="mx-auto max-w-7xl scroll-mt-28 px-5 py-7"
                >
                    <p
                        className="club-public-eyebrow"
                        style={{
                            color:
                                accentColour,
                        }}
                    >
                        Player Statistics
                    </p>

                    <h2 className="club-public-section-title">
                        Top Scorers
                    </h2>

                    <div
                        className="mt-4 rounded-2xl border p-5"
                        style={
                            cardStyle
                        }
                    >
                        {topScorers.map(
                            (
                                [
                                    name,
                                    count,
                                ],
                                index,
                            ) => (
                                <div
                                    key={
                                        name
                                    }
                                    className="flex items-center justify-between border-b py-3 text-sm last:border-b-0"
                                    style={{
                                        borderColor:
                                            `${accentColour}18`,
                                    }}
                                >
                                    <span>
                                        {index +
                                            1}
                                        .{" "}
                                        {
                                            name
                                        }
                                    </span>
                                    <strong>
                                        {
                                            count
                                        }
                                    </strong>
                                </div>
                            ),
                        )}

                        {topScorers.length ===
                            0 && (
                            <p className="text-sm opacity-65">
                                No goals recorded yet.
                            </p>
                        )}
                    </div>
                </section>
            </div>

            {/*
                Deliberately reuse the exact same proven organisation
                public content components. No club-specific duplicates.
            */}
            <MediaSection
                media={media}
                organisationName={
                    organisationName
                }
                accentColour={
                    accentColour
                }
                surfaceColour={
                    surfaceColour
                }
                textColour={
                    textColour
                }
            />

            <ArticlesSection
                isBhmff={false}
                organisationName={
                    organisationName
                }
                basePath={
                    basePath
                }
                articles={
                    articles
                }
                publicArticles={
                    publicArticles
                }
                articlesLoading={
                    articlesLoading
                }
                articlesError={
                    articlesError
                }
                onReadArticle={
                    setActiveArticleId
                }
                surfaceColour={
                    surfaceColour
                }
                textColour={
                    textColour
                }
                accentColour={
                    accentColour
                }
            />

            <SponsorsSection
                organisationName={
                    organisationName
                }
                isBhmff={false}
                surfaceColour={
                    surfaceColour
                }
                textColour={
                    textColour
                }
                accentColour={
                    accentColour
                }
                accentTextColour={
                    accentTextColour
                }
            />
        </>
    );
}
