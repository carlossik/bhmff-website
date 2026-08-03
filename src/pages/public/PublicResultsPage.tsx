import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    CalendarDays,
    MapPin,
    Search,
    Shield,
    Trophy,
} from "lucide-react";

import { supabase } from "../../lib/supabaseClient";
import type { Competition } from "../../types/competitionTypes";

type PublicResultsPageProps = {
    organisationId: string;
    organisationName: string;
    competitions?: Competition[];
    backgroundColour: string;
    surfaceColour: string;
    textColour: string;
    accentColour: string;
    accentTextColour: string;
    basePath: string;
};

type ResultTeam = {
    id?: string | null;
    name?: string | null;
    team_name?: string | null;
    badge_url?: string | null;
    logo_url?: string | null;
    clubs?: {
        name?: string | null;
        badge_url?: string | null;
        logo_url?: string | null;
    } | null;
};

type ResultVenue = {
    id?: string | null;
    name?: string | null;
    address?: string | null;
};

type PublicResultRow = {
    id: string;
    organisation_id?: string | null;
    competition_id?: string | null;
    fixture_id?: string | null;
    home_team_id?: string | null;
    away_team_id?: string | null;
    home_score?: number | null;
    away_score?: number | null;
    home_team_score?: number | null;
    away_team_score?: number | null;
    status?: string | null;
    published?: boolean | null;
    played_at?: string | null;
    completed_at?: string | null;
    created_at?: string | null;
    round_name?: string | null;
    round_number?: number | null;
    matchday?: number | null;
    fixture?: {
        id?: string | null;
        scheduled_at?: string | null;
        fixture_date?: string | null;
        kickoff_time?: string | null;
        venue?: ResultVenue | null;
        home_team?: ResultTeam | null;
        away_team?: ResultTeam | null;
        competition?: {
            id?: string | null;
            name?: string | null;
            title?: string | null;
        } | null;
    } | null;
    home_team?: ResultTeam | null;
    away_team?: ResultTeam | null;
    venue?: ResultVenue | null;
    competition?: {
        id?: string | null;
        name?: string | null;
        title?: string | null;
    } | null;
    [key: string]: unknown;
};

type ResultViewModel = {
    id: string;
    competitionId: string;
    competitionName: string;
    homeTeamName: string;
    homeTeamBadge: string;
    awayTeamName: string;
    awayTeamBadge: string;
    homeScore: number;
    awayScore: number;
    venueName: string;
    venueAddress: string;
    playedAt: string;
    status: string;
    roundLabel: string;
};

function getString(
    source: Record<string, unknown> | null | undefined,
    keys: string[],
) {
    if (!source) {
        return "";
    }

    for (const key of keys) {
        const value = source[key];

        if (
            typeof value === "string" &&
            value.trim()
        ) {
            return value.trim();
        }
    }

    return "";
}

function getNumber(
    source: Record<string, unknown>,
    keys: string[],
) {
    for (const key of keys) {
        const value = source[key];

        if (
            typeof value === "number" &&
            Number.isFinite(value)
        ) {
            return value;
        }
    }

    return 0;
}

function getTeamName(
    team: ResultTeam | null | undefined,
) {
    return (
        getString(
            team as Record<string, unknown>,
            [
                "name",
                "team_name",
            ],
        ) ||
        getString(
            team?.clubs as Record<string, unknown>,
            ["name"],
        ) ||
        "Team TBC"
    );
}

function getTeamBadge(
    team: ResultTeam | null | undefined,
) {
    return (
        getString(
            team as Record<string, unknown>,
            [
                "badge_url",
                "logo_url",
            ],
        ) ||
        getString(
            team?.clubs as Record<string, unknown>,
            [
                "badge_url",
                "logo_url",
            ],
        )
    );
}

function getCompetitionName(
    result: PublicResultRow,
) {
    return (
        getString(
            result.competition as Record<string, unknown>,
            [
                "name",
                "title",
            ],
        ) ||
        getString(
            result.fixture
                ?.competition as Record<string, unknown>,
            [
                "name",
                "title",
            ],
        ) ||
        "Competition"
    );
}

