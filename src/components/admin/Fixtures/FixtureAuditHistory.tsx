import { useCallback, useEffect, useState } from 'react'
import { Modal } from '../../common/Modal'
import { fixtureService } from './fixtureService'
import type { Official } from '../../../types/officialTypes'
import type { FixtureAuditEntry, FixtureTeam, FixtureVenue } from './fixtureTypes'

type Props = {
    competitionId: string
    teams: FixtureTeam[]
    venues: FixtureVenue[]
    officials: Official[]
    onClose: () => void
}

const labels: Record<string, string> = {
    home_competition_team_id: 'Home team',
    away_competition_team_id: 'Away team',
    venue_id: 'Venue', kickoff_time: 'Kickoff', group_id: 'Group',
    stage: 'Stage', status: 'Status', match_format: 'Match format',
}

export function FixtureAuditHistory({ competitionId, teams, venues, officials, onClose }: Props) {
    const [entries, setEntries] = useState<FixtureAuditEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [hasMore, setHasMore] = useState(false)

    const formatValue = useCallback((field: string, value: unknown) => {
        if (value === null || value === undefined || value === '') return '—'
        if (field === 'home_competition_team_id' || field === 'away_competition_team_id') {
            return teams.find((team) => team.competition_team_id === value)?.team_name ?? String(value)
        }
        if (field === 'venue_id') return venues.find((venue) => venue.id === value)?.name ?? String(value)
        if (field === 'official_id') {
            const official = officials.find((item) => item.id === value)
            return official ? `${official.first_name} ${official.last_name}`.trim() : String(value)
        }
        if (field === 'kickoff_time') return new Date(String(value)).toLocaleString('en-GB')
        return typeof value === 'object' ? JSON.stringify(value) : String(value)
    }, [teams, venues, officials])

    const loadPage = useCallback(async (offset: number) => {
        setLoading(true)
        setError('')
        try {
            const page = await fixtureService.getFixtureAudit(competitionId, offset)
            setEntries((current) => offset === 0 ? page : [...current, ...page])
            setHasMore(page.length === 50)
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Unable to load fixture history.')
        } finally {
            setLoading(false)
        }
    }, [competitionId])

    useEffect(() => { void loadPage(0) }, [loadPage])

    return <Modal title="Fixture audit history" onClose={onClose}>
        <p className="mb-5 text-sm text-slate-400">Permanent records of fixture creation, edits and deletion in this competition.</p>
        {error && <p role="alert" className="mb-4 text-red-300">{error}</p>}
        <div className="space-y-4">
            {entries.map((entry) => {
                const snapshot = entry.after_data ?? entry.before_data ?? {}
                const assignment = entry.source === 'official_assignment'
                return <article key={entry.id} className="rounded-xl border border-[var(--organisation-border)] p-4">
                    <div className="flex flex-wrap justify-between gap-2">
                        <strong>{assignment ? 'Official assignment' : 'Fixture'}{' '}
                            {entry.action === 'INSERT' ? 'created' : entry.action === 'DELETE' ? 'deleted' : 'edited'}:{' '}
                            {assignment ? `${formatValue('official_id', snapshot.official_id)} (${formatValue('role', snapshot.role)})`
                                : `${formatValue('home_competition_team_id', snapshot.home_competition_team_id)} vs ${formatValue('away_competition_team_id', snapshot.away_competition_team_id)}`}</strong>
                        <time className="text-sm text-slate-400" dateTime={entry.changed_at}>
                            {new Date(entry.changed_at).toLocaleString('en-GB')}</time>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">By {entry.actor_name || entry.actor_email || 'System / privileged operation'}
                        {entry.actor_name && entry.actor_email && ` (${entry.actor_email})`}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">Fixture ID: {entry.fixture_id}</p>
                    {entry.action === 'UPDATE' && <ul className="mt-3 space-y-1 text-sm">
                        {entry.changed_fields.map((field) => <li key={field}>
                            <strong>{labels[field] ?? field.replace(/_/g, ' ')}:</strong>{' '}
                            {formatValue(field, entry.before_data?.[field])} → {formatValue(field, entry.after_data?.[field])}
                        </li>)}
                    </ul>}
                </article>
            })}
        </div>
        {!loading && !entries.length && !error && <p className="text-sm text-slate-400">No fixture changes recorded since auditing began.</p>}
        {loading && <p className="mt-4 text-sm text-slate-400">Loading history...</p>}
        {hasMore && !loading && <button type="button" className="mt-5 rounded-xl border border-[var(--organisation-border)] px-4 py-2"
            onClick={() => void loadPage(entries.length)}>Load more</button>}
    </Modal>
}
