import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
} from 'react'
import {
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronRight,
    CircleDot,
    Clock3,
    Crown,
    Goal,
    ListChecks,
    LoaderCircle,
    MapPin,
    RefreshCw,
    RotateCcw,
    Save,
    ShieldCheck,
    Shirt,
    Users,
    XCircle,
} from 'lucide-react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { TournamentHQBrand } from '../../common/TournamentHQBrand'
import { clubMatchCentreService } from './clubMatchCentreService'
import type {
    ClubMatchCentreFixture,
    ClubMatchCentreRosterPlayer,
    ClubMatchCentreSeason,
    ClubMatchCentreSquad,
    ClubMatchCentreTeam,
    ClubMatchSelectionRole,
    ClubMatchSquadStatus,
} from './clubMatchCentreTypes'

type PlayerDraft = {
    selected: boolean
    selectionRole: ClubMatchSelectionRole
    isCaptain: boolean
    isGoalkeeper: boolean
}

type PlayerDraftByMemberId = Record<string, PlayerDraft>

function todayLocalIso(): string {
    const now = new Date()
    const local = new Date(
        now.getTime() - now.getTimezoneOffset() * 60_000,
    )

    return local.toISOString().slice(0, 10)
}

function formatDate(value: string): string {
    const date = new Date(`${value}T12:00:00`)

    if (Number.isNaN(date.getTime())) return value

    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date)
}

function formatTime(value: string | null): string {
    if (!value) return 'Kick-off TBC'
    return value.slice(0, 5)
}

function titleCase(value: string): string {
    return value
        .split('_')
        .map((part) =>
            part.length > 0
                ? `${part.charAt(0).toUpperCase()}${part.slice(1)}`
                : part,
        )
        .join(' ')
}

function fixtureTitle(
    fixture: ClubMatchCentreFixture,
    teamName: string,
): string {
    if (fixture.homeAway === 'away') {
        return `${fixture.opponentName} vs ${teamName}`
    }

    if (fixture.homeAway === 'neutral') {
        return `${teamName} vs ${fixture.opponentName}`
    }

    return `${teamName} vs ${fixture.opponentName}`
}

function statusClasses(status: string): string {
    switch (status) {
        case 'confirmed':
            return 'border-lime-400/35 bg-lime-400/10 text-lime-300'
        case 'played':
        case 'completed':
            return 'border-sky-400/35 bg-sky-400/10 text-sky-200'
        case 'cancelled':
        case 'abandoned':
            return 'border-rose-400/35 bg-rose-400/10 text-rose-200'
        case 'postponed':
            return 'border-amber-400/35 bg-amber-400/10 text-amber-200'
        case 'draft':
            return 'border-slate-500/35 bg-slate-500/10 text-slate-300'
        default:
            return 'border-[color:var(--organisation-border)] bg-black/20 text-[color:var(--organisation-text)]/75'
    }
}

function createDraft(
    roster: ClubMatchCentreRosterPlayer[],
    matchSquad: ClubMatchCentreSquad | null,
): PlayerDraftByMemberId {
    const existingByMemberId = new Map(
        (matchSquad?.members ?? []).map((member) => [
            member.squadMemberId,
            member,
        ]),
    )

    const result: PlayerDraftByMemberId = {}

    roster.forEach((player) => {
        const existing = existingByMemberId.get(player.squadMemberId)

        result[player.squadMemberId] = {
            selected: Boolean(existing),
            selectionRole: existing?.selectionRole ?? 'starter',
            isCaptain: existing?.isCaptain ?? false,
            isGoalkeeper: existing?.isGoalkeeper ?? false,
        }
    })

    return result
}

function chooseDefaultFixture(
    fixtures: ClubMatchCentreFixture[],
): string {
    if (fixtures.length === 0) return ''

    const today = todayLocalIso()
    const live = fixtures.find(
        (fixture) =>
            fixture.fixtureDate >= today &&
            !['cancelled', 'postponed', 'abandoned'].includes(
                fixture.status,
            ),
    )

    return live?.id ?? fixtures[fixtures.length - 1]?.id ?? ''
}

