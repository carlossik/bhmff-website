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
    kickoff_time: string | null
    home_away: string
    opponent_id: string | null
    club_opponents: { name: string } | null
}

type Result = {
    id: string
    fixture_id: string
    home_score: number
    away_score: number
    player_of_the_match: string | null
    match_report: string | null
    published: boolean
}

export function ClubResultsManager() {
    const { currentOrganisation } = useOrganisation()
    const [seasons, setSeasons] = useState<Season[]>([])
    const [seasonId, setSeasonId] = useState('')
    const [fixtures, setFixtures] = useState<Fixture[]>([])
    const [results, setResults] = useState<Result[]>([])
    const [fixtureId, setFixtureId] = useState('')
    const [home, setHome] = useState('')
    const [away, setAway] = useState('')
    const [pom, setPom] = useState('')
    const [report, setReport] = useState('')
    const [published, setPublished] = useState(false)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    const clearForm = useCallback(() => {
        setFixtureId('')
        setHome('')
        setAway('')
        setPom('')
        setReport('')
        setPublished(false)
    }, [])

    const load = useCallback(
        async (id: string) => {
            setMsg('')
            if (!id) {
                setFixtures([])
                setResults([])
                return
            }

            const [fixtureResponse, resultResponse] = await Promise.all([
                supabase
                    .from('club_fixtures')
                    .select(
                        'id,fixture_date,kickoff_time,home_away,opponent_id,club_opponents(name)',
                    )
                    .eq('organisation_id', currentOrganisation.id)
                    .eq('season_id', id)
                    .order('fixture_date'),
                supabase
                    .from('club_results')
                    .select(
                        'id,fixture_id,home_score,away_score,player_of_the_match,match_report,published',
                    )
                    .eq('organisation_id', currentOrganisation.id)
                    .eq('season_id', id),
            ])

            if (fixtureResponse.error || resultResponse.error) {
                setMsg(
                    fixtureResponse.error?.message ||
                        resultResponse.error?.message ||
                        'Unable to load results.',
                )
                return
            }

            setFixtures(
                (fixtureResponse.data ?? []) as unknown as Fixture[],
            )
            setResults((resultResponse.data ?? []) as Result[])
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

    function populateResult(fixtureIdToLoad: string) {
        setFixtureId(fixtureIdToLoad)
        const existing = results.find(
            (result) => result.fixture_id === fixtureIdToLoad,
        )
        setHome(existing ? String(existing.home_score) : '')
        setAway(existing ? String(existing.away_score) : '')
        setPom(existing?.player_of_the_match ?? '')
        setReport(existing?.match_report ?? '')
        setPublished(existing?.published ?? false)
        setMsg(existing ? 'Editing recorded result.' : '')
    }

    async function save() {
        if (!seasonId || !fixtureId || home === '' || away === '') {
            setMsg('Select a fixture and enter both scores.')
            return
        }

        const homeScore = Number(home)
        const awayScore = Number(away)
        if (
            !Number.isInteger(homeScore) ||
            !Number.isInteger(awayScore) ||
            homeScore < 0 ||
            awayScore < 0
        ) {
            setMsg('Scores must be non-negative whole numbers.')
            return
        }

        const existing = results.find(
            (result) => result.fixture_id === fixtureId,
        )
        const payload = {
            organisation_id: currentOrganisation.id,
            season_id: seasonId,
            fixture_id: fixtureId,
            home_score: homeScore,
            away_score: awayScore,
            player_of_the_match: pom.trim() || null,
            match_report: report.trim() || null,
            published,
            updated_at: new Date().toISOString(),
        }

        setSaving(true)
        setMsg('')

        try {
            if (existing) {
                const { data, error } = await supabase
                    .from('club_results')
                    .update(payload)
                    .eq('id', existing.id)
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
                        'The result was not updated. Refresh the page and try again.',
                    )
                    return
                }
            } else {
                const { error } = await supabase
                    .from('club_results')
                    .insert(payload)
                if (error) {
                    setMsg(error.message)
                    return
                }
            }

            const { error: fixtureError } = await supabase
                .from('club_fixtures')
                .update({
                    status: 'played',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', fixtureId)
                .eq('organisation_id', currentOrganisation.id)
                .eq('season_id', seasonId)

            if (fixtureError) {
                setMsg(
                    `Result saved, but the fixture status could not be updated: ${fixtureError.message}`,
                )
                await load(seasonId)
                return
            }

            clearForm()
            setMsg(
                existing
                    ? 'Result updated successfully.'
                    : 'Result saved successfully.',
            )
            await load(seasonId)
        } finally {
            setSaving(false)
        }
    }

    function fixtureForResult(result: Result) {
        return fixtures.find((fixture) => fixture.id === result.fixture_id)
    }

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5">
                <h3>Club Results</h3>
                <p className="muted">
                    Record and correct results against existing club fixtures. No
                    competition is required.
                </p>
                <select
                    className="mt-4 rounded-xl border border-white/15 bg-[#071009] p-3 text-white outline-none [color-scheme:dark] focus:border-lime-400"
                    value={seasonId}
                    onChange={(event) => {
                        const nextSeasonId = event.target.value
                        clearForm()
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
                <label className="sm:col-span-2">
                    Fixture
                    <select
                        className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white placeholder:text-slate-500 outline-none [color-scheme:dark] focus:border-lime-400"
                        value={fixtureId}
                        onChange={(event) => populateResult(event.target.value)}
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
                                {fixture.fixture_date} ·{' '}
                                {fixture.home_away === 'away' ? 'Away' : 'Home'} vs{' '}
                                {fixture.club_opponents?.name ?? 'TBC'}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Home score
                    <input
                        type="number"
                        min="0"
                        className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white placeholder:text-slate-500 outline-none [color-scheme:dark] focus:border-lime-400"
                        value={home}
                        onChange={(event) => setHome(event.target.value)}
                    />
                </label>

                <label>
                    Away score
                    <input
                        type="number"
                        min="0"
                        className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white placeholder:text-slate-500 outline-none [color-scheme:dark] focus:border-lime-400"
                        value={away}
                        onChange={(event) => setAway(event.target.value)}
                    />
                </label>

                <label>
                    Player of the match
                    <input
                        className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white placeholder:text-slate-500 outline-none [color-scheme:dark] focus:border-lime-400"
                        value={pom}
                        onChange={(event) => setPom(event.target.value)}
                    />
                </label>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={published}
                        onChange={(event) => setPublished(event.target.checked)}
                    />
                    Publish result
                </label>

                <label className="sm:col-span-2">
                    Match report
                    <textarea
                        className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white placeholder:text-slate-500 outline-none [color-scheme:dark] focus:border-lime-400"
                        value={report}
                        onChange={(event) => setReport(event.target.value)}
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
                            : results.some(
                                    (result) => result.fixture_id === fixtureId,
                                )
                              ? 'Update Result'
                              : 'Save Result'}
                    </button>
                    {fixtureId && (
                        <button
                            type="button"
                            className="rounded-xl border border-[var(--organisation-border)] px-5 py-3 font-semibold"
                            onClick={() => {
                                clearForm()
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
                <h4 className="font-bold">Recorded results</h4>
                <div className="mt-3 space-y-2">
                    {results.map((result) => {
                        const fixture = fixtureForResult(result)
                        return (
                            <div
                                key={result.id}
                                className="flex flex-col gap-2 border-t border-[var(--organisation-border)] py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="font-medium">
                                        {result.home_score} - {result.away_score}
                                    </p>
                                    <p className="muted text-sm">
                                        {fixture
                                            ? `${fixture.fixture_date} · ${fixture.home_away === 'away' ? 'Away' : 'Home'} vs ${fixture.club_opponents?.name ?? 'TBC'}`
                                            : 'Fixture'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="rounded-lg border border-[var(--organisation-border)] px-3 py-2 text-sm font-semibold"
                                    onClick={() => populateResult(result.fixture_id)}
                                >
                                    Edit Result
                                </button>
                            </div>
                        )
                    })}
                    {results.length === 0 && (
                        <p className="muted">No results recorded for this season.</p>
                    )}
                </div>
            </div>
        </div>
    )
}
