import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    CalendarDays,
    Clock3,
    MapPin,
    Search,
    Shield,
    Trophy,
    UserRoundCheck,
} from "lucide-react";

import { supabase } from "../../lib/supabaseClient";
import type { Competition } from "../../types/competitionTypes";

type PublicFixturesPageProps = {
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

type FixtureTeam = {
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

type FixtureVenue = {
    id?: string | null;
    name?: string | null;
    address?: string | null;
};

type PublicFixtureOfficial = {
    officialId: string;
    role: string;
    displayName: string;
};

type PublicFixtureOfficialRow = {
    fixture_id: string;
    official_id: string;
    role: string;
    display_name: string;
};

type PublicFixtureRow = {
    id: string;
    organisation_id?: string | null;
    competition_id?: string | null;
    home_team_id?: string | null;
    away_team_id?: string | null;
    venue_id?: string | null;
    scheduled_at?: string | null;
    fixture_date?: string | null;
    kickoff_time?: string | null;
    status?: string | null;
    round_name?: string | null;
    round_number?: number | null;
    matchday?: number | null;
    published?: boolean | null;
    created_at?: string | null;
    home_team?: FixtureTeam | null;
    away_team?: FixtureTeam | null;
    venue?: FixtureVenue | null;
    competition?: {
        id?: string | null;
        name?: string | null;
        title?: string | null;
    } | null;
    [key: string]: unknown;
};

type FixtureViewModel = {
    id: string;
    competitionId: string;
    competitionName: string;
    homeTeamName: string;
    homeTeamBadge: string;
    awayTeamName: string;
    awayTeamBadge: string;
    venueName: string;
    venueAddress: string;
    scheduledAt: string;
    status: string;
    roundLabel: string;
    officials: PublicFixtureOfficial[];
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

function getTeamName(
    team: FixtureTeam | null | undefined,
) {
    const direct =
        getString(
            team as Record<string, unknown>,
            [
                "name",
                "team_name",
            ],
        );

    if (direct) {
        return direct;
    }

    const clubName =
        getString(
            team?.clubs as Record<string, unknown>,
            ["name"],
        );

    return clubName || "Team TBC";
}

function getTeamBadge(
    team: FixtureTeam | null | undefined,
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
    fixture: PublicFixtureRow,
) {
    return (
        getString(
            fixture.competition as Record<string, unknown>,
            [
                "name",
                "title",
            ],
        ) ||
        "Competition"
    );
}

function buildScheduledAt(
    fixture: PublicFixtureRow,
) {
    if (
        fixture.scheduled_at &&
        fixture.scheduled_at.trim()
    ) {
        return fixture.scheduled_at;
    }

    if (
        fixture.fixture_date &&
        fixture.fixture_date.trim()
    ) {
        const time =
            fixture.kickoff_time?.trim() ||
            "00:00";

        return `${fixture.fixture_date}T${time}`;
    }

    return "";
}

function getRoundLabel(
    fixture: PublicFixtureRow,
) {
    if (
        fixture.round_name &&
        fixture.round_name.trim()
    ) {
        return fixture.round_name.trim();
    }

    if (
        typeof fixture.matchday ===
        "number"
    ) {
        return `Matchday ${fixture.matchday}`;
    }

    if (
        typeof fixture.round_number ===
        "number"
    ) {
        return `Round ${fixture.round_number}`;
    }

    return "Fixture";
}

function mapFixture(
    fixture: PublicFixtureRow,
    officials: PublicFixtureOfficial[] = [],
): FixtureViewModel {
    return {
        id: fixture.id,
        competitionId:
            fixture.competition_id ?? "",
        competitionName:
            getCompetitionName(fixture),
        homeTeamName:
            getTeamName(
                fixture.home_team,
            ),
        homeTeamBadge:
            getTeamBadge(
                fixture.home_team,
            ),
        awayTeamName:
            getTeamName(
                fixture.away_team,
            ),
        awayTeamBadge:
            getTeamBadge(
                fixture.away_team,
            ),
        venueName:
            getString(
                fixture.venue as Record<string, unknown>,
                ["name"],
            ) ||
            "Venue TBC",
        venueAddress:
            getString(
                fixture.venue as Record<string, unknown>,
                ["address"],
            ),
        scheduledAt:
            buildScheduledAt(
                fixture,
            ),
        status:
            fixture.status?.trim() ||
            "scheduled",
        roundLabel:
            getRoundLabel(
                fixture,
            ),
        officials,
    };
}


function formatOfficialRole(
    role: string,
) {
    switch (role) {
        case "referee":
            return "Referee";
        case "assistant_referee":
            return "Assistant Referee";
        case "fourth_official":
            return "Fourth Official";
        case "match_commissioner":
            return "Match Commissioner";
        case "assessor":
            return "Assessor";
        case "observer":
            return "Observer";
        default:
            return role
                .split("_")
                .map(
                    (word) =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1),
                )
                .join(" ");
    }
}

function sortOfficials(
    officials: PublicFixtureOfficial[],
) {
    const roleOrder = new Map<string, number>([
        ["referee", 0],
        ["assistant_referee", 1],
        ["fourth_official", 2],
        ["match_commissioner", 3],
        ["assessor", 4],
        ["observer", 5],
    ]);

    return [...officials].sort(
        (first, second) => {
            const firstOrder =
                roleOrder.get(first.role) ?? 99;
            const secondOrder =
                roleOrder.get(second.role) ?? 99;

            if (firstOrder !== secondOrder) {
                return firstOrder - secondOrder;
            }

            return first.displayName.localeCompare(
                second.displayName,
            );
        },
    );
}

function formatFixtureDate(
    value: string,
) {
    if (!value) {
        return "Date TBC";
    }

    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "Date TBC";
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

function formatFixtureTime(
    value: string,
) {
    if (!value) {
        return "Time TBC";
    }

    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "Time TBC";
    }

    return new Intl.DateTimeFormat(
        "en-GB",
        {
            hour: "2-digit",
            minute: "2-digit",
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
            "postpon",
        ) ||
        normalised.includes(
            "cancel",
        )
    ) {
        return "border-red-700/50 bg-red-500/10 text-red-300";
    }

    if (
        normalised.includes(
            "live",
        ) ||
        normalised.includes(
            "progress",
        )
    ) {
        return "border-amber-700/50 bg-amber-500/10 text-amber-300";
    }

    if (
        normalised.includes(
            "complete",
        ) ||
        normalised.includes(
            "finished",
        )
    ) {
        return "border-slate-700 bg-slate-800 text-slate-300";
    }

    return "border-sky-700/50 bg-sky-500/10 text-sky-300";
}

export function PublicFixturesPage({
    organisationId,
    organisationName,
    competitions = [],
    backgroundColour,
    surfaceColour,
    textColour,
    accentColour,
    accentTextColour,
    basePath,
}: PublicFixturesPageProps) {
    const [fixtures, setFixtures] =
        useState<FixtureViewModel[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [searchTerm, setSearchTerm] =
        useState("");

    const [
        selectedCompetitionId,
        setSelectedCompetitionId,
    ] = useState("all");

    useEffect(() => {
        async function loadFixtures() {
            setLoading(true);
            setErrorMessage("");

            try {
                const { data, error } =
                    await supabase
                        .from("fixtures")
                        .select(
                            `
                                *,
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
                            `,
                        )
                        .eq(
                            "organisation_id",
                            organisationId,
                        )
                        .order(
                            "scheduled_at",
                            {
                                ascending: true,
                                nullsFirst: false,
                            },
                        );

                if (error) {
                    console.error(
                        "Failed to load public fixtures:",
                        error,
                    );

                    setFixtures([]);
                    setErrorMessage(
                        "Unable to load fixtures right now.",
                    );
                    return;
                }

                const rows =
                    (data ?? []) as PublicFixtureRow[];

                const visibleRows =
                    rows.filter(
                        (fixture) =>
                            fixture.published !== false,
                    );

                const fixtureIds =
                    visibleRows.map(
                        (fixture) =>
                            fixture.id,
                    );

                const officialsByFixture =
                    new Map<
                        string,
                        PublicFixtureOfficial[]
                    >();

                if (fixtureIds.length > 0) {
                    const {
                        data: officialRows,
                        error: officialError,
                    } = await supabase.rpc(
                        "get_public_fixture_officials",
                        {
                            p_organisation_id:
                                organisationId,
                        },
                    );

                    if (officialError) {
                        console.error(
                            "Failed to load public fixture officials:",
                            officialError,
                        );
                    } else {
                        for (
                            const row of (
                                officialRows ?? []
                            ) as PublicFixtureOfficialRow[]
                        ) {
                            if (
                                !fixtureIds.includes(
                                    row.fixture_id,
                                )
                            ) {
                                continue;
                            }

                            const current =
                                officialsByFixture.get(
                                    row.fixture_id,
                                ) ?? [];

                            current.push({
                                officialId:
                                    row.official_id,
                                role:
                                    row.role,
                                displayName:
                                    row.display_name,
                            });

                            officialsByFixture.set(
                                row.fixture_id,
                                current,
                            );
                        }
                    }
                }

                setFixtures(
                    visibleRows.map(
                        (fixture) =>
                            mapFixture(
                                fixture,
                                sortOfficials(
                                    officialsByFixture.get(
                                        fixture.id,
                                    ) ?? [],
                                ),
                            ),
                    ),
                );
            } catch (error) {
                console.error(
                    "Unexpected error while loading public fixtures:",
                    error,
                );

                setFixtures([]);
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Unable to load fixtures right now.",
                );
            } finally {
                setLoading(false);
            }
        }

        void loadFixtures();
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
                            (
                                competition as Competition &
                                    Record<string, unknown>
                            ).name as string ||
                            (
                                competition as Competition &
                                    Record<string, unknown>
                            ).title as string ||
                            "Competition",
                    }),
                ),
            ],
            [competitions],
        );

    const filteredFixtures =
        useMemo(() => {
            const normalisedSearch =
                searchTerm
                    .trim()
                    .toLowerCase();

            return fixtures.filter(
                (fixture) => {
                    const competitionMatches =
                        selectedCompetitionId ===
                            "all" ||
                        fixture.competitionId ===
                            selectedCompetitionId;

                    const searchMatches =
                        !normalisedSearch ||
                        fixture.homeTeamName
                            .toLowerCase()
                            .includes(
                                normalisedSearch,
                            ) ||
                        fixture.awayTeamName
                            .toLowerCase()
                            .includes(
                                normalisedSearch,
                            ) ||
                        fixture.venueName
                            .toLowerCase()
                            .includes(
                                normalisedSearch,
                            ) ||
                        fixture.roundLabel
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
            fixtures,
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
                        Match Centre
                    </p>

                    <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
                        Fixtures
                    </h1>

                    <p className="mt-5 max-w-3xl text-base leading-7 opacity-75 sm:text-lg">
                        View confirmed fixtures,
                        kick-off times, venues and appointed officials for{" "}
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
                            onChange={(event) =>
                                setSelectedCompetitionId(
                                    event.target
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
                                (competition) => (
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
                                Loading fixtures...
                            </p>
                        </div>
                    ) : errorMessage ? (
                        <div className="rounded-2xl border border-red-700/50 bg-red-500/10 p-8 text-center text-red-300">
                            <p className="font-bold">
                                {errorMessage}
                            </p>
                        </div>
                    ) : filteredFixtures.length ===
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
                            <CalendarDays
                                size={44}
                                className="mx-auto"
                                color={
                                    accentColour
                                }
                            />

                            <h2 className="mt-5 text-2xl font-black">
                                No fixtures found
                            </h2>

                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 opacity-70">
                                Published fixtures matching
                                the selected filters will
                                appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {filteredFixtures.map(
                                (fixture) => (
                                    <article
                                        key={
                                            fixture.id
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
                                                        fixture.competitionName
                                                    }
                                                </p>

                                                <h2 className="mt-1 text-xl font-black">
                                                    {
                                                        fixture.roundLabel
                                                    }
                                                </h2>
                                            </div>

                                            <span
                                                className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(
                                                    fixture.status,
                                                )}`}
                                            >
                                                {formatStatus(
                                                    fixture.status,
                                                )}
                                            </span>
                                        </div>

                                        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                                            <TeamBlock
                                                name={
                                                    fixture.homeTeamName
                                                }
                                                badge={
                                                    fixture.homeTeamBadge
                                                }
                                                label="Home"
                                                accentColour={
                                                    accentColour
                                                }
                                                align="right"
                                            />

                                            <div className="text-center">
                                                <strong className="block text-2xl font-black">
                                                    VS
                                                </strong>

                                                <div className="mt-3 space-y-2 text-sm opacity-70">
                                                    <p className="flex items-center justify-center gap-2">
                                                        <CalendarDays
                                                            size={
                                                                16
                                                            }
                                                        />
                                                        {formatFixtureDate(
                                                            fixture.scheduledAt,
                                                        )}
                                                    </p>

                                                    <p className="flex items-center justify-center gap-2">
                                                        <Clock3
                                                            size={
                                                                16
                                                            }
                                                        />
                                                        {formatFixtureTime(
                                                            fixture.scheduledAt,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <TeamBlock
                                                name={
                                                    fixture.awayTeamName
                                                }
                                                badge={
                                                    fixture.awayTeamBadge
                                                }
                                                label="Away"
                                                accentColour={
                                                    accentColour
                                                }
                                                align="left"
                                            />
                                        </div>

                                        <div
                                            className="mt-6 rounded-xl border p-4"
                                            style={{
                                                borderColor:
                                                    `${accentColour}20`,
                                                background:
                                                    `${backgroundColour}80`,
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <UserRoundCheck
                                                    size={18}
                                                    color={
                                                        accentColour
                                                    }
                                                />

                                                <strong>
                                                    Match Officials
                                                </strong>
                                            </div>

                                            {fixture.officials.length > 0 ? (
                                                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                    {fixture.officials.map(
                                                        (
                                                            official,
                                                            index,
                                                        ) => (
                                                            <div
                                                                key={`${fixture.id}-${official.officialId}-${official.role}-${index}`}
                                                                className="rounded-lg border border-white/10 bg-black/10 px-4 py-3"
                                                            >
                                                                <span
                                                                    className="block text-[11px] font-black uppercase tracking-[0.12em]"
                                                                    style={{
                                                                        color:
                                                                            accentColour,
                                                                    }}
                                                                >
                                                                    {formatOfficialRole(
                                                                        official.role,
                                                                    )}
                                                                </span>

                                                                <span className="mt-1 block text-sm font-bold">
                                                                    {
                                                                        official.displayName
                                                                    }
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="mt-3 text-sm opacity-70">
                                                    Referee: To Be Appointed
                                                </p>
                                            )}
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
                                                            fixture.venueName
                                                        }
                                                    </strong>

                                                    {fixture.venueAddress ? (
                                                        <span className="mt-1 block text-xs opacity-60">
                                                            {
                                                                fixture.venueAddress
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

type TeamBlockProps = {
    name: string;
    badge: string;
    label: string;
    accentColour: string;
    align: "left" | "right";
};

function TeamBlock({
    name,
    badge,
    label,
    accentColour,
    align,
}: TeamBlockProps) {
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
                        src={badge}
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
                <span className="text-xs font-black uppercase tracking-[0.15em] opacity-50">
                    {label}
                </span>

                <h3 className="mt-1 text-xl font-black">
                    {name}
                </h3>
            </div>
        </div>
    );
}
