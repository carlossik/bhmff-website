import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    MapPin,
    Search,
    Shield,
    Users,
} from "lucide-react";

import { supabase } from "../../lib/supabaseClient";

type PublicTeamsPageProps = {
    organisationId: string;
    organisationName: string;
    backgroundColour: string;
    surfaceColour: string;
    textColour: string;
    accentColour: string;
    accentTextColour: string;
    basePath: string;
};

type PublicTeamRow = {
    id: string;
    organisation_id?: string | null;
    competition_id?: string | null;
    club_id?: string | null;
    name?: string | null;
    team_name?: string | null;
    age_group?: string | null;
    gender?: string | null;
    badge_url?: string | null;
    logo_url?: string | null;
    home_venue_id?: string | null;
    published?: boolean | null;
    active?: boolean | null;
    created_at?: string | null;
    clubs?: {
        id?: string | null;
        name?: string | null;
        badge_url?: string | null;
        logo_url?: string | null;
    } | null;
    venues?: {
        id?: string | null;
        name?: string | null;
        address?: string | null;
    } | null;
    [key: string]: unknown;
};

type TeamViewModel = {
    id: string;
    name: string;
    clubName: string;
    ageGroup: string;
    gender: string;
    badgeUrl: string;
    venueName: string;
    venueAddress: string;
};

