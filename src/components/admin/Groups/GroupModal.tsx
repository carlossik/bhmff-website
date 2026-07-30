import {
    Check,
    Save,
    Users,
    X,
} from 'lucide-react'

import type {
    CompetitionGroup,
    GroupFormValues,
    GroupMembership,
    GroupTeam,
} from './groupTypes'

type GroupModalProps = {
    mode: 'create' | 'edit'
    values: GroupFormValues
    teams: GroupTeam[]
    groups: CompetitionGroup[]
    memberships: GroupMembership[]
    editingGroupId: string | null
    isSaving: boolean
    onChange: (values: GroupFormValues) => void
    onClose: () => void
    onSave: () => void
}

const fieldClassName =
    'mt-2 w-full rounded-xl border border-lime-900/60 bg-[#0c160b] px-4 py-3 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/15 disabled:cursor-not-allowed disabled:opacity-60'

const labelClassName =
    'block text-sm font-semibold text-slate-300'

export function GroupModal({
                               mode,
                               values,
                               teams,
                               groups,
                               memberships,
                               editingGroupId,
                               isSaving,
                               onChange,
                               onClose,
                               onSave,
                           }: GroupModalProps) {
    const selectedCount =
        values.competition_team_ids.length

    function toggleTeam(
        competitionTeamId: string
    ) {
        const isSelected =
            values.competition_team_ids.includes(
                competitionTeamId
            )

        onChange({
            ...values,
            competition_team_ids:
                isSelected
                    ? values.competition_team_ids.filter(
                        (id) =>
                            id !==
                            competitionTeamId
                    )
                    : [
                        ...values.competition_team_ids,
                        competitionTeamId,
                    ],
        })
    }

    function getAssignedGroupId(
        competitionTeamId: string
    ) {
        return memberships.find(
            (membership) =>
                membership.competition_team_id ===
                competitionTeamId
        )?.group_id
    }

    function getAssignedGroupName(
        competitionTeamId: string
    ) {
        const groupId =
            getAssignedGroupId(
                competitionTeamId
            )

        return groups.find(
            (group) => group.id === groupId
        )?.name
    }

    const availableTeamIds = teams
        .filter((team) => {
            const assignedGroupId =
                getAssignedGroupId(
                    team.competition_team_id
                )

            return (
                !assignedGroupId ||
                assignedGroupId ===
                editingGroupId
            )
        })
        .map(
            (team) =>
                team.competition_team_id
        )

    const allAvailableSelected =
        availableTeamIds.length > 0 &&
        availableTeamIds.every((teamId) =>
            values.competition_team_ids.includes(
                teamId
            )
        )

    function selectAllAvailable() {
        onChange({
            ...values,
            competition_team_ids:
                Array.from(
                    new Set([
                        ...values.competition_team_ids,
                        ...availableTeamIds,
                    ])
                ),
        })
    }

    function clearSelection() {
        onChange({
            ...values,
            competition_team_ids: [],
        })
    }

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4 font-sans backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget &&
                    !isSaving
                ) {
                    onClose()
                }
            }}
        >
            <section
                aria-labelledby="group-modal-title"
                aria-modal="true"
                className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-lime-900/60 bg-[#0d170c] shadow-2xl shadow-black/70"
                role="dialog"
            >
                <header className="flex shrink-0 items-start justify-between border-b border-lime-900/50 px-6 py-5 sm:px-8">
                    <div>
                        <img
                            src="/assets/tournamenthq-logo.png"
                            alt="TournamentHQ"
                            className="h-10 w-auto object-contain"
                        />

                        <h2
                            id="group-modal-title"
                            className="mt-3 text-2xl font-bold tracking-tight text-lime-300 sm:text-3xl"
                        >
                            {mode === 'edit'
                                ? 'Edit Group'
                                : 'Add Group'}
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                            Name the group and allocate its participating teams.
                        </p>
                    </div>

                    <button
                        aria-label="Close group form"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-lime-800/60 bg-black/20 text-slate-300 transition hover:border-lime-500 hover:bg-lime-400/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <label className={labelClassName}>
                            Group name

                            <input
                                className={fieldClassName}
                                value={values.name}
                                placeholder="e.g. Group A or Saturday Group"
                                autoFocus
                                disabled={isSaving}
                                onChange={(event) =>
                                    onChange({
                                        ...values,
                                        name:
                                        event.currentTarget
                                            .value,
                                    })
                                }
                            />
                        </label>

                        {mode === 'edit' ? (
                            <label className={labelClassName}>
                                Group position

                                <input
                                    className={fieldClassName}
                                    type="number"
                                    min="1"
                                    value={
                                        values.sort_order
                                    }
                                    disabled={isSaving}
                                    onChange={(event) =>
                                        onChange({
                                            ...values,
                                            sort_order:
                                            event
                                                .currentTarget
                                                .value,
                                        })
                                    }
                                />

                                <span className="mt-2 block text-xs font-normal text-slate-500">
                                    Controls where this group appears in lists and on the public site.
                                </span>
                            </label>
                        ) : (
                            <div className="rounded-xl border border-lime-900/50 bg-black/20 px-4 py-3">
                                <p className="text-sm font-semibold text-slate-300">
                                    Group position
                                </p>

                                <p className="mt-2 text-lg font-bold text-lime-300">
                                    {values.sort_order}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Automatically assigned. You can change it later when editing the group.
                                </p>
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-lime-400/10 p-3">
                                        <Users className="h-5 w-5 text-lime-400" />
                                    </div>

                                    <div>
                                        <h3 className="text-base font-bold text-white">
                                            Allocate teams
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-400">
                                            {selectedCount}{' '}
                                            {selectedCount === 1
                                                ? 'team'
                                                : 'teams'}{' '}
                                            selected
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="rounded-xl border border-lime-700 bg-lime-400/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-lime-300 transition hover:bg-lime-400 hover:text-black disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-600"
                                        disabled={
                                            isSaving ||
                                            allAvailableSelected ||
                                            !availableTeamIds.length
                                        }
                                        onClick={
                                            selectAllAvailable
                                        }
                                    >
                                        Select available
                                    </button>

                                    <button
                                        type="button"
                                        className="rounded-xl border border-slate-700 bg-black/20 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-300 transition hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:text-slate-600"
                                        disabled={
                                            isSaving ||
                                            !selectedCount
                                        }
                                        onClick={
                                            clearSelection
                                        }
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            {!teams.length ? (
                                <div className="rounded-2xl border border-dashed border-lime-900/60 bg-black/20 px-6 py-10 text-center">
                                    <p className="text-sm text-slate-400">
                                        No competition teams are available.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {teams.map(
                                        (team) => {
                                            const assignedGroupId =
                                                getAssignedGroupId(
                                                    team.competition_team_id
                                                )

                                            const assignedElsewhere =
                                                Boolean(
                                                    assignedGroupId
                                                ) &&
                                                assignedGroupId !==
                                                editingGroupId

                                            const assignedGroupName =
                                                getAssignedGroupName(
                                                    team.competition_team_id
                                                )

                                            const isSelected =
                                                values.competition_team_ids.includes(
                                                    team.competition_team_id
                                                )

                                            const initials =
                                                team.name
                                                    .split(
                                                        ' '
                                                    )
                                                    .filter(
                                                        Boolean
                                                    )
                                                    .map(
                                                        (
                                                            word
                                                        ) =>
                                                            word[0]
                                                    )
                                                    .join(
                                                        ''
                                                    )
                                                    .slice(
                                                        0,
                                                        3
                                                    )
                                                    .toUpperCase()

                                            return (
                                                <label
                                                    key={
                                                        team.competition_team_id
                                                    }
                                                    className={`relative flex min-h-36 items-center gap-4 rounded-2xl border p-4 transition ${
                                                        assignedElsewhere
                                                            ? 'cursor-not-allowed border-lime-950/50 bg-black/20 opacity-45'
                                                            : isSelected
                                                                ? 'cursor-pointer border-lime-400 bg-lime-400/10'
                                                                : 'cursor-pointer border-lime-900/50 bg-black/20 hover:border-lime-700'
                                                    }`}
                                                >
                                                    <input
                                                        className="absolute right-4 top-4 h-4 w-4 accent-lime-400"
                                                        type="checkbox"
                                                        checked={
                                                            isSelected
                                                        }
                                                        disabled={
                                                            assignedElsewhere ||
                                                            isSaving
                                                        }
                                                        onChange={() =>
                                                            toggleTeam(
                                                                team.competition_team_id
                                                            )
                                                        }
                                                    />

                                                    {isSelected && (
                                                        <span className="absolute right-10 top-3 inline-flex items-center gap-1 rounded-full bg-lime-400 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-black">
                                                            <Check className="h-3 w-3" />
                                                            Selected
                                                        </span>
                                                    )}

                                                    {team.logo_url ? (
                                                        <img
                                                            src={
                                                                team.logo_url
                                                            }
                                                            alt={`${team.name} logo`}
                                                            className="h-14 w-14 shrink-0 rounded-2xl border border-lime-900/50 object-cover"
                                                        />
                                                    ) : (
                                                        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-lime-300 text-sm font-bold text-black">
                                                            {
                                                                initials
                                                            }
                                                        </span>
                                                    )}

                                                    <div className="min-w-0 pr-8">
                                                        <strong className="block truncate text-base text-white">
                                                            {
                                                                team.name
                                                            }
                                                        </strong>

                                                        {assignedElsewhere && (
                                                            <small className="mt-2 block text-sm leading-5 text-slate-500">
                                                                Assigned to{' '}
                                                                {assignedGroupName ??
                                                                    'another group'}
                                                            </small>
                                                        )}
                                                    </div>
                                                </label>
                                            )
                                        }
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <footer className="flex shrink-0 flex-col gap-4 border-t border-lime-900/50 bg-[#0b140a] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <div>
                        <p className="text-sm font-bold text-white">
                            {values.name.trim() ||
                                'New group'}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Position{' '}
                            {values.sort_order} ·{' '}
                            {selectedCount}{' '}
                            {selectedCount === 1
                                ? 'team'
                                : 'teams'}
                        </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-900/60 bg-black/20 px-5 py-3 text-sm font-bold text-white transition hover:border-lime-500/70 hover:bg-lime-400/5 disabled:cursor-not-allowed disabled:opacity-50"
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </button>

                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                            type="button"
                            disabled={
                                isSaving ||
                                !values.name.trim()
                            }
                            onClick={onSave}
                        >
                            <Save className="h-4 w-4" />

                            {isSaving
                                ? 'Saving...'
                                : mode === 'edit'
                                    ? 'Update Group'
                                    : 'Create Group'}
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    )
}