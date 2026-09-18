import { useCallback, useEffect, useState } from 'react'
import { useOrganisation } from '../../../context/OrganisationContext'
import { supabase } from '../../../lib/supabaseClient'

type Season = {
    id: string
    name: string
    status: string
}

type Fixture = {
    id: string
    fixture_date: string
    opponent_id: string | null
    club_opponents: { name: string } | null
}

type Player = {
    id: string
    player_id: string
    club_players: {
        first_name: string
        last_name: string
    } | null
}

type GoalType = 'player' | 'guest' | 'own_goal'

type Goal = {
    id: string
    fixture_id: string
    squad_member_id: string | null
    player_name: string
    minute: number | null
    video_timestamp: string | null
    goal_type: GoalType
}

const OWN_GOAL_LABEL = 'Own goal (opponent)'

export function ClubGoalsManager() {
    const { currentOrganisation } = useOrganisation()
    const [seasons, setSeasons] = useState<Season[]>([])
    const [seasonId, setSeasonId] = useState('')
    const [fixtures, setFixtures] = useState<Fixture[]>([])
    const [players, setPlayers] = useState<Player[]>([])
    const [goals, setGoals] = useState<Goal[]>([])
    const [fixtureId, setFixtureId] = useState('')
    const [goalType, setGoalType] = useState<GoalType>('player')
    const [playerId, setPlayerId] = useState('')
    const [playerName, setPlayerName] = useState('')
    const [minute, setMinute] = useState('')
    const [video, setVideo] = useState('')
    const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    const resetForm = useCallback(() => {
        setFixtureId('')
        setGoalType('player')
        setPlayerId('')
        setPlayerName('')
        setMinute('')
        setVideo('')
        setEditingGoalId(null)
    }, [])

    const load = useCallback(
        async (id: string) => {
            setMsg('')
            if (!id) {
                setFixtures([])
                setPlayers([])
                setGoals([])
                return
            }

            const [f, p, g] = await Promise.all([
                supabase
                    .from('club_fixtures')
                    .select('id,fixture_date,opponent_id,club_opponents(name)')
                    .eq('organisation_id', currentOrganisation.id)
                    .eq('season_id', id)
                    .order('fixture_date'),
                supabase
                    .from('club_squad_members')
                    .select('id,player_id,club_players(first_name,last_name)')
                    .eq('organisation_id', currentOrganisation.id)
                    .eq('season_id', id)
                    .eq('active', true),
                supabase
                    .from('club_goals')
                    .select(
                        'id,fixture_id,squad_member_id,player_name,minute,video_timestamp,goal_type',
                    )
                    .eq('organisation_id', currentOrganisation.id)
                    .eq('season_id', id)
                    .order('created_at', { ascending: false }),
            ])

            if (f.error || p.error || g.error) {
                setMsg(
                    f.error?.message ||
                        p.error?.message ||
                        g.error?.message ||
                        'Unable to load goals.',
                )
                return
            }

            setFixtures((f.data ?? []) as unknown as Fixture[])
            setPlayers((p.data ?? []) as unknown as Player[])
            setGoals((g.data ?? []) as Goal[])
        },
        [currentOrganisation.id],
    )

    useEffect(() => {
        void (async () => {
            const { data, error } = await supabase
                .from('club_seasons')
                .select('id,name,status')
                .eq('organisation_id', currentOrganisation.id)
                .order('start_date', { ascending: false })

            if (error) {
                setMsg(error.message)
                return
            }

            const rows = (data ?? []) as Season[]
            setSeasons(rows)
            const id =
                rows.find((season) => season.status === 'active')?.id ||
                rows[0]?.id ||
                ''
            setSeasonId(id)
            await load(id)
        })()
    }, [currentOrganisation.id, load])

    function startEdit(goal: Goal) {
        const nextGoalType = goal.goal_type

        setEditingGoalId(goal.id)
        setFixtureId(goal.fixture_id)
        setGoalType(nextGoalType)
        setPlayerId(nextGoalType === 'player' ? goal.squad_member_id ?? '' : '')
        setPlayerName(
            nextGoalType === 'own_goal' ? OWN_GOAL_LABEL : goal.player_name,
        )
        setMinute(goal.minute === null ? '' : String(goal.minute))
        setVideo(goal.video_timestamp ?? '')
        setMsg('Editing recorded goal. Update the scorer or goal details and save.')
    }

    function changeGoalType(nextGoalType: GoalType) {
        setGoalType(nextGoalType)
        setPlayerId('')

        if (nextGoalType === 'own_goal') {
            setPlayerName(OWN_GOAL_LABEL)
            return
        }

        setPlayerName('')
    }

    async function save() {
        if (!seasonId || !fixtureId) {
            setMsg('Select a fixture.')
            return
        }

        if (goalType === 'player' && (!playerId || !playerName.trim())) {
            setMsg('Select the player who scored the goal.')
            return
        }

        if (goalType === 'guest' && !playerName.trim()) {
            setMsg('Enter the guest player name.')
            return
        }

        const parsedMinute = minute ? Number(minute) : null
        if (
            parsedMinute !== null &&
            (!Number.isInteger(parsedMinute) ||
                parsedMinute < 1 ||
                parsedMinute > 130)
        ) {
            setMsg('Goal minute must be between 1 and 130.')
            return
        }

        const isOwnGoal = goalType === 'own_goal'
        const isGuestGoal = goalType === 'guest'
        const payload = {
            organisation_id: currentOrganisation.id,
            season_id: seasonId,
            fixture_id: fixtureId,
            squad_member_id: goalType === 'player' ? playerId : null,
            player_name: isOwnGoal ? OWN_GOAL_LABEL : playerName.trim(),
            goal_type: goalType,
            minute: parsedMinute,
            video_timestamp: video.trim() || null,
        }

        setSaving(true)
        setMsg('')

        try {
            if (editingGoalId) {
                const { data, error } = await supabase
                    .from('club_goals')
                    .update(payload)
                    .eq('id', editingGoalId)
                    .eq('organisation_id', currentOrganisation.id)
                    .eq('season_id', seasonId)
                    .select('id')
                    .maybeSingle()

                if (error) {
                    setMsg(error.message)
                    return
                }

                if (!data) {
                    setMsg(
                        'The goal was not updated. Refresh the page and try again.',
                    )
                    return
                }

                resetForm()
                setMsg(
                    isOwnGoal
                        ? 'Goal updated as an opponent own goal.'
                        : isGuestGoal
                          ? 'Guest player goal updated successfully.'
                          : 'Goal updated successfully.',
                )
            } else {
                const { error } = await supabase.from('club_goals').insert(payload)
                if (error) {
                    setMsg(error.message)
                    return
                }

                setMinute('')
                setVideo('')
                if (isOwnGoal || isGuestGoal) {
                    setGoalType('player')
                    setPlayerId('')
                    setPlayerName('')
                    setMsg(
                        isOwnGoal
                            ? 'Opponent own goal recorded successfully.'
                            : 'Guest player goal recorded successfully.',
                    )
                } else {
                    setMsg('Goal recorded successfully.')
                }
            }

            await load(seasonId)
        } finally {
            setSaving(false)
        }
    }

    function fixtureLabel(fixtureIdToFind: string) {
        const fixture = fixtures.find((item) => item.id === fixtureIdToFind)
        if (!fixture) return 'Fixture'
        return `${fixture.fixture_date} vs ${fixture.club_opponents?.name ?? 'TBC'}`
    }

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5">
                <h3>Club Goals</h3>
                <p className="muted">
                    Record club scorers, one-time guest scorers and opponent own goals
                    against the club&apos;s existing fixtures.
                </p>
                <select
                    className="mt-4 rounded-xl border border-white/15 bg-[#071009] p-3 text-white outline-none [color-scheme:dark] focus:border-lime-400"
                    value={seasonId}
                    onChange={(event) => {
                        const nextSeasonId = event.target.value
                        resetForm()
                        setSeasonId(nextSeasonId)
                        void load(nextSeasonId)
                    }}
                >
                    <option className="bg-[#071009] text-white" value="">
                        Select season
                    </option>
                    {seasons.map((season) => (
                        <option
                            className="bg-[#071009] text-white"
                            key={season.id}
                            value={season.id}
                        >
                            {season.name}
                        </option>
                    ))}
                </select>
            </div>

            {msg && (
                <p className="rounded-xl border border-[var(--organisation-border)] p-3">
                    {msg}
                </p>
            )}

            <div className="grid gap-4 rounded-2xl border border-[var(--organisation-border)] p-5 sm:grid-cols-2">
                {editingGoalId && (
                    <div className="sm:col-span-2">
                        <p className="font-semibold">Edit recorded goal</p>
                        <p className="muted text-sm">
                            Correct the fixture, goal type, scorer, minute or video
                            timestamp below.
                        </p>
                    </div>
                )}

                <label>
                    Fixture
                    <select
                        className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white placeholder:text-slate-500 outline-none [color-scheme:dark] focus:border-lime-400"
                        value={fixtureId}
                        onChange={(event) => setFixtureId(event.target.value)}
                    >
                        <option className="bg-[#071009] text-white" value="">
                            Select fixture
                        </option>
                        {fixtures.map((fixture) => (
                            <option
                                className="bg-[#071009] text-white"
                                key={fixture.id}
                                value={fixture.id}
                            >
                                {fixture.fixture_date} vs{' '}
                                {fixture.club_opponents?.name ?? 'TBC'}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Goal type
                    <select
                        className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white outline-none [color-scheme:dark] focus:border-lime-400"
                        value={goalType}
                        onChange={(event) =>
                            changeGoalType(event.target.value as GoalType)
                        }
                    >
                        <option className="bg-[#071009] text-white" value="player">
                            Club player goal
                        </option>
                        <option className="bg-[#071009] text-white" value="guest">
                            Guest player goal
                        </option>
                        <option className="bg-[#071009] text-white" value="own_goal">
                            Opponent own goal
                        </option>
                    </select>
                </label>

                {goalType === 'player' && (
                    <label className="sm:col-span-2">
                        Player
                        <select
                            className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white placeholder:text-slate-500 outline-none [color-scheme:dark] focus:border-lime-400"
                            value={playerId}
                            onChange={(event) => {
                                const nextPlayerId = event.target.value
                                setPlayerId(nextPlayerId)
                                const player = players.find(
                                    (item) => item.id === nextPlayerId,
                                )
                                setPlayerName(
                                    player?.club_players
                                        ? `${player.club_players.first_name} ${player.club_players.last_name}`
                                        : '',
                                )
                            }}
                        >
                            <option className="bg-[#071009] text-white" value="">
                                Select player
                            </option>
                            {players.map((player) => (
                                <option
                                    className="bg-[#071009] text-white"
                                    key={player.id}
                                    value={player.id}
                                >
                                    {player.club_players
                                        ? `${player.club_players.first_name} ${player.club_players.last_name}`
                                        : 'Player'}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {goalType === 'guest' && (
                    <label className="sm:col-span-2">
                        Guest player name
                        <input
                            className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white placeholder:text-slate-500 outline-none [color-scheme:dark] focus:border-lime-400"
                            value={playerName}
                            onChange={(event) => setPlayerName(event.target.value)}
                            placeholder="e.g. Daniel Mensah"
                            maxLength={120}
                        />
                        <span className="muted mt-1 block text-xs">
                            Use this for a one-time guest who is not registered in the season squad.
                            The goal is recorded for the match but is excluded from registered-player scorer statistics.
                        </span>
                    </label>
                )}

                {goalType === 'own_goal' && (
                    <div className="rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-3 sm:col-span-2">
                        <p className="font-semibold">Opponent own goal</p>
                        <p className="muted mt-1 text-sm">
                            This records an opponent own goal for the match without
                            crediting it to a club player or the Top Scorers table.
                        </p>
                    </div>
                )}

                <label>
                    Minute
                    <input
                        type="number"
                        min="1"
                        max="130"
                        className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white placeholder:text-slate-500 outline-none [color-scheme:dark] focus:border-lime-400"
                        value={minute}
                        onChange={(event) => setMinute(event.target.value)}
                    />
                </label>

                <label>
                    Video timestamp
                    <input
                        className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white placeholder:text-slate-500 outline-none [color-scheme:dark] focus:border-lime-400"
                        value={video}
                        onChange={(event) => setVideo(event.target.value)}
                        placeholder="e.g. 12:34"
                    />
                </label>

                <div className="flex gap-3 sm:col-span-2">
                    <button
                        className="flex-1 rounded-xl bg-[var(--organisation-accent)] px-5 py-3 font-bold text-[var(--organisation-on-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => void save()}
                        disabled={saving}
                    >
                        {saving
                            ? 'Saving...'
                            : editingGoalId
                              ? 'Update Goal'
                              : 'Record Goal'}
                    </button>
                    {editingGoalId && (
                        <button
                            type="button"
                            className="rounded-xl border border-[var(--organisation-border)] px-5 py-3 font-semibold"
                            onClick={() => {
                                resetForm()
                                setMsg('')
                            }}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-[var(--organisation-border)] p-5">
                <h4 className="font-bold">Recorded goals</h4>
                <div className="mt-3 space-y-2">
                    {goals.map((goal) => {
                        const isOwnGoal = goal.goal_type === 'own_goal'
                        const isGuestGoal = goal.goal_type === 'guest'
                        return (
                            <div
                                key={goal.id}
                                className="flex flex-col gap-2 border-t border-[var(--organisation-border)] py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium">{goal.player_name}</p>
                                        {isOwnGoal && (
                                            <span className="rounded-full border border-[var(--organisation-border)] px-2 py-0.5 text-xs font-semibold">
                                                Own goal
                                            </span>
                                        )}
                                        {isGuestGoal && (
                                            <span className="rounded-full border border-[var(--organisation-border)] px-2 py-0.5 text-xs font-semibold">
                                                Guest player
                                            </span>
                                        )}
                                    </div>
                                    <p className="muted text-sm">
                                        {fixtureLabel(goal.fixture_id)}
                                        {goal.minute ? ` · ${goal.minute}'` : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="rounded-lg border border-[var(--organisation-border)] px-3 py-2 text-sm font-semibold"
                                    onClick={() => startEdit(goal)}
                                >
                                    Edit Goal
                                </button>
                            </div>
                        )
                    })}
                    {goals.length === 0 && (
                        <p className="muted">No goals recorded for this season.</p>
                    )}
                </div>
            </div>
        </div>
    )
}