function getString(
    source: Record<string, unknown>,
    keys: string[],
) {
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

function mapTeam(
    team: PublicTeamRow,
): TeamViewModel {
    const club =
        team.clubs &&
        typeof team.clubs === "object"
            ? team.clubs
            : {};

    const venue =
        team.venues &&
        typeof team.venues === "object"
            ? team.venues
            : {};

    return {
        id: team.id,
        name:
            getString(team, [
                "name",
                "team_name",
                "title",
            ]) || "Unnamed Team",
        clubName:
            getString(
                club as Record<string, unknown>,
                ["name"],
            ) || "Independent Team",
        ageGroup:
            getString(team, [
                "age_group",
                "age_category",
            ]) || "Open Age",
        gender:
            getString(team, [
                "gender",
                "team_gender",
            ]) || "Not specified",
        badgeUrl:
            getString(team, [
                "badge_url",
                "logo_url",
            ]) ||
            getString(
                club as Record<string, unknown>,
                [
                    "badge_url",
                    "logo_url",
                ],
            ),
        venueName:
            getString(
                venue as Record<string, unknown>,
                ["name"],
            ) ||
            getString(team, [
                "home_venue_name",
            ]) ||
            "Venue not confirmed",
        venueAddress:
            getString(
                venue as Record<string, unknown>,
                ["address"],
            ),
    };
}

function createTeamHref(
    basePath: string,
    teamId: string,
) {
    return `${basePath}/teams/${encodeURIComponent(
        teamId,
    )}`;
}

export function PublicTeamsPage({
                                    organisationId,
                                    organisationName,
                                    backgroundColour,
                                    surfaceColour,
                                    textColour,
                                    accentColour,
                                    accentTextColour,
                                    basePath,
                                }: PublicTeamsPageProps) {
    const [teams, setTeams] =
        useState<TeamViewModel[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [searchTerm, setSearchTerm] =
        useState("");

    const [ageFilter, setAgeFilter] =
        useState("all");

    useEffect(() => {
        async function loadTeams() {
            setLoading(true);
            setErrorMessage("");

            try {
                const { data, error } =
                    await supabase
                        .from("teams")
                        .select(
                            `
                                *,
                                clubs (
                                    id,
                                    name,
                                    badge_url,
                                    logo_url
                                ),
                                venues (
                                    id,
                                    name,
                                    address
                                )
                            `,
                        )
                        .eq(
                            "organisation_id",
                            organisationId,
                        )
                        .order("created_at", {
                            ascending: true,
                        });

                if (error) {
                    console.error(
                        "Failed to load public teams:",
                        error,
                    );

                    setTeams([]);
                    setErrorMessage(
                        "Unable to load teams right now.",
                    );
                    return;
                }

                const rows =
                    (data ?? []) as PublicTeamRow[];

                const visibleRows =
                    rows.filter(
                        (team) =>
                            team.published !== false &&
                            team.active !== false,
                    );

                setTeams(
                    visibleRows.map(mapTeam),
                );
            } catch (error) {
                console.error(
                    "Unexpected error while loading public teams:",
                    error,
                );

                setTeams([]);
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Unable to load teams right now.",
                );
            } finally {
                setLoading(false);
            }
        }

        void loadTeams();
    }, [organisationId]);

    const ageGroups =
        useMemo(
            () => [
                "all",
                ...Array.from(
                    new Set(
                        teams.map(
                            (team) =>
                                team.ageGroup,
                        ),
                    ),
                ).sort(),
            ],
            [teams],
        );

    const filteredTeams =
        useMemo(() => {
            const normalisedSearch =
                searchTerm
                    .trim()
                    .toLowerCase();

            return teams.filter(
                (team) => {
                    const searchMatches =
                        !normalisedSearch ||
                        team.name
                            .toLowerCase()
                            .includes(
                                normalisedSearch,
                            ) ||
                        team.clubName
                            .toLowerCase()
                            .includes(
                                normalisedSearch,
                            ) ||
                        team.venueName
                            .toLowerCase()
                            .includes(
                                normalisedSearch,
                            );

                    const ageMatches =
                        ageFilter === "all" ||
                        team.ageGroup ===
                        ageFilter;

                    return (
                        searchMatches &&
                        ageMatches
                    );
                },
            );
        }, [
            teams,
            searchTerm,
            ageFilter,
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
                        width: pageWidth,
                    }}
                >
                    <p
                        className="text-xs font-black uppercase tracking-[0.2em]"
                        style={{
                            color:
                            accentColour,
                        }}
                    >
                        Participating Teams
                    </p>

                    <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
                        Teams
                    </h1>

                    <p className="mt-5 max-w-3xl text-base leading-7 opacity-75 sm:text-lg">
                        Meet the clubs and teams
                        participating in{" "}
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
                        width: pageWidth,
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
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(
                                        event.target
                                            .value,
                                    )
                                }
                                placeholder="Search teams, clubs or venues..."
                                className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-current"
                                style={{
                                    color:
                                    textColour,
                                }}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {ageGroups.map(
                                (ageGroup) => (
                                    <button
                                        key={
                                            ageGroup
                                        }
                                        type="button"
                                        onClick={() =>
                                            setAgeFilter(
                                                ageGroup,
                                            )
                                        }
                                        className="rounded-full px-4 py-2 text-sm font-bold transition"
                                        style={{
                                            background:
                                                ageFilter ===
                                                ageGroup
                                                    ? accentColour
                                                    : `${accentColour}12`,
                                            color:
                                                ageFilter ===
                                                ageGroup
                                                    ? accentTextColour
                                                    : textColour,
                                        }}
                                    >
                                        {ageGroup ===
                                        "all"
                                            ? "All Teams"
                                            : ageGroup}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="pb-14">
                <div
                    className="mx-auto"
                    style={{
                        width: pageWidth,
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
                                Loading teams...
                            </p>
                        </div>
                    ) : errorMessage ? (
                        <div className="rounded-2xl border border-red-700/50 bg-red-500/10 p-8 text-center text-red-300">
                            <p className="font-bold">
                                {errorMessage}
                            </p>
                        </div>
                    ) : filteredTeams.length ===
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
                            <Users
                                size={44}
                                className="mx-auto"
                                color={
                                    accentColour
                                }
                            />

                            <h2 className="mt-5 text-2xl font-black">
                                No teams found
                            </h2>

                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 opacity-70">
                                Published teams matching
                                the selected filters will
                                appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredTeams.map(
                                (team) => (
                                    <a
                                        key={
                                            team.id
                                        }
                                        href={createTeamHref(
                                            basePath,
                                            team.id,
                                        )}
                                        className="group flex min-h-[350px] flex-col rounded-2xl border p-6 no-underline transition hover:-translate-y-0.5"
                                        style={{
                                            background:
                                            surfaceColour,
                                            borderColor:
                                                `${accentColour}35`,
                                            color:
                                            textColour,
                                        }}
                                    >
                                        <div
                                            className="grid h-32 place-items-center rounded-2xl border"
                                            style={{
                                                borderColor:
                                                    `${accentColour}25`,
                                                background:
                                                    `${backgroundColour}80`,
                                            }}
                                        >
                                            {team.badgeUrl ? (
                                                <img
                                                    src={
                                                        team.badgeUrl
                                                    }
                                                    alt={`${team.name} badge`}
                                                    className="max-h-24 max-w-[75%] object-contain"
                                                />
                                            ) : (
                                                <Shield
                                                    size={
                                                        58
                                                    }
                                                    color={
                                                        accentColour
                                                    }
                                                />
                                            )}
                                        </div>

                                        <div className="mt-5">
                                            <p
                                                className="text-xs font-black uppercase tracking-[0.15em]"
                                                style={{
                                                    color:
                                                    accentColour,
                                                }}
                                            >
                                                {
                                                    team.clubName
                                                }
                                            </p>

                                            <h2 className="mt-2 text-2xl font-black leading-tight">
                                                {
                                                    team.name
                                                }
                                            </h2>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <span
                                                    className="rounded-full px-3 py-1 text-xs font-bold"
                                                    style={{
                                                        background:
                                                            `${accentColour}15`,
                                                        color:
                                                        accentColour,
                                                    }}
                                                >
                                                    {
                                                        team.ageGroup
                                                    }
                                                </span>

                                                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold opacity-75">
                                                    {
                                                        team.gender
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-6">
                                            <div className="flex items-start gap-3 text-sm opacity-70">
                                                <MapPin
                                                    size={
                                                        17
                                                    }
                                                    className="mt-0.5 shrink-0"
                                                />

                                                <div>
                                                    <strong className="block">
                                                        {
                                                            team.venueName
                                                        }
                                                    </strong>

                                                    {team.venueAddress ? (
                                                        <span className="mt-1 block text-xs">
                                                            {
                                                                team.venueAddress
                                                            }
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    </a>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}