function buildPlayedAt(
    result: PublicResultRow,
) {
    if (
        result.played_at &&
        result.played_at.trim()
    ) {
        return result.played_at;
    }

    if (
        result.completed_at &&
        result.completed_at.trim()
    ) {
        return result.completed_at;
    }

    if (
        result.fixture
            ?.scheduled_at &&
        result.fixture.scheduled_at.trim()
    ) {
        return result.fixture.scheduled_at;
    }

    if (
        result.fixture
            ?.fixture_date &&
        result.fixture.fixture_date.trim()
    ) {
        const time =
            result.fixture
                .kickoff_time
                ?.trim() ||
            "00:00";

        return `${result.fixture.fixture_date}T${time}`;
    }

    return (
        result.created_at ??
        ""
    );
}

function getRoundLabel(
    result: PublicResultRow,
) {
    if (
        result.round_name &&
        result.round_name.trim()
    ) {
        return result.round_name.trim();
    }

    if (
        typeof result.matchday ===
        "number"
    ) {
        return `Matchday ${result.matchday}`;
    }

    if (
        typeof result.round_number ===
        "number"
    ) {
        return `Round ${result.round_number}`;
    }

    return "Result";
}

function mapResult(
    result: PublicResultRow,
): ResultViewModel {
    const fixture =
        result.fixture;

    const homeTeam =
        result.home_team ??
        fixture?.home_team ??
        null;

    const awayTeam =
        result.away_team ??
        fixture?.away_team ??
        null;

    const venue =
        result.venue ??
        fixture?.venue ??
        null;

    const record =
        result as Record<string, unknown>;

    return {
        id: result.id,
        competitionId:
            result.competition_id ??
            fixture?.competition?.id ??
            "",
        competitionName:
            getCompetitionName(result),
        homeTeamName:
            getTeamName(homeTeam),
        homeTeamBadge:
            getTeamBadge(homeTeam),
        awayTeamName:
            getTeamName(awayTeam),
        awayTeamBadge:
            getTeamBadge(awayTeam),
        homeScore:
            getNumber(record, [
                "home_score",
                "home_team_score",
            ]),
        awayScore:
            getNumber(record, [
                "away_score",
                "away_team_score",
            ]),
        venueName:
            getString(
                venue as Record<string, unknown>,
                ["name"],
            ) ||
            "Venue TBC",
        venueAddress:
            getString(
                venue as Record<string, unknown>,
                ["address"],
            ),
        playedAt:
            buildPlayedAt(result),
        status:
            result.status?.trim() ||
            "completed",
        roundLabel:
            getRoundLabel(result),
    };
}

function formatResultDate(
    value: string,
) {
    if (!value) {
        return "Date unavailable";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "Date unavailable";
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

function formatStatus(
    value: string,
) {
    return value
        .split("_")
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1),
        )
        .join(" ");
}

function getStatusClasses(
    status: string,
) {
    const normalised =
        status.toLowerCase();

    if (
        normalised.includes(
            "void",
        ) ||
        normalised.includes(
            "cancel",
        )
    ) {
        return "border-red-700/50 bg-red-500/10 text-red-300";
    }

    if (
        normalised.includes(
            "pending",
        ) ||
        normalised.includes(
            "review",
        )
    ) {
        return "border-amber-700/50 bg-amber-500/10 text-amber-300";
    }

    return "border-emerald-700/50 bg-emerald-500/10 text-emerald-300";
}

