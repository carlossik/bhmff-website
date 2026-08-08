import { Modal } from '../../common/Modal'
import type {
    ResultFixture,
    ResultFormValues,
    ResultTeam,
} from './resultTypes'

type ResultModalProps = {
    mode: 'create' | 'edit'
    values: ResultFormValues
    fixtures: ResultFixture[]
    teams: ResultTeam[]
    existingFixtureIds: string[]
    isSaving: boolean
    onChange: (values: ResultFormValues) => void
    onClose: () => void
    onSave: () => void
}

export function ResultModal({
                                mode,
                                values,
                                fixtures,
                                teams,
                                existingFixtureIds,
                                isSaving,
                                onChange,
                                onClose,
                                onSave,
                            }: ResultModalProps) {
    const teamNames = new Map(
        teams.map((team) => [team.id, team.name])
    )

    function updateField<K extends keyof ResultFormValues>(
        field: K,
        value: ResultFormValues[K]
    ) {
        onChange({
            ...values,
            [field]: value,
        })
    }

    return (
        <Modal
            title={mode === 'edit' ? 'Edit Result' : 'Add Result'}
            onClose={onClose}
        >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-[var(--organisation-text)] [&_input]:rounded-xl [&_input]:border [&_input]:border-[var(--organisation-border)] [&_input]:bg-[var(--organisation-background)] [&_input]:px-4 [&_input]:py-3 [&_input]:text-[var(--organisation-text)] [&_input]:outline-none [&_input]:focus:border-[var(--organisation-accent)] [&_select]:rounded-xl [&_select]:border [&_select]:border-[var(--organisation-border)] [&_select]:bg-[var(--organisation-background)] [&_select]:px-4 [&_select]:py-3 [&_select]:text-[var(--organisation-text)] [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-[var(--organisation-border)] [&_textarea]:bg-[var(--organisation-background)] [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-[var(--organisation-text)]">
                <label className="md:col-span-2">
                    <span>Fixture</span>

                    <select
                        value={values.fixture_id}
                        onChange={(event) =>
                            updateField('fixture_id', event.target.value)
                        }
                    >
                        <option value="">Select fixture</option>

                        {fixtures.map((fixture) => {
                            const home =
                                teamNames.get(
                                    fixture.home_team_id ?? ''
                                ) ?? 'Home team TBC'

                            const away =
                                teamNames.get(
                                    fixture.away_team_id ?? ''
                                ) ?? 'Away team TBC'

                            const alreadyHasResult =
                                existingFixtureIds.includes(fixture.id)

                            return (
                                <option
                                    key={fixture.id}
                                    value={fixture.id}
                                    disabled={
                                        mode === 'create' &&
                                        alreadyHasResult
                                    }
                                >
                                    {fixture.stage}: {home} vs {away}
                                </option>
                            )
                        })}
                    </select>
                </label>

                <label>
                    <span>Home Score</span>
                    <input
                        type="number"
                        min="0"
                        value={values.home_score}
                        onChange={(event) =>
                            updateField(
                                'home_score',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Away Score</span>
                    <input
                        type="number"
                        min="0"
                        value={values.away_score}
                        onChange={(event) =>
                            updateField(
                                'away_score',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label className="md:col-span-2">
                    <span>Player of the Match</span>
                    <input
                        value={values.player_of_match}
                        onChange={(event) =>
                            updateField(
                                'player_of_match',
                                event.target.value
                            )
                        }
                        placeholder="Enter player name"
                    />
                </label>

                <label className="md:col-span-2">
                    <span>Match Report</span>
                    <textarea
                        value={values.match_report}
                        onChange={(event) =>
                            updateField(
                                'match_report',
                                event.target.value
                            )
                        }
                        placeholder="Enter match report"
                    />
                </label>

                <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] p-4 text-sm font-semibold text-[var(--organisation-text)]">
                    <input
                        type="checkbox"
                        checked={values.published}
                        onChange={(event) =>
                            updateField(
                                'published',
                                event.target.checked
                            )
                        }
                    />
                    <span>Publish result on public website</span>
                </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--organisation-border)] pt-5 sm:flex-row sm:justify-end">
                <button
                    className="inline-flex items-center justify-center rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-5 py-3 font-semibold text-[var(--organisation-text)] transition hover:border-[var(--organisation-accent)] disabled:opacity-50"
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                >
                    Cancel
                </button>

                <button
                    className="inline-flex items-center justify-center rounded-xl bg-[var(--organisation-accent)] px-5 py-3 font-bold text-[var(--organisation-on-accent)] transition hover:brightness-110 disabled:opacity-50"
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                >
                    {isSaving
                        ? 'Saving...'
                        : mode === 'edit'
                            ? 'Update'
                            : 'Save'}
                </button>
            </div>
        </Modal>
    )
}