function MatchSquadBadge({
    status,
    count,
}: {
    status: ClubMatchSquadStatus | null
    count: number
}) {
    if (!status) {
        return (
            <span className="inline-flex items-center rounded-full border border-slate-600/35 bg-slate-900/40 px-2.5 py-1 text-[11px] font-bold text-slate-400">
                No squad
            </span>
        )
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClasses(status)}`}
        >
            {status === 'confirmed' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
            ) : status === 'completed' ? (
                <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
                <CircleDot className="h-3.5 w-3.5" />
            )}
            {titleCase(status)} · {count}
        </span>
    )
}

export function ClubMatchCentre() {
    const { currentOrganisation } = useOrganisation()
    const organisationId = currentOrganisation?.id ?? null

    const [seasons, setSeasons] = useState<ClubMatchCentreSeason[]>([])
    const [seasonId, setSeasonId] = useState('')
    const [teams, setTeams] = useState<ClubMatchCentreTeam[]>([])
    const [teamId, setTeamId] = useState('')
    const [fixtures, setFixtures] = useState<ClubMatchCentreFixture[]>([])
    const [fixtureId, setFixtureId] = useState('')
    const [roster, setRoster] = useState<ClubMatchCentreRosterPlayer[]>([])
    const [matchSquad, setMatchSquad] = useState<ClubMatchCentreSquad | null>(null)
    const [draft, setDraft] = useState<PlayerDraftByMemberId>({})
    const [notes, setNotes] = useState('')

    const [loadingSeasons, setLoadingSeasons] = useState(false)
    const [loadingTeams, setLoadingTeams] = useState(false)
    const [loadingFixtures, setLoadingFixtures] = useState(false)
    const [loadingSquad, setLoadingSquad] = useState(false)
    const [saving, setSaving] = useState(false)

    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)

    const selectedSeason = useMemo(
        () => seasons.find((season) => season.id === seasonId) ?? null,
        [seasonId, seasons],
    )

    const selectedTeam = useMemo(
        () => teams.find((team) => team.id === teamId) ?? null,
        [teamId, teams],
    )

    const selectedFixture = useMemo(
        () => fixtures.find((fixture) => fixture.id === fixtureId) ?? null,
        [fixtureId, fixtures],
    )

    const selectedPlayers = useMemo(
        () =>
            roster.filter(
                (player) => draft[player.squadMemberId]?.selected,
            ),
        [draft, roster],
    )

    const starterCount = useMemo(
        () =>
            selectedPlayers.filter(
                (player) =>
                    draft[player.squadMemberId]?.selectionRole === 'starter',
            ).length,
        [draft, selectedPlayers],
    )

    const substituteCount = selectedPlayers.length - starterCount

    const isCompleted = matchSquad?.status === 'completed'
    const isConfirmed = matchSquad?.status === 'confirmed'
    const isLocked = Boolean(isCompleted || isConfirmed)

    const visibleRoster = useMemo(() => {
        const existingIds = new Set(
            (matchSquad?.members ?? []).map((member) => member.squadMemberId),
        )

        return roster.filter(
            (player) => player.active || existingIds.has(player.squadMemberId),
        )
    }, [matchSquad?.members, roster])

    const loadSeasons = useCallback(async () => {
        if (!organisationId) {
            setSeasons([])
            setSeasonId('')
            return
        }

        try {
            setLoadingSeasons(true)
            setError(null)

            const rows = await clubMatchCentreService.getSeasons(
                organisationId,
            )

            setSeasons(rows)
            setSeasonId((previous) => {
                if (rows.some((season) => season.id === previous)) {
                    return previous
                }

                return (
                    rows.find((season) => season.status === 'active')?.id ??
                    rows[0]?.id ??
                    ''
                )
            })
        } catch (caughtError) {
            console.error(caughtError)
            setSeasons([])
            setSeasonId('')
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to load Match Centre seasons.',
            )
        } finally {
            setLoadingSeasons(false)
        }
    }, [organisationId])

    const loadTeams = useCallback(async () => {
        if (!organisationId || !seasonId) {
            setTeams([])
            setTeamId('')
            return
        }

        try {
            setLoadingTeams(true)
            setError(null)

            const rows = await clubMatchCentreService.getTeams(
                organisationId,
                seasonId,
            )

            setTeams(rows)
            setTeamId((previous) => {
                if (rows.some((team) => team.id === previous)) {
                    return previous
                }

                return (
                    rows.find((team) => team.teamSeasonStatus === 'active')
                        ?.id ??
                    rows[0]?.id ??
                    ''
                )
            })
        } catch (caughtError) {
            console.error(caughtError)
            setTeams([])
            setTeamId('')
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to load Match Centre teams.',
            )
        } finally {
            setLoadingTeams(false)
        }
    }, [organisationId, seasonId])

    const loadFixtures = useCallback(async () => {
        if (!organisationId || !seasonId || !teamId) {
            setFixtures([])
            setFixtureId('')
            return
        }

        try {
            setLoadingFixtures(true)
            setError(null)

            const rows = await clubMatchCentreService.getFixtures(
                organisationId,
                seasonId,
                teamId,
            )

            setFixtures(rows)
            setFixtureId((previous) =>
                rows.some((fixture) => fixture.id === previous)
                    ? previous
                    : chooseDefaultFixture(rows),
            )
        } catch (caughtError) {
            console.error(caughtError)
            setFixtures([])
            setFixtureId('')
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to load club fixtures for Match Centre.',
            )
        } finally {
            setLoadingFixtures(false)
        }
    }, [organisationId, seasonId, teamId])

    const loadSelectedMatch = useCallback(async () => {
        if (
            !organisationId ||
            !seasonId ||
            !teamId ||
            !fixtureId
        ) {
            setRoster([])
            setMatchSquad(null)
            setDraft({})
            setNotes('')
            return
        }

        try {
            setLoadingSquad(true)
            setError(null)
            setNotice(null)

            const [rosterRows, squad] = await Promise.all([
                clubMatchCentreService.getSeasonRoster(
                    organisationId,
                    seasonId,
                    teamId,
                ),
                clubMatchCentreService.getMatchSquad(
                    organisationId,
                    fixtureId,
                ),
            ])

            setRoster(rosterRows)
            setMatchSquad(squad)
            setDraft(createDraft(rosterRows, squad))
            setNotes(squad?.notes ?? '')
        } catch (caughtError) {
            console.error(caughtError)
            setRoster([])
            setMatchSquad(null)
            setDraft({})
            setNotes('')
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to load the matchday squad.',
            )
        } finally {
            setLoadingSquad(false)
        }
    }, [fixtureId, organisationId, seasonId, teamId])

    useEffect(() => {
        setSeasons([])
        setSeasonId('')
        setTeams([])
        setTeamId('')
        setFixtures([])
        setFixtureId('')
        setRoster([])
        setMatchSquad(null)
        setDraft({})
        setNotes('')
        setError(null)
        setNotice(null)
        void loadSeasons()
    }, [loadSeasons])

    useEffect(() => {
        setTeams([])
        setTeamId('')
        setFixtures([])
        setFixtureId('')
        setRoster([])
        setMatchSquad(null)
        setDraft({})
        setNotes('')
        void loadTeams()
    }, [loadTeams])

    useEffect(() => {
        setFixtures([])
        setFixtureId('')
        setRoster([])
        setMatchSquad(null)
        setDraft({})
        setNotes('')
        void loadFixtures()
    }, [loadFixtures])

    useEffect(() => {
        void loadSelectedMatch()
    }, [loadSelectedMatch])

    function updatePlayerDraft(
        squadMemberId: string,
        updater: (current: PlayerDraft) => PlayerDraft,
    ): void {
        if (isLocked || saving) return

        setDraft((current) => {
            const existing = current[squadMemberId] ?? {
                selected: false,
                selectionRole: 'starter' as ClubMatchSelectionRole,
                isCaptain: false,
                isGoalkeeper: false,
            }

            return {
                ...current,
                [squadMemberId]: updater(existing),
            }
        })
    }

    function togglePlayer(player: ClubMatchCentreRosterPlayer): void {
        if (!player.active && !draft[player.squadMemberId]?.selected) {
            return
        }

        updatePlayerDraft(player.squadMemberId, (current) => ({
            ...current,
            selected: !current.selected,
            isCaptain: current.selected ? false : current.isCaptain,
            isGoalkeeper: current.selected ? false : current.isGoalkeeper,
        }))
    }

    function setRole(
        squadMemberId: string,
        selectionRole: ClubMatchSelectionRole,
    ): void {
        updatePlayerDraft(squadMemberId, (current) => ({
            ...current,
            selected: true,
            selectionRole,
        }))
    }

    function setCaptain(squadMemberId: string, checked: boolean): void {
        if (isLocked || saving) return

        setDraft((current) => {
            const next: PlayerDraftByMemberId = {}

            Object.entries(current).forEach(([memberId, value]) => {
                next[memberId] = {
                    ...value,
                    isCaptain:
                        memberId === squadMemberId
                            ? checked && value.selected
                            : checked
                              ? false
                              : value.isCaptain,
                }
            })

            return next
        })
    }

    function setGoalkeeper(squadMemberId: string, checked: boolean): void {
        updatePlayerDraft(squadMemberId, (current) => ({
            ...current,
            selected: true,
            isGoalkeeper: checked,
        }))
    }

    function selectAllActive(): void {
        if (isLocked || saving) return

        setDraft((current) => {
            const next = { ...current }

            roster.forEach((player) => {
                if (!player.active) return

                next[player.squadMemberId] = {
                    ...(next[player.squadMemberId] ?? {
                        selectionRole: 'starter' as ClubMatchSelectionRole,
                        isCaptain: false,
                        isGoalkeeper: false,
                    }),
                    selected: true,
                }
            })

            return next
        })
    }

    function clearSelection(): void {
        if (isLocked || saving) return

        setDraft((current) => {
            const next: PlayerDraftByMemberId = {}

            Object.entries(current).forEach(([memberId, value]) => {
                next[memberId] = {
                    ...value,
                    selected: false,
                    isCaptain: false,
                    isGoalkeeper: false,
                }
            })

            return next
        })
    }

    async function saveSquad(
        status: 'draft' | 'confirmed',
        options?: { reopening?: boolean },
    ): Promise<void> {
        if (!organisationId || !selectedFixture) {
            setError('Select a fixture before saving a matchday squad.')
            return
        }

        if (status === 'confirmed' && selectedPlayers.length === 0) {
            setError('Select at least one player before confirming the squad.')
            return
        }

        const blockedFixture = ['cancelled', 'postponed', 'abandoned'].includes(
            selectedFixture.status,
        )

        if (status === 'confirmed' && blockedFixture) {
            setError(
                `This fixture is ${selectedFixture.status}. Change the fixture status before confirming a matchday squad.`,
            )
            return
        }

        try {
            setSaving(true)
            setError(null)
            setNotice(null)

            await clubMatchCentreService.saveMatchSquad({
                organisationId,
                fixtureId: selectedFixture.id,
                status,
                notes,
                published:
                    status === 'confirmed'
                        ? matchSquad?.published ?? false
                        : false,
                members: selectedPlayers.map((player) => ({
                    squadMemberId: player.squadMemberId,
                    selectionRole:
                        draft[player.squadMemberId]?.selectionRole ?? 'starter',
                    isCaptain:
                        draft[player.squadMemberId]?.isCaptain ?? false,
                    isGoalkeeper:
                        draft[player.squadMemberId]?.isGoalkeeper ?? false,
                })),
            })

            await Promise.all([loadFixtures(), loadSelectedMatch()])

            setNotice(
                options?.reopening
                    ? 'The squad is back in draft and can be edited.'
                    : status === 'confirmed'
                      ? 'Matchday squad confirmed.'
                      : 'Matchday squad saved as draft.',
            )
        } catch (caughtError) {
            console.error(caughtError)
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to save the matchday squad.',
            )
        } finally {
            setSaving(false)
        }
    }

    const hasOrganisation = Boolean(organisationId)

    return (
        <div className="space-y-6 font-['Inter',sans-serif] text-[var(--organisation-text)]">
            <section className="overflow-hidden rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] shadow-xl">
                <div className="flex flex-col gap-5 border-b border-[color:var(--organisation-border)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-[color:var(--organisation-accent)]/10 p-3">
                            <ListChecks className="h-7 w-7 text-[var(--organisation-accent)]" />
                        </div>

                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--organisation-accent)]">
                                Club Match Operations
                            </p>
                            <h2 className="mt-1 font-['Space_Grotesk',sans-serif] text-2xl font-black tracking-tight">
                                Match Centre
                            </h2>
                            <p className="mt-1 max-w-3xl text-sm leading-6 text-[color:var(--organisation-text)]/70">
                                Open a club fixture, prepare its matchday squad and confirm starters, substitutes, captain and goalkeeper before match activity is recorded.
                            </p>
                        </div>
                    </div>

                    <TournamentHQBrand
                        variant="compact"
                        size="sm"
                        className="max-w-[170px]"
                    />
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
                    <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--organisation-text)]/55">
                            Season
                        </span>
                        <div className="relative">
                            <select
                                value={seasonId}
                                onChange={(event: ChangeEvent<HTMLSelectElement>) => setSeasonId(event.target.value)}
                                disabled={!hasOrganisation || loadingSeasons}
                                className="min-h-11 w-full rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-4 py-2.5 text-sm font-semibold outline-none focus:border-[var(--organisation-accent)] disabled:opacity-50"
                            >
                                <option value="">
                                    {loadingSeasons
                                        ? 'Loading seasons...'
                                        : 'Select season'}
                                </option>
                                {seasons.map((season) => (
                                    <option key={season.id} value={season.id}>
                                        {season.seasonLabel} · {titleCase(season.status)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </label>

                    <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--organisation-text)]/55">
                            Team
                        </span>
                        <select
                            value={teamId}
                            onChange={(event: ChangeEvent<HTMLSelectElement>) => setTeamId(event.target.value)}
                            disabled={!seasonId || loadingTeams}
                            className="min-h-11 w-full rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-4 py-2.5 text-sm font-semibold outline-none focus:border-[var(--organisation-accent)] disabled:opacity-50"
                        >
                            <option value="">
                                {loadingTeams
                                    ? 'Loading teams...'
                                    : 'Select team'}
                            </option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <button
                        type="button"
                        onClick={() => {
                            void Promise.all([
                                loadFixtures(),
                                loadSelectedMatch(),
                            ])
                        }}
                        disabled={!teamId || loadingFixtures || loadingSquad}
                        className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color:var(--organisation-border)] bg-black/20 px-4 text-sm font-bold text-[var(--organisation-accent)] transition hover:bg-white/5 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${
                                loadingFixtures || loadingSquad
                                    ? 'animate-spin'
                                    : ''
                            }`}
                        />
                        Refresh
                    </button>
                </div>
            </section>

            {!hasOrganisation && (
                <section className="rounded-3xl border border-dashed border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-14 text-center">
                    <Users className="mx-auto h-9 w-9 text-[var(--organisation-accent)]" />
                    <h3 className="mt-4 text-lg font-black">
                        Select a club organisation
                    </h3>
                    <p className="mt-2 text-sm text-[color:var(--organisation-text)]/65">
                        Match Centre becomes available when a club organisation is selected.
                    </p>
                </section>
            )}

            {error && (
                <div
                    role="alert"
                    className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-200"
                >
                    {error}
                </div>
            )}

            {notice && (
                <div
                    role="status"
                    className="rounded-2xl border border-lime-400/30 bg-lime-400/10 px-5 py-4 text-sm font-semibold text-lime-200"
                >
                    {notice}
                </div>
            )}

            {hasOrganisation && seasonId && teamId && (
                <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <section className="overflow-hidden rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] shadow-xl">
                        <div className="border-b border-[color:var(--organisation-border)] px-5 py-4">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--organisation-accent)]">
                                Fixtures
                            </p>
                            <div className="mt-1 flex items-center justify-between gap-3">
                                <h3 className="font-['Space_Grotesk',sans-serif] text-lg font-black">
                                    {selectedTeam?.name ?? 'Selected team'}
                                </h3>
                                <span className="text-xs font-bold text-[color:var(--organisation-text)]/45">
                                    {fixtures.length}
                                </span>
                            </div>
                        </div>

                        {loadingFixtures ? (
                            <div className="flex items-center justify-center gap-2 px-5 py-14 text-sm text-[color:var(--organisation-text)]/60">
                                <LoaderCircle className="h-4 w-4 animate-spin text-[var(--organisation-accent)]" />
                                Loading fixtures...
                            </div>
                        ) : fixtures.length === 0 ? (
                            <div className="px-5 py-14 text-center">
                                <CalendarDays className="mx-auto h-8 w-8 text-[var(--organisation-accent)] opacity-70" />
                                <h4 className="mt-3 font-bold">No fixtures yet</h4>
                                <p className="mt-2 text-sm text-[color:var(--organisation-text)]/55">
                                    Add a fixture for this team before preparing a matchday squad.
                                </p>
                            </div>
                        ) : (
                            <div className="max-h-[760px] space-y-2 overflow-y-auto p-3">
                                {fixtures.map((fixture) => {
                                    const active = fixture.id === fixtureId

                                    return (
                                        <button
                                            key={fixture.id}
                                            type="button"
                                            onClick={() => setFixtureId(fixture.id)}
                                            className={`w-full rounded-2xl border p-4 text-left transition ${
                                                active
                                                    ? 'border-[var(--organisation-accent)] bg-[color:var(--organisation-accent)]/10 shadow-lg'
                                                    : 'border-[color:var(--organisation-border)] bg-black/15 hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-black">
                                                        {fixtureTitle(
                                                            fixture,
                                                            selectedTeam?.name ?? 'Club',
                                                        )}
                                                    </p>
                                                    <p className="mt-1 text-xs font-semibold text-[color:var(--organisation-text)]/55">
                                                        {formatDate(fixture.fixtureDate)} · {formatTime(fixture.kickoffTime)}
                                                    </p>
                                                </div>
                                                <ChevronRight
                                                    className={`h-4 w-4 shrink-0 ${
                                                        active
                                                            ? 'text-[var(--organisation-accent)]'
                                                            : 'text-[color:var(--organisation-text)]/30'
                                                    }`}
                                                />
                                            </div>

                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClasses(
                                                        fixture.status,
                                                    )}`}
                                                >
                                                    {titleCase(fixture.status)}
                                                </span>
                                                <MatchSquadBadge
                                                    status={fixture.matchSquadStatus}
                                                    count={fixture.matchSquadMemberCount}
                                                />
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </section>

                    <section className="min-w-0 overflow-hidden rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] shadow-xl">
                        {!selectedFixture ? (
                            <div className="px-6 py-20 text-center">
                                <ListChecks className="mx-auto h-10 w-10 text-[var(--organisation-accent)] opacity-70" />
                                <h3 className="mt-4 text-lg font-black">
                                    Select a fixture
                                </h3>
                                <p className="mt-2 text-sm text-[color:var(--organisation-text)]/60">
                                    Choose a fixture on the left to open its Match Centre.
                                </p>
                            </div>
                        ) : loadingSquad ? (
                            <div className="flex items-center justify-center gap-3 px-6 py-20 text-sm text-[color:var(--organisation-text)]/60">
                                <LoaderCircle className="h-5 w-5 animate-spin text-[var(--organisation-accent)]" />
                                Loading matchday squad...
                            </div>
                        ) : (
                            <>
                                <div className="border-b border-[color:var(--organisation-border)] p-6">
                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full border border-[color:var(--organisation-border)] bg-black/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--organisation-accent)]">
                                                    {titleCase(selectedFixture.fixtureType)}
                                                </span>
                                                <span
                                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClasses(
                                                        selectedFixture.status,
                                                    )}`}
                                                >
                                                    {titleCase(selectedFixture.status)}
                                                </span>
                                                <MatchSquadBadge
                                                    status={matchSquad?.status ?? null}
                                                    count={selectedPlayers.length}
                                                />
                                            </div>

                                            <h3 className="mt-3 font-['Space_Grotesk',sans-serif] text-2xl font-black tracking-tight">
                                                {fixtureTitle(
                                                    selectedFixture,
                                                    selectedTeam?.name ?? 'Club',
                                                )}
                                            </h3>

                                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[color:var(--organisation-text)]/65">
                                                <span className="inline-flex items-center gap-2">
                                                    <CalendarDays className="h-4 w-4 text-[var(--organisation-accent)]" />
                                                    {formatDate(selectedFixture.fixtureDate)}
                                                </span>
                                                <span className="inline-flex items-center gap-2">
                                                    <Clock3 className="h-4 w-4 text-[var(--organisation-accent)]" />
                                                    {formatTime(selectedFixture.kickoffTime)}
                                                </span>
                                                {selectedFixture.venueName && (
                                                    <span className="inline-flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-[var(--organisation-accent)]" />
                                                        {selectedFixture.venueName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid min-w-[240px] grid-cols-3 gap-2">
                                            <div className="rounded-xl border border-[color:var(--organisation-border)] bg-black/20 p-3 text-center">
                                                <strong className="block text-xl font-black">
                                                    {selectedPlayers.length}
                                                </strong>
                                                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--organisation-text)]/50">
                                                    Selected
                                                </span>
                                            </div>
                                            <div className="rounded-xl border border-[color:var(--organisation-border)] bg-black/20 p-3 text-center">
                                                <strong className="block text-xl font-black">
                                                    {starterCount}
                                                </strong>
                                                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--organisation-text)]/50">
                                                    Starters
                                                </span>
                                            </div>
                                            <div className="rounded-xl border border-[color:var(--organisation-border)] bg-black/20 p-3 text-center">
                                                <strong className="block text-xl font-black">
                                                    {substituteCount}
                                                </strong>
                                                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--organisation-text)]/50">
                                                    Subs
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {isCompleted && (
                                    <div className="mx-6 mt-6 rounded-2xl border border-sky-400/25 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100">
                                        This matchday squad is completed and is read-only. Match activity is preserved as historical data.
                                    </div>
                                )}

                                {isConfirmed && !isCompleted && (
                                    <div className="mx-6 mt-6 flex flex-col gap-3 rounded-2xl border border-lime-400/25 bg-lime-400/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-black text-lime-200">
                                                Squad confirmed
                                            </p>
                                            <p className="mt-1 text-xs text-lime-100/70">
                                                Reopen it only if the team selection needs to change before match activity starts.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void saveSquad('draft', {
                                                    reopening: true,
                                                })
                                            }
                                            disabled={saving}
                                            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-lime-300/30 bg-black/20 px-4 text-xs font-black text-lime-200 transition hover:bg-black/30 disabled:opacity-50"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Reopen squad
                                        </button>
                                    </div>
                                )}

                                <div className="p-6">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--organisation-accent)]">
                                                Matchday Squad
                                            </p>
                                            <h4 className="mt-1 text-lg font-black">
                                                Choose players
                                            </h4>
                                            <p className="mt-1 text-sm text-[color:var(--organisation-text)]/60">
                                                Active season-squad members can be selected. Existing historical selections remain visible even if a player is later made inactive.
                                            </p>
                                        </div>

                                        {!isLocked && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={selectAllActive}
                                                    disabled={saving || roster.length === 0}
                                                    className="min-h-10 rounded-xl border border-[color:var(--organisation-border)] bg-black/20 px-3 text-xs font-bold hover:bg-white/5 disabled:opacity-50"
                                                >
                                                    Select all active
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={clearSelection}
                                                    disabled={saving || selectedPlayers.length === 0}
                                                    className="min-h-10 rounded-xl border border-[color:var(--organisation-border)] bg-black/20 px-3 text-xs font-bold hover:bg-white/5 disabled:opacity-50"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {visibleRoster.length === 0 ? (
                                        <div className="mt-5 rounded-2xl border border-dashed border-[color:var(--organisation-border)] bg-black/10 px-5 py-12 text-center">
                                            <Users className="mx-auto h-8 w-8 text-[var(--organisation-accent)] opacity-70" />
                                            <h5 className="mt-3 font-bold">
                                                No season squad members
                                            </h5>
                                            <p className="mt-2 text-sm text-[color:var(--organisation-text)]/55">
                                                Add players to the team&apos;s season squad first.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="mt-5 overflow-hidden rounded-2xl border border-[color:var(--organisation-border)]">
                                            <div className="hidden grid-cols-[54px_minmax(200px,1fr)_130px_150px_90px_100px] gap-3 border-b border-[color:var(--organisation-border)] bg-black/20 px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--organisation-text)]/45 lg:grid">
                                                <span>Pick</span>
                                                <span>Player</span>
                                                <span>Status</span>
                                                <span>Role</span>
                                                <span>Captain</span>
                                                <span>Keeper</span>
                                            </div>

                                            <div className="divide-y divide-[color:var(--organisation-border)]">
                                                {visibleRoster.map((player) => {
                                                    const playerDraft = draft[
                                                        player.squadMemberId
                                                    ] ?? {
                                                        selected: false,
                                                        selectionRole:
                                                            'starter' as ClubMatchSelectionRole,
                                                        isCaptain: false,
                                                        isGoalkeeper: false,
                                                    }
                                                    const inactiveBlocked =
                                                        !player.active &&
                                                        !playerDraft.selected

                                                    return (
                                                        <div
                                                            key={player.squadMemberId}
                                                            className={`grid gap-3 px-4 py-4 lg:grid-cols-[54px_minmax(200px,1fr)_130px_150px_90px_100px] lg:items-center ${
                                                                playerDraft.selected
                                                                    ? 'bg-[color:var(--organisation-accent)]/[0.045]'
                                                                    : 'bg-transparent'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3 lg:block">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => togglePlayer(player)}
                                                                    disabled={
                                                                        isLocked ||
                                                                        saving ||
                                                                        inactiveBlocked
                                                                    }
                                                                    aria-pressed={playerDraft.selected}
                                                                    aria-label={`${
                                                                        playerDraft.selected
                                                                            ? 'Remove'
                                                                            : 'Select'
                                                                    } ${player.playerName}`}
                                                                    className={`flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                                                        playerDraft.selected
                                                                            ? 'border-[var(--organisation-accent)] bg-[var(--organisation-accent)] text-[var(--organisation-on-accent)]'
                                                                            : 'border-[color:var(--organisation-border)] bg-black/20 text-transparent hover:border-[var(--organisation-accent)]'
                                                                    }`}
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </button>
                                                                <span className="text-xs font-bold text-[color:var(--organisation-text)]/50 lg:hidden">
                                                                    {playerDraft.selected
                                                                        ? 'Selected'
                                                                        : 'Not selected'}
                                                                </span>
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-[color:var(--organisation-border)] bg-black/20 px-2 text-xs font-black text-[var(--organisation-accent)]">
                                                                        {player.squadNumber ?? '—'}
                                                                    </span>
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-black">
                                                                            {player.playerName}
                                                                        </p>
                                                                        <p className="mt-0.5 truncate text-xs text-[color:var(--organisation-text)]/50">
                                                                            {player.position || 'Position not set'}
                                                                            {!player.active
                                                                                ? ' · Inactive season member'
                                                                                : ''}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <span
                                                                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                                                                        player.registrationStatus ===
                                                                        'registered'
                                                                            ? 'border-lime-400/25 bg-lime-400/10 text-lime-300'
                                                                            : player.registrationStatus ===
                                                                                'not_registered'
                                                                              ? 'border-rose-400/25 bg-rose-400/10 text-rose-200'
                                                                              : 'border-amber-400/25 bg-amber-400/10 text-amber-200'
                                                                    }`}
                                                                >
                                                                    {titleCase(
                                                                        player.registrationStatus,
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <div>
                                                                <select
                                                                    value={playerDraft.selectionRole}
                                                                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                                                        setRole(
                                                                            player.squadMemberId,
                                                                            event.target.value as ClubMatchSelectionRole,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isLocked ||
                                                                        saving ||
                                                                        !playerDraft.selected
                                                                    }
                                                                    className="min-h-10 w-full rounded-lg border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-3 text-xs font-bold outline-none focus:border-[var(--organisation-accent)] disabled:opacity-45"
                                                                >
                                                                    <option value="starter">
                                                                        Starter
                                                                    </option>
                                                                    <option value="substitute">
                                                                        Substitute
                                                                    </option>
                                                                </select>
                                                            </div>

                                                            <label className="flex items-center gap-2 text-xs font-bold">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={playerDraft.isCaptain}
                                                                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                                        setCaptain(
                                                                            player.squadMemberId,
                                                                            event.target.checked,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isLocked ||
                                                                        saving ||
                                                                        !playerDraft.selected
                                                                    }
                                                                    className="h-4 w-4 accent-[var(--organisation-accent)]"
                                                                />
                                                                <Crown className="h-4 w-4 text-amber-300" />
                                                                <span className="lg:hidden">
                                                                    Captain
                                                                </span>
                                                            </label>

                                                            <label className="flex items-center gap-2 text-xs font-bold">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={playerDraft.isGoalkeeper}
                                                                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                                        setGoalkeeper(
                                                                            player.squadMemberId,
                                                                            event.target.checked,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isLocked ||
                                                                        saving ||
                                                                        !playerDraft.selected
                                                                    }
                                                                    className="h-4 w-4 accent-[var(--organisation-accent)]"
                                                                />
                                                                <Goal className="h-4 w-4 text-sky-300" />
                                                                <span className="lg:hidden">
                                                                    Goalkeeper
                                                                </span>
                                                            </label>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                                        <label className="space-y-2">
                                            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--organisation-text)]/55">
                                                Matchday squad notes
                                            </span>
                                            <textarea
                                                value={notes}
                                                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
                                                disabled={isLocked || saving}
                                                rows={3}
                                                placeholder="Optional internal notes for this matchday squad..."
                                                className="w-full resize-y rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-4 py-3 text-sm outline-none focus:border-[var(--organisation-accent)] disabled:opacity-55"
                                            />
                                        </label>

                                        {!isLocked && (
                                            <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => void saveSquad('draft')}
                                                    disabled={saving}
                                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color:var(--organisation-border)] bg-black/20 px-5 text-sm font-black transition hover:bg-white/5 disabled:opacity-50"
                                                >
                                                    {saving ? (
                                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Save className="h-4 w-4" />
                                                    )}
                                                    Save draft
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void saveSquad('confirmed')}
                                                    disabled={
                                                        saving ||
                                                        selectedPlayers.length === 0
                                                    }
                                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-5 text-sm font-black text-[var(--organisation-on-accent)] shadow-lg transition hover:brightness-105 disabled:opacity-50"
                                                >
                                                    {saving ? (
                                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <ShieldCheck className="h-4 w-4" />
                                                    )}
                                                    Confirm squad
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-xl border border-[color:var(--organisation-border)] bg-black/15 p-4">
                                            <Shirt className="h-4 w-4 text-[var(--organisation-accent)]" />
                                            <p className="mt-2 text-xs font-black">
                                                Squad snapshot
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-[color:var(--organisation-text)]/55">
                                                Player name, number and position are snapshotted into the match squad when saved.
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-[color:var(--organisation-border)] bg-black/15 p-4">
                                            <ShieldCheck className="h-4 w-4 text-[var(--organisation-accent)]" />
                                            <p className="mt-2 text-xs font-black">
                                                Confirmation lock
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-[color:var(--organisation-text)]/55">
                                                A confirmed squad is locked until deliberately reopened, protecting accidental changes.
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-[color:var(--organisation-border)] bg-black/15 p-4">
                                            {isLocked ? (
                                                <CheckCircle2 className="h-4 w-4 text-lime-300" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-[color:var(--organisation-text)]/45" />
                                            )}
                                            <p className="mt-2 text-xs font-black">
                                                Match activity safety
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-[color:var(--organisation-text)]/55">
                                                Once appearances or match events exist, squad membership cannot be rewritten from this setup screen.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            )}

            {hasOrganisation && !seasonId && !loadingSeasons && (
                <section className="rounded-3xl border border-dashed border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-14 text-center">
                    <CalendarDays className="mx-auto h-9 w-9 text-[var(--organisation-accent)]" />
                    <h3 className="mt-4 text-lg font-black">No club season available</h3>
                    <p className="mt-2 text-sm text-[color:var(--organisation-text)]/60">
                        Create a club season and assign a team to it before using Match Centre.
                    </p>
                </section>
            )}

            {hasOrganisation && seasonId && !teamId && !loadingTeams && (
                <section className="rounded-3xl border border-dashed border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-14 text-center">
                    <Users className="mx-auto h-9 w-9 text-[var(--organisation-accent)]" />
                    <h3 className="mt-4 text-lg font-black">No team in this season</h3>
                    <p className="mt-2 text-sm text-[color:var(--organisation-text)]/60">
                        Add a team to the selected season before preparing a matchday squad.
                    </p>
                </section>
            )}

            <span className="sr-only">
                Selected season: {selectedSeason?.seasonLabel ?? 'none'}
            </span>
        </div>
    )
}