export function PublicResultsPage({
                                      organisationId,
                                      organisationName,
                                      competitions = [],
                                      backgroundColour,
                                      surfaceColour,
                                      textColour,
                                      accentColour,
                                      accentTextColour,
                                      basePath,
                                  }: PublicResultsPageProps) {
    const [results, setResults] =
        useState<ResultViewModel[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const [searchTerm, setSearchTerm] =
        useState("");

    const [
        selectedCompetitionId,
        setSelectedCompetitionId,
    ] = useState("all");

    useEffect(() => {
        async function loadResults() {
            setLoading(true);
            setErrorMessage("");

            try {
                const {
                    data,
                    error,
                } = await supabase
                    .from("results")
                    .select(
                        `
                            *,
                            home_team:teams!results_home_team_id_fkey (
                                id,
                                name,
                                team_name,
                                badge_url,
                                logo_url,
                                clubs (
                                    name,
                                    badge_url,
                                    logo_url
                                )
                            ),
                            away_team:teams!results_away_team_id_fkey (
                                id,
                                name,
                                team_name,
                                badge_url,
                                logo_url,
                                clubs (
                                    name,
                                    badge_url,
                                    logo_url
                                )
                            ),
                            venue:venues (
                                id,
                                name,
                                address
                            ),
                            competition:competitions (
                                id,
                                name,
                                title
                            ),
                            fixture:fixtures (
                                id,
                                scheduled_at,
                                fixture_date,
                                kickoff_time,
                                home_team:teams!fixtures_home_team_id_fkey (
                                    id,
                                    name,
                                    team_name,
                                    badge_url,
                                    logo_url,
                                    clubs (
                                        name,
                                        badge_url,
                                        logo_url
                                    )
                                ),
                                away_team:teams!fixtures_away_team_id_fkey (
                                    id,
                                    name,
                                    team_name,
                                    badge_url,
                                    logo_url,
                                    clubs (
                                        name,
                                        badge_url,
                                        logo_url
                                    )
                                ),
                                venue:venues (
                                    id,
                                    name,
                                    address
                                ),
                                competition:competitions (
                                    id,
                                    name,
                                    title
                                )
                            )
                        `,
                    )
                    .eq(
                        "organisation_id",
                        organisationId,
                    )
                    .order(
                        "created_at",
                        {
                            ascending:
                                false,
                        },
                    );

                if (error) {
                    console.error(
                        "Failed to load public results:",
                        error,
                    );

                    setResults([]);
                    setErrorMessage(
                        "Unable to load results right now.",
                    );
                    return;
                }

                const rows =
                    (data ?? []) as PublicResultRow[];

                const visibleRows =
                    rows.filter(
                        (result) =>
                            result.published !== false,
                    );

                setResults(
                    visibleRows.map(
                        mapResult,
                    ),
                );
            } catch (error) {
                console.error(
                    "Unexpected error while loading public results:",
                    error,
                );

                setResults([]);
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Unable to load results right now.",
                );
            } finally {
                setLoading(false);
            }
        }

        void loadResults();
    }, [organisationId]);

    const competitionOptions =
        useMemo(
            () => [
                {
                    id: "all",
                    name: "All Competitions",
                },
                ...competitions.map(
                    (competition) => {
                        const record =
                            competition as Competition &
                                Record<string, unknown>;

                        const name =
                            typeof record.name ===
                            "string" &&
                            record.name.trim()
                                ? record.name.trim()
                                : typeof record.title ===
                                "string" &&
                                record.title.trim()
                                    ? record.title.trim()
                                    : "Competition";

                        return {
                            id:
                            competition.id,
                            name,
                        };
                    },
                ),
            ],
            [competitions],
        );

    const filteredResults =
        useMemo(() => {
            const normalisedSearch =
                searchTerm
                    .trim()
                    .toLowerCase();

            return results.filter(
                (result) => {
                    const competitionMatches =
                        selectedCompetitionId ===
                        "all" ||
                        result.competitionId ===
                        selectedCompetitionId;

                    const searchMatches =
                        !normalisedSearch ||
                        result.homeTeamName
                            .toLowerCase()
                            .includes(
                                normalisedSearch,
                            ) ||
                        result.awayTeamName
                            .toLowerCase()
                            .includes(
                                normalisedSearch,
                            ) ||
                        result.venueName
                            .toLowerCase()
                            .includes(
                                normalisedSearch,
                            ) ||
                        result.roundLabel
                            .toLowerCase()
                            .includes(
                                normalisedSearch,
                            );

                    return (
                        competitionMatches &&
                        searchMatches
                    );
                },
            );
        }, [
            results,
            selectedCompetitionId,
            searchTerm,
        ]);

    const pageWidth =
        "min(1180px, calc(100% - 2rem))";

    return (
        <div
            className="min-h-screen"
            style={{
                background:
                backgroundColour,
                color:
                textColour,
            }}
        >
            <section
                className="border-b py-16"
                style={{
                    borderColor:
                        `${accentColour}30`,
                    background: `radial-gradient(circle at 75% 20%, ${accentColour}20, transparent 35%), ${backgroundColour}`,
                }}
            >
                <div
                    className="mx-auto"
                    style={{
                        width:
                        pageWidth,
                    }}
                >
                    <p
                        className="text-xs font-black uppercase tracking-[0.2em]"
                        style={{
                            color:
                            accentColour,
                        }}
                    >
                        Match Centre
                    </p>

                    <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
                        Results
                    </h1>

                    <p className="mt-5 max-w-3xl text-base leading-7 opacity-75 sm:text-lg">
                        View confirmed scores and
                        published match outcomes from{" "}
                        <strong>
                            {organisationName}
                        </strong>
                        .
                    </p>
                </div>
            </section>

            <section className="py-10">
                <div
                    className="mx-auto"
                    style={{
                        width:
                        pageWidth,
                    }}
                >
                    <div
                        className="flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between"
                        style={{
                            background:
                            surfaceColour,
                            borderColor:
                                `${accentColour}35`,
                        }}
                    >
                        <div className="relative w-full lg:max-w-md">
                            <Search
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
                            />

                            <input
                                type="search"
                                value={
                                    searchTerm
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setSearchTerm(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Search teams, venues or rounds..."
                                className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-current"
                                style={{
                                    color:
                                    textColour,
                                }}
                            />
                        </div>

                        <select
                            value={
                                selectedCompetitionId
                            }
                            onChange={(
                                event,
                            ) =>
                                setSelectedCompetitionId(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold outline-none"
                            style={{
                                color:
                                textColour,
                            }}
                        >
                            {competitionOptions.map(
                                (
                                    competition,
                                ) => (
                                    <option
                                        key={
                                            competition.id
                                        }
                                        value={
                                            competition.id
                                        }
                                    >
                                        {
                                            competition.name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                </div>
            </section>

            <section className="pb-14">
                <div
                    className="mx-auto"
                    style={{
                        width:
                        pageWidth,
                    }}
                >
                    {loading ? (
                        <div
                            className="rounded-2xl border p-12 text-center"
                            style={{
                                background:
                                surfaceColour,
                                borderColor:
                                    `${accentColour}35`,
                            }}
                        >
                            <p className="font-bold opacity-70">
                                Loading results...
                            </p>
                        </div>
                    ) : errorMessage ? (
                        <div className="rounded-2xl border border-red-700/50 bg-red-500/10 p-8 text-center text-red-300">
                            <p className="font-bold">
                                {
                                    errorMessage
                                }
                            </p>
                        </div>
                    ) : filteredResults.length ===
                    0 ? (
                        <div
                            className="rounded-2xl border p-12 text-center"
                            style={{
                                background:
                                surfaceColour,
                                borderColor:
                                    `${accentColour}35`,
                            }}
                        >
                            <Trophy
                                size={44}
                                className="mx-auto"
                                color={
                                    accentColour
                                }
                            />

                            <h2 className="mt-5 text-2xl font-black">
                                No results found
                            </h2>

                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 opacity-70">
                                Published results matching
                                the selected filters will
                                appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {filteredResults.map(
                                (result) => (
                                    <article
                                        key={
                                            result.id
                                        }
                                        className="rounded-2xl border p-5 sm:p-6"
                                        style={{
                                            background:
                                            surfaceColour,
                                            borderColor:
                                                `${accentColour}35`,
                                        }}
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p
                                                    className="text-xs font-black uppercase tracking-[0.16em]"
                                                    style={{
                                                        color:
                                                        accentColour,
                                                    }}
                                                >
                                                    {
                                                        result.competitionName
                                                    }
                                                </p>

                                                <h2 className="mt-1 text-xl font-black">
                                                    {
                                                        result.roundLabel
                                                    }
                                                </h2>
                                            </div>

                                            <span
                                                className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(
                                                    result.status,
                                                )}`}
                                            >
                                                {formatStatus(
                                                    result.status,
                                                )}
                                            </span>
                                        </div>

                                        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                                            <TeamResultBlock
                                                name={
                                                    result.homeTeamName
                                                }
                                                badge={
                                                    result.homeTeamBadge
                                                }
                                                score={
                                                    result.homeScore
                                                }
                                                accentColour={
                                                    accentColour
                                                }
                                                align="right"
                                            />

                                            <div className="text-center">
                                                <span className="block text-xs font-black uppercase tracking-[0.16em] opacity-50">
                                                    Full Time
                                                </span>

                                                <strong className="mt-2 block text-4xl font-black">
                                                    {
                                                        result.homeScore
                                                    }{" "}
                                                    -{" "}
                                                    {
                                                        result.awayScore
                                                    }
                                                </strong>

                                                <p className="mt-3 flex items-center justify-center gap-2 text-sm opacity-65">
                                                    <CalendarDays
                                                        size={
                                                            16
                                                        }
                                                    />
                                                    {formatResultDate(
                                                        result.playedAt,
                                                    )}
                                                </p>
                                            </div>

                                            <TeamResultBlock
                                                name={
                                                    result.awayTeamName
                                                }
                                                badge={
                                                    result.awayTeamBadge
                                                }
                                                score={
                                                    result.awayScore
                                                }
                                                accentColour={
                                                    accentColour
                                                }
                                                align="left"
                                            />
                                        </div>

                                        <div
                                            className="mt-6 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                                            style={{
                                                borderColor:
                                                    `${accentColour}20`,
                                                background:
                                                    `${backgroundColour}80`,
                                            }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <MapPin
                                                    size={
                                                        18
                                                    }
                                                    className="mt-0.5 shrink-0"
                                                    color={
                                                        accentColour
                                                    }
                                                />

                                                <div>
                                                    <strong className="block">
                                                        {
                                                            result.venueName
                                                        }
                                                    </strong>

                                                    {result.venueAddress ? (
                                                        <span className="mt-1 block text-xs opacity-60">
                                                            {
                                                                result.venueAddress
                                                            }
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <a
                                                href={`${basePath}/teams`}
                                                className="inline-flex items-center gap-2 text-sm font-black no-underline"
                                                style={{
                                                    color:
                                                    accentColour,
                                                }}
                                            >
                                                View Teams
                                                <Trophy
                                                    size={
                                                        16
                                                    }
                                                />
                                            </a>
                                        </div>
                                    </article>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

type TeamResultBlockProps = {
    name: string;
    badge: string;
    score: number;
    accentColour: string;
    align: "left" | "right";
};

function TeamResultBlock({
                             name,
                             badge,
                             score,
                             accentColour,
                             align,
                         }: TeamResultBlockProps) {
    return (
        <div
            className={`flex items-center gap-4 ${
                align === "right"
                    ? "lg:flex-row-reverse lg:text-right"
                    : "lg:text-left"
            }`}
        >
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white p-3">
                {badge ? (
                    <img
                        src={
                            badge
                        }
                        alt={`${name} badge`}
                        className="max-h-14 max-w-full object-contain"
                    />
                ) : (
                    <Shield
                        size={38}
                        color={
                            accentColour
                        }
                    />
                )}
            </div>

            <div>
                <h3 className="text-xl font-black">
                    {name}
                </h3>

                <strong
                    className="mt-2 block text-3xl font-black"
                    style={{
                        color:
                        accentColour,
                    }}
                >
                    {score}
                </strong>
            </div>
        </div>
    );
}