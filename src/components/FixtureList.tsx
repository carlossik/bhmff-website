import {
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    MapPin,
    UserRoundCheck,
} from 'lucide-react'

import { supabase } from '../lib/supabaseClient'
import { useOptionalPublicOrganisation } from '../context/PublicOrganisationContext'

export type PublicFixtureOfficial = {
    officialId: string
    role: string
    displayName: string
}

export type PublicFixture = {
    id: string
    stage: string
    kickoffTime: string | null
    status: string
    homeTeam: string
    awayTeam: string
    venueName: string
    venueAddress: string
    venuePostcode: string
    venueNotes: string
    officials?: PublicFixtureOfficial[]
}

type FixtureListProps = {
    fixtures: PublicFixture[]
}

type PublicFixtureOfficialRow = {
    fixture_id: string
    official_id: string
    role: string
    display_name: string
}

function formatKickoff(
    kickoffTime: string | null,
) {
    if (!kickoffTime) {
        return {
            date: 'Date to be confirmed',
            time: 'Time to be confirmed',
        }
    }

    const kickoff = new Date(kickoffTime)

    return {
        date: new Intl.DateTimeFormat(
            'en-GB',
            {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            },
        ).format(kickoff),

        time: new Intl.DateTimeFormat(
            'en-GB',
            {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            },
        ).format(kickoff),
    }
}

function formatStatus(status: string) {
    return status
        .replace(/_/g, ' ')
        .replace(
            /\b\w/g,
            (character: string) =>
                character.toUpperCase(),
        )
}

function extractUrl(value: string) {
    const match =
        value.match(
            /https?:\/\/[^\s]+/,
        )

    return match?.[0] ?? null
}

function removeUrl(value: string) {
    return value
        .replace(
            /https?:\/\/[^\s]+/,
            '',
        )
        .trim()
}

function formatOfficialRole(
    role: string,
) {
    switch (role) {
        case 'referee':
            return 'Referee'

        case 'assistant_referee':
            return 'Assistant Referee'

        case 'fourth_official':
            return 'Fourth Official'

        case 'match_commissioner':
            return 'Match Commissioner'

        case 'assessor':
            return 'Assessor'

        case 'observer':
            return 'Observer'

        default:
            return role
                .split('_')
                .map(
                    (word) =>
                        word.charAt(0)
                            .toUpperCase() +
                        word.slice(1),
                )
                .join(' ')
    }
}

function sortOfficials(
    officials: PublicFixtureOfficial[],
) {
    const roleOrder =
        new Map<string, number>([
            ['referee', 0],
            ['assistant_referee', 1],
            ['fourth_official', 2],
            ['match_commissioner', 3],
            ['assessor', 4],
            ['observer', 5],
        ])

    return [...officials].sort(
        (first, second) => {
            const firstRoleOrder =
                roleOrder.get(
                    first.role,
                ) ?? 99

            const secondRoleOrder =
                roleOrder.get(
                    second.role,
                ) ?? 99

            if (
                firstRoleOrder !==
                secondRoleOrder
            ) {
                return (
                    firstRoleOrder -
                    secondRoleOrder
                )
            }

            return first.displayName.localeCompare(
                second.displayName,
                'en-GB',
                {
                    sensitivity: 'base',
                },
            )
        },
    )
}

