import type { Fixture, FixtureFormValues } from './fixtureTypes'

export function buildFixtureChanges(existing: Fixture, values: FixtureFormValues) {
    const payload = {
        group_id: values.stage === 'Group Stage' ? values.group_id || null : null,
        home_competition_team_id: values.home_competition_team_id || null,
        away_competition_team_id: values.away_competition_team_id || null,
        venue_id: values.venue_id || null,
        stage: values.stage.trim(),
        kickoff_time: values.kickoff_time ? new Date(values.kickoff_time).toISOString() : null,
        status: values.status,
        match_format: values.match_format ?? '11v11',
    }
    return Object.fromEntries(Object.entries(payload).filter(([key, value]) => {
        // The date/time input has minute precision. Keep existing seconds intact.
        if (key === 'kickoff_time' && value && existing.kickoff_time &&
            Math.floor(new Date(value).getTime() / 60000) ===
                Math.floor(new Date(existing.kickoff_time).getTime() / 60000)) return false
        return value !== existing[key as keyof Fixture]
    }))
}
