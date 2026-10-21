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
    homeScore?: number | null;
    awayScore?: number | null;
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
    const [publishedScores, setPublishedScores] = useState<Record<string, {home: number; away: number}>>({});
    const [fixtures, setFixtures] =
        useState<FixtureViewModel[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [searchTerm, setSearchTerm] =
        useState("");

    const [fixtureView, setFixtureView] = useState<'upcoming' | 'results' | 'all'>('upcoming');

    const [
        selectedCompetitionId,
        setSelectedCompetitionId,
    ] = useState("all");

    useEffect(() => {
        async function loadFixtures() {
            setLoading(true);
            setErrorMessage("");

            try {
                // Fixtures belong to competitions, not directly to organisations.
                // Reuse the same competition-team joins as the working public homepage.
                const competitionIds = competitions.map((item) => item.id).filter(Boolean);
                if (competitionIds.length === 0) {
                    setFixtures([]);
                    return;
                }

                const { data, error } = await supabase
                    .from("fixtures")
                    .select(`
                        id, competition_id, stage, kickoff_time, status, venue_id,
                        home_competition_team:competition_teams!fixtures_home_competition_team_fkey (
                            id, team_id, team:teams!competition_teams_team_id_fkey (id, name, logo_url)
                        ),
                        away_competition_team:competition_teams!fixtures_away_competition_team_fkey (
                            id, team_id, team:teams!competition_teams_team_id_fkey (id, name, logo_url)
                        ),
                        venue:venues!fixtures_venue_id_fkey (id, name, address, postcode)
                    `)
                    .in("competition_id", competitionIds)
                    .neq("status", "cancelled")
                    .order("kickoff_time", { ascending: true, nullsFirst: false });

                if (error) {
                    console.error("Failed to load public fixtures:", error);
                    setFixtures([]);
                    setErrorMessage("Unable to load fixtures right now.");
                    return;
                }

                // The existing query filters by the current organisation's competition IDs.
                // Do not depend on the non-existent fixtures.organisation_id column.
                const records = (data ?? []) as unknown as Array<Record<string, unknown>>;
                const unpack = (value: unknown): Record<string, unknown> => {
                    const entry = Array.isArray(value) ? value[0] : value;
                    return entry && typeof entry === 'object'
                        ? entry as Record<string, unknown> : {};
                };
                const label = (value: unknown) => typeof value === 'string' ? value : '';
                const visibleRows: PublicFixtureRow[] = records.map((record) => {
                    const homeLink = unpack(record.home_competition_team);
                    const awayLink = unpack(record.away_competition_team);
                    const home = unpack(homeLink.team);
                    const away = unpack(awayLink.team);
                    const venue = unpack(record.venue);
                    const competitionId = label(record.competition_id);
                    const sourceCompetition = competitions.find(item => item.id === competitionId);
                    return {
                        id: label(record.id),
                        competition_id: competitionId,
                        competition: { id: competitionId, name: sourceCompetition?.name ?? 'Competition' },
                        home_team: { id: label(home.id), name: label(home.name), logo_url: label(home.logo_url) },
                        away_team: { id: label(away.id), name: label(away.name), logo_url: label(away.logo_url) },
                        venue: { id: label(venue.id), name: label(venue.name), address: [label(venue.address),label(venue.postcode)].filter(Boolean).join(', ') },
                        scheduled_at: label(record.kickoff_time),
                        status: label(record.status) || 'scheduled',
                        round_name: label(record.stage).replace(/_/g,' '),
                    };
                }).filter(item=>item.id);

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

                // Published results are the source of truth for completed matches.
                const { data: resultRows, error: resultError } = await supabase
                    .from("public_results")
                    .select("fixture_id, home_score, away_score, published")
                    .in("competition_id", competitionIds);
                if (resultError) {
                    console.error("Failed to load published scores:", resultError);
                    setPublishedScores({});
                } else {
                    const scores: Record<string, {home: number; away: number}> = {};
                    for (const result of resultRows ?? []) {
                        if (result.published === false || !result.fixture_id ||
                            typeof result.home_score !== "number" || typeof result.away_score !== "number") continue;
                        scores[result.fixture_id] = {home: result.home_score, away: result.away_score};
                    }
                    setPublishedScores(scores);
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

            const now = Date.now();
            const visible = fixtures.filter(
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

                    if (!competitionMatches || !searchMatches) return false;
                    const matchTime = Date.parse(fixture.scheduledAt);
                    const hasPublishedResult = Object.prototype.hasOwnProperty.call(publishedScores, fixture.id);
                    const completed = hasPublishedResult || /completed|finished|played|full.time/i.test(fixture.status);
                    if (fixtureView === 'upcoming') return !completed && (!Number.isFinite(matchTime) || matchTime >= now);
                    if (fixtureView === 'results') return completed;
                    return true;
                },
            );
            return [...visible].sort((a, b) => {
                const aTime = Date.parse(a.scheduledAt) || 0;
                const bTime = Date.parse(b.scheduledAt) || 0;
                return fixtureView === 'upcoming' ? aTime - bTime : bTime - aTime;
            });
        }, [
            fixtures,
            selectedCompetitionId,
            searchTerm,
            fixtureView,
            publishedScores,
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
                className="border-b py-8 sm:py-10"
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

                    <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">
                        Fixtures &amp; Results
                    </h1>

                    <p className="mt-3 max-w-3xl text-sm leading-6 opacity-75 sm:text-base">
                        View upcoming fixtures and published results,
                        kick-off times, venues and appointed officials for{" "}
                        <strong>
                            {organisationName}
                        </strong>
                        .
                    </p>
                </div>
            </section>

            <section className="py-6">
                <div
                    className="mx-auto"
                    style={{
                        width: pageWidth,
                    }}
                >
                    <div className="mb-5 flex flex-wrap gap-2" aria-label="Fixture view">
                        {([['upcoming', 'Fixtures'], ['results', 'Results'], ['all', 'All Matches']] as const).map(([key, label]) => (
                            <button key={key} type="button" onClick={() => setFixtureView(key)}
                                aria-pressed={fixtureView === key}
                                className="rounded-xl border px-4 py-2 text-sm font-bold"
                                style={{ background: fixtureView === key ? accentColour : surfaceColour,
                                    color: fixtureView === key ? accentTextColour : textColour,
                                    borderColor: `${accentColour}55` }}>
                                {label}
                            </button>
                        ))}
                    </div>
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
                                {fixtureView === 'upcoming' ? 'No upcoming fixtures' : fixtureView === 'results' ? 'No results found' : 'No fixtures found'}
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
                                                    {publishedScores[fixture.id]
                                                        ? `${publishedScores[fixture.id].home} - ${publishedScores[fixture.id].away}`
                                                        : "VS"}
                                                </strong>
                                                {publishedScores[fixture.id] && <>
                                                    <span className="block text-xs font-bold opacity-70">FULL TIME</span>
                                                    <a className="mt-2 inline-block text-xs font-bold underline" href={`${basePath}/results`} style={{ color: accentColour }}>View results</a>
                                                </>}

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
