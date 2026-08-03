import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Search,
    Shield,
    Trophy,
} from "lucide-react";

import { supabase } from "../../lib/supabaseClient";
import type { Competition } from "../../types/competitionTypes";

type PublicTablesPageProps = {
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

type PublicResultRow = {
    id: string;
    organisation_id?: string | null;
    competition_id?: string | null;
    home_team_id?: string | null;
    away_team_id?: string | null;
    home_score?: number | null;
    away_score?: number | null;
    home_team_score?: number | null;
    away_team_score?: number | null;
    published?: boolean | null;
    status?: string | null;
    home_team?: ResultTeam | null;
    away_team?: ResultTeam | null;
    fixture?: {
        competition_id?: string | null;
        home_team_id?: string | null;
        away_team_id?: string | null;
        home_team?: ResultTeam | null;
        away_team?: ResultTeam | null;
    } | null;
    [key: string]: unknown;
};

type StandingRow = {
    teamId: string;
    teamName: string;
    badgeUrl: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    form: Array<"W" | "D" | "L">;
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
        "Team"
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

function createEmptyStanding(
    teamId: string,
    team: ResultTeam | null | undefined,
): StandingRow {
    return {
        teamId,
        teamName:
            getTeamName(team),
        badgeUrl:
            getTeamBadge(team),
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        form: [],
    };
}

function calculateStandings(
    results: PublicResultRow[],
) {
    const table =
        new Map<string, StandingRow>();

    results.forEach((result) => {
        const fixture =
            result.fixture;

        const homeTeamId =
            result.home_team_id ??
            fixture?.home_team_id ??
            "";

        const awayTeamId =
            result.away_team_id ??
            fixture?.away_team_id ??
            "";

        if (
            !homeTeamId ||
            !awayTeamId
        ) {
            return;
        }

        const homeTeam =
            result.home_team ??
            fixture?.home_team ??
            null;

        const awayTeam =
            result.away_team ??
            fixture?.away_team ??
            null;

        const homeScore =
            getNumber(
                result as Record<string, unknown>,
                [
                    "home_score",
                    "home_team_score",
                ],
            );

        const awayScore =
            getNumber(
                result as Record<string, unknown>,
                [
                    "away_score",
                    "away_team_score",
                ],
            );

        const homeStanding =
            table.get(homeTeamId) ??
            createEmptyStanding(
                homeTeamId,
                homeTeam,
            );

        const awayStanding =
            table.get(awayTeamId) ??
            createEmptyStanding(
                awayTeamId,
                awayTeam,
            );

        homeStanding.played += 1;
        awayStanding.played += 1;

        homeStanding.goalsFor +=
            homeScore;
        homeStanding.goalsAgainst +=
            awayScore;

        awayStanding.goalsFor +=
            awayScore;
        awayStanding.goalsAgainst +=
            homeScore;

        if (
            homeScore >
            awayScore
        ) {
            homeStanding.won += 1;
            awayStanding.lost += 1;
            homeStanding.points += 3;
            homeStanding.form.push("W");
            awayStanding.form.push("L");
        } else if (
            homeScore <
            awayScore
        ) {
            awayStanding.won += 1;
            homeStanding.lost += 1;
            awayStanding.points += 3;
            awayStanding.form.push("W");
            homeStanding.form.push("L");
        } else {
            homeStanding.drawn += 1;
            awayStanding.drawn += 1;
            homeStanding.points += 1;
            awayStanding.points += 1;
            homeStanding.form.push("D");
            awayStanding.form.push("D");
        }

        homeStanding.goalDifference =
            homeStanding.goalsFor -
            homeStanding.goalsAgainst;

        awayStanding.goalDifference =
            awayStanding.goalsFor -
            awayStanding.goalsAgainst;

        homeStanding.form =
            homeStanding.form.slice(-5);

        awayStanding.form =
            awayStanding.form.slice(-5);

        table.set(
            homeTeamId,
            homeStanding,
        );

        table.set(
            awayTeamId,
            awayStanding,
        );
    });

    return Array.from(
        table.values(),
    ).sort(
        (first, second) =>
            second.points -
            first.points ||
            second.goalDifference -
            first.goalDifference ||
            second.goalsFor -
            first.goalsFor ||
            first.teamName.localeCompare(
                second.teamName,
            ),
    );
}

function getCompetitionName(
    competition: Competition,
) {
    const record =
        competition as Competition &
            Record<string, unknown>;

    if (
        typeof record.name ===
        "string" &&
        record.name.trim()
    ) {
        return record.name.trim();
    }

    if (
        typeof record.title ===
        "string" &&
        record.title.trim()
    ) {
        return record.title.trim();
    }

    return "Competition";
}

function getPositionClasses(
    position: number,
) {
    if (position === 1) {
        return "bg-amber-400 text-black";
    }

    if (position <= 4) {
        return "bg-emerald-500/20 text-emerald-300";
    }

    return "bg-white/5";
}

function getFormClasses(
    result: "W" | "D" | "L",
) {
    if (result === "W") {
        return "bg-emerald-500 text-white";
    }

    if (result === "D") {
        return "bg-slate-500 text-white";
    }

    return "bg-red-500 text-white";
}

export function PublicTablesPage({
                                     organisationId,
                                     organisationName,
                                     competitions = [],
                                     backgroundColour,
                                     surfaceColour,
                                     textColour,
                                     accentColour,
                                     accentTextColour,
                                     basePath,
                                 }: PublicTablesPageProps) {
    const [
        results,
        setResults,
    ] =
        useState<PublicResultRow[]>([]);

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
    ] =
        useState(
            competitions[0]?.id ??
            "all",
        );

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
                            fixture:fixtures (
                                competition_id,
                                home_team_id,
                                away_team_id,
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
                                true,
                        },
                    );

                if (error) {
                    console.error(
                        "Failed to load public table results:",
                        error,
                    );

                    setResults([]);
                    setErrorMessage(
                        "Unable to calculate the standings right now.",
                    );
                    return;
                }

                setResults(
                    (
                        data ?? []
                    ).filter(
                        (result) =>
                            result.published !==
                            false,
                    ) as PublicResultRow[],
                );
            } catch (error) {
                console.error(
                    "Unexpected error while loading public standings:",
                    error,
                );

                setResults([]);
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Unable to calculate the standings right now.",
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
                    (competition) => ({
                        id:
                        competition.id,
                        name:
                            getCompetitionName(
                                competition,
                            ),
                    }),
                ),
            ],
            [competitions],
        );

    const filteredResults =
        useMemo(
            () =>
                results.filter(
                    (result) => {
                        const competitionId =
                            result.competition_id ??
                            result.fixture
                                ?.competition_id ??
                            "";

                        return (
                            selectedCompetitionId ===
                            "all" ||
                            competitionId ===
                            selectedCompetitionId
                        );
                    },
                ),
            [
                results,
                selectedCompetitionId,
            ],
        );

    const standings =
        useMemo(
            () =>
                calculateStandings(
                    filteredResults,
                ),
            [filteredResults],
        );

    const visibleStandings =
        useMemo(() => {
            const search =
                searchTerm
                    .trim()
                    .toLowerCase();

            if (!search) {
                return standings;
            }

            return standings.filter(
                (standing) =>
                    standing.teamName
                        .toLowerCase()
                        .includes(search),
            );
        }, [
            standings,
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
                        Competition Standings
                    </p>

                    <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
                        League Tables
                    </h1>

                    <p className="mt-5 max-w-3xl text-base leading-7 opacity-75 sm:text-lg">
                        Follow the latest standings,
                        points and goal difference for{" "}
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
                                placeholder="Search teams..."
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
                                Calculating standings...
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
                    ) : visibleStandings.length ===
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
                                No standings available
                            </h2>

                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 opacity-70">
                                The table will be calculated
                                automatically when
                                published results are
                                available.
                            </p>
                        </div>
                    ) : (
                        <div
                            className="overflow-hidden rounded-2xl border"
                            style={{
                                background:
                                surfaceColour,
                                borderColor:
                                    `${accentColour}35`,
                            }}
                        >
                            <div className="overflow-x-auto">
                                <table className="min-w-full border-collapse">
                                    <thead
                                        style={{
                                            background:
                                                `${accentColour}14`,
                                        }}
                                    >
                                    <tr className="text-left text-xs font-black uppercase tracking-wider">
                                        <th className="px-4 py-4 text-center">
                                            Pos
                                        </th>
                                        <th className="px-4 py-4">
                                            Team
                                        </th>
                                        <th className="px-3 py-4 text-center">
                                            P
                                        </th>
                                        <th className="px-3 py-4 text-center">
                                            W
                                        </th>
                                        <th className="px-3 py-4 text-center">
                                            D
                                        </th>
                                        <th className="px-3 py-4 text-center">
                                            L
                                        </th>
                                        <th className="px-3 py-4 text-center">
                                            GF
                                        </th>
                                        <th className="px-3 py-4 text-center">
                                            GA
                                        </th>
                                        <th className="px-3 py-4 text-center">
                                            GD
                                        </th>
                                        <th className="px-3 py-4 text-center">
                                            Pts
                                        </th>
                                        <th className="px-4 py-4">
                                            Form
                                        </th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {visibleStandings.map(
                                        (
                                            standing,
                                            index,
                                        ) => (
                                            <tr
                                                key={
                                                    standing.teamId
                                                }
                                                className="border-t"
                                                style={{
                                                    borderColor:
                                                        `${accentColour}18`,
                                                }}
                                            >
                                                <td className="px-4 py-4 text-center">
                                                        <span
                                                            className={`inline-grid h-8 w-8 place-items-center rounded-full text-sm font-black ${getPositionClasses(
                                                                index +
                                                                1,
                                                            )}`}
                                                        >
                                                            {index +
                                                                1}
                                                        </span>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <div className="flex min-w-[220px] items-center gap-3">
                                                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white p-1.5">
                                                            {standing.badgeUrl ? (
                                                                <img
                                                                    src={
                                                                        standing.badgeUrl
                                                                    }
                                                                    alt={`${standing.teamName} badge`}
                                                                    className="max-h-8 max-w-full object-contain"
                                                                />
                                                            ) : (
                                                                <Shield
                                                                    size={
                                                                        24
                                                                    }
                                                                    color={
                                                                        accentColour
                                                                    }
                                                                />
                                                            )}
                                                        </div>

                                                        <strong>
                                                            {
                                                                standing.teamName
                                                            }
                                                        </strong>
                                                    </div>
                                                </td>

                                                <td className="px-3 py-4 text-center">
                                                    {
                                                        standing.played
                                                    }
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    {
                                                        standing.won
                                                    }
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    {
                                                        standing.drawn
                                                    }
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    {
                                                        standing.lost
                                                    }
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    {
                                                        standing.goalsFor
                                                    }
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    {
                                                        standing.goalsAgainst
                                                    }
                                                </td>
                                                <td className="px-3 py-4 text-center font-bold">
                                                    {standing.goalDifference >
                                                    0
                                                        ? "+"
                                                        : ""}
                                                    {
                                                        standing.goalDifference
                                                    }
                                                </td>
                                                <td
                                                    className="px-3 py-4 text-center text-lg font-black"
                                                    style={{
                                                        color:
                                                        accentColour,
                                                    }}
                                                >
                                                    {
                                                        standing.points
                                                    }
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex min-w-[150px] gap-1">
                                                        {standing.form.map(
                                                            (
                                                                item,
                                                                formIndex,
                                                            ) => (
                                                                <span
                                                                    key={`${standing.teamId}-${formIndex}`}
                                                                    className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${getFormClasses(
                                                                        item,
                                                                    )}`}
                                                                >
                                                                        {
                                                                            item
                                                                        }
                                                                    </span>
                                                            ),
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                    </tbody>
                                </table>
                            </div>

                            <div
                                className="flex flex-wrap items-center justify-between gap-4 border-t px-5 py-4 text-xs opacity-70"
                                style={{
                                    borderColor:
                                        `${accentColour}18`,
                                }}
                            >
                                <span>
                                    P = Played, W = Won, D =
                                    Drawn, L = Lost
                                </span>

                                <a
                                    href={`${basePath}/results`}
                                    className="font-black no-underline"
                                    style={{
                                        color:
                                        accentColour,
                                    }}
                                >
                                    View Results
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}