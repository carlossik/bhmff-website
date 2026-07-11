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
            <div className="adminFormGrid">
                <label className="adminFormFullWidth">
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

                <label className="adminFormFullWidth">
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

                <label className="adminFormFullWidth">
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

                <label className="adminCheckboxLabel adminFormFullWidth">
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

            <div className="modalActions">
                <button
                    className="btn secondary"
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                >
                    Cancel
                </button>

                <button
                    className="btn primary"
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