export function FixtureList({
    fixtures,
}: FixtureListProps) {
    const publicOrganisation =
        useOptionalPublicOrganisation()

    const organisationId =
        publicOrganisation
            ?.organisationId ?? null

    const [
        officialsByFixture,
        setOfficialsByFixture,
    ] = useState<
        Map<
            string,
            PublicFixtureOfficial[]
        >
    >(new Map())

    const [
        officialsLoading,
        setOfficialsLoading,
    ] = useState(false)

    const fixtureIds =
        useMemo(
            () =>
                fixtures.map(
                    (fixture) =>
                        fixture.id,
                ),
            [fixtures],
        )

    const fixtureIdsKey =
        fixtureIds.join('|')

    useEffect(() => {
        let disposed = false

        async function loadOfficials() {
            if (
                !organisationId ||
                fixtureIds.length === 0
            ) {
                if (!disposed) {
                    setOfficialsByFixture(
                        new Map(),
                    )
                    setOfficialsLoading(false)
                }

                return
            }

            setOfficialsLoading(true)

            const {
                data,
                error,
            } = await supabase.rpc(
                'get_public_fixture_officials',
                {
                    p_organisation_id:
                        organisationId,
                },
            )

            if (disposed) {
                return
            }

            if (error) {
                console.error(
                    'Failed to load public fixture officials:',
                    error,
                )

                setOfficialsByFixture(
                    new Map(),
                )
                setOfficialsLoading(false)

                return
            }

            const fixtureIdSet =
                new Set(fixtureIds)

            const nextMap =
                new Map<
                    string,
                    PublicFixtureOfficial[]
                >()

            for (
                const row of
                (data ??
                    []) as PublicFixtureOfficialRow[]
            ) {
                if (
                    !fixtureIdSet.has(
                        row.fixture_id,
                    )
                ) {
                    continue
                }

                const existing =
                    nextMap.get(
                        row.fixture_id,
                    ) ?? []

                existing.push({
                    officialId:
                        row.official_id,
                    role:
                        row.role,
                    displayName:
                        row.display_name,
                })

                nextMap.set(
                    row.fixture_id,
                    existing,
                )
            }

            for (
                const [
                    fixtureId,
                    appointmentRows,
                ] of nextMap
            ) {
                nextMap.set(
                    fixtureId,
                    sortOfficials(
                        appointmentRows,
                    ),
                )
            }

            setOfficialsByFixture(
                nextMap,
            )
            setOfficialsLoading(false)
        }

        void loadOfficials()

        return () => {
            disposed = true
        }
    }, [
        organisationId,
        fixtureIdsKey,
    ])

    if (!fixtures.length) {
        return (
            <div className="teamsEmptyState">
                <h3>
                    Fixtures coming soon
                </h3>

                <p>
                    Confirmed fixtures will
                    appear here once they are
                    published by the organisers.
                </p>
            </div>
        )
    }

    return (
        <div className="fixtureGrid">
            {fixtures.map(
                (fixture) => {
                    const kickoff =
                        formatKickoff(
                            fixture.kickoffTime,
                        )

                    const mapUrl =
                        extractUrl(
                            fixture.venueNotes,
                        )

                    const venueNotes =
                        removeUrl(
                            fixture.venueNotes,
                        )

                    const officials =
                        fixture.officials?.length
                            ? sortOfficials(
                                  fixture.officials,
                              )
                            : officialsByFixture.get(
                                  fixture.id,
                              ) ?? []

                    return (
                        <article
                            className="fixtureCard"
                            key={
                                fixture.id
                            }
                        >
                            <div className="fixtureMain">
                                <span className="badge">
                                    {
                                        fixture.stage
                                    }
                                </span>

                                <h3>
                                    {
                                        fixture.homeTeam
                                    }{' '}
                                    vs{' '}
                                    {
                                        fixture.awayTeam
                                    }
                                </h3>

                                <p className="fixtureKickoff">
                                    {
                                        kickoff.date
                                    }

                                    <span>
                                        Kick-off:{' '}
                                        {
                                            kickoff.time
                                        }
                                    </span>
                                </p>

                                <div className="fixtureVenue">
                                    <div className="flex items-start gap-3">
                                        <MapPin
                                            aria-hidden="true"
                                            className="mt-0.5 h-5 w-5 shrink-0 text-[var(--organisation-accent)]"
                                        />

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col gap-1">
                                                <strong className="block">
                                                    {
                                                        fixture.venueName
                                                    }
                                                </strong>

                                                {fixture.venueAddress && (
                                                    <span className="block text-sm opacity-75">
                                                        {
                                                            fixture.venueAddress
                                                        }
                                                    </span>
                                                )}

                                                {fixture.venuePostcode && (
                                                    <span className="block text-sm opacity-75">
                                                        {
                                                            fixture.venuePostcode
                                                        }
                                                    </span>
                                                )}

                                                {venueNotes && (
                                                    <small className="block pt-1 leading-5 opacity-70">
                                                        {
                                                            venueNotes
                                                        }
                                                    </small>
                                                )}
                                            </div>

                                            {mapUrl && (
                                                <div className="mt-4">
                                                    <a
                                                        className="fixtureMapLink inline-flex items-center rounded-full border border-[color:var(--organisation-accent)]/35 px-4 py-2 text-sm font-black no-underline transition hover:bg-[color:var(--organisation-accent)]/10"
                                                        href={
                                                            mapUrl
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        View on Google Maps
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4">
                                    <div className="flex items-center gap-2">
                                        <UserRoundCheck
                                            aria-hidden="true"
                                            className="h-5 w-5 text-[var(--organisation-accent)]"
                                        />

                                        <strong className="text-sm">
                                            Match
                                            Officials
                                        </strong>
                                    </div>

                                    {officialsLoading &&
                                    officials.length ===
                                        0 ? (
                                        <p className="mt-3 text-sm opacity-60">
                                            Loading
                                            appointments...
                                        </p>
                                    ) : officials.length >
                                      0 ? (
                                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                            {officials.map(
                                                (
                                                    official,
                                                    index,
                                                ) => (
                                                    <div
                                                        key={`${fixture.id}-${official.officialId}-${official.role}-${index}`}
                                                        className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2.5"
                                                    >
                                                        <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-[var(--organisation-accent)]">
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
                                        <p className="mt-3 text-sm opacity-65">
                                            Referee:
                                            To Be
                                            Appointed
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="scoreBox">
                                <strong>
                                    VS
                                </strong>

                                <span>
                                    {formatStatus(
                                        fixture.status,
                                    )}
                                </span>
                            </div>
                        </article>
                    )
                },
            )}
        </div>
    )
}
