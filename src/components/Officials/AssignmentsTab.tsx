import React, { useCallback, useEffect, useState } from 'react';
import {
    AlertCircle,
    Calendar,
    Plus,
    Save,
    Trash2,
    Trophy,
} from 'lucide-react';

import {
    CreateAssignmentInput,
    officialService,
    UpdateAssignmentInput,
} from '../../services/officialService';
import {
    AssignmentStatus,
    Official,
    OfficialAssignment,
    OfficialRole,
} from '../../types/officialTypes';

interface Props {
    official: Official;
}

type AssignmentField =
    | 'competition_id'
    | 'fixture_id'
    | 'role'
    | 'status'
    | 'assigned_fee'
    | 'assigned_expenses'
    | 'notes';

const DRAFT_ID_PREFIX = 'draft-';

const isDraftAssignment = (assignment: OfficialAssignment): boolean =>
    assignment.id.startsWith(DRAFT_ID_PREFIX);

const toNullableString = (value: string): string | null => {
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
};

const createDraftAssignment = (official: Official): OfficialAssignment => {
    const now = new Date().toISOString();

    return {
        id: `${DRAFT_ID_PREFIX}${crypto.randomUUID()}`,
        organisation_id: official.organisation_id,
        official_id: official.id,
        competition_id: null,
        fixture_id: null,
        venue_id: null,
        sport_id: official.sport_id ?? null,
        role: official.role,
        source: 'manual',
        status: 'draft',
        assignment_score: null,
        travel_distance_km: null,
        travel_duration_minutes: null,
        assigned_fee: 0,
        assigned_expenses: 0,
        assigned_by: null,
        assigned_at: null,
        accepted_at: null,
        notes: null,
        created_at: now,
        updated_at: now,
    };
};

const AssignmentsTab: React.FC<Props> = ({ official }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [assignments, setAssignments] = useState<OfficialAssignment[]>([]);

    const loadAssignments = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            const data = await officialService.getAssignments(
                official.organisation_id,
                official.id
            );

            setAssignments(data);
        } catch (loadError) {
            console.error('Failed to load official assignments:', loadError);

            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Unable to load assignments.'
            );
        } finally {
            setLoading(false);
        }
    }, [official.id, official.organisation_id]);

    useEffect(() => {
        void loadAssignments();
    }, [loadAssignments]);

    useEffect(() => {
        setSuccessMessage(null);
    }, [assignments]);

    const addAssignment = (): void => {
        setError(null);
        setAssignments(currentAssignments => [
            ...currentAssignments,
            createDraftAssignment(official),
        ]);
    };
    const updateAssignment = <
        K extends AssignmentField
    >(
        index: number,
        field: K,
        value: OfficialAssignment[K]
    ): void => {
        setAssignments(current => {
            const updated = [...current];

            updated[index] = {
                ...updated[index],
                [field]: value,
            };

            return updated;
        });
    };

    const removeAssignment = async (
        assignment: OfficialAssignment,
        index: number
    ): Promise<void> => {
        try {
            if (isDraftAssignment(assignment)) {
                setAssignments(current =>
                    current.filter((_, i) => i !== index)
                );
                return;
            }

            setDeletingId(assignment.id);

            await officialService.deleteAssignment(
                assignment.id
            );

            setAssignments(current =>
                current.filter(item => item.id !== assignment.id)
            );
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to delete assignment.'
            );
        } finally {
            setDeletingId(null);
        }
    };

    const save = async (): Promise<void> => {
        try {
            setSaving(true);
            setError(null);

            for (const assignment of assignments) {
                if (isDraftAssignment(assignment)) {
                    const payload: CreateAssignmentInput = {
                        organisation_id:
                        assignment.organisation_id,
                        official_id:
                        assignment.official_id,
                        competition_id:
                        assignment.competition_id,
                        fixture_id:
                        assignment.fixture_id,
                        venue_id:
                        assignment.venue_id,
                        sport_id:
                        assignment.sport_id,
                        role: assignment.role,
                        source:
                        assignment.source,
                        status:
                        assignment.status,
                        assignment_score:
                        assignment.assignment_score,
                        travel_distance_km:
                        assignment.travel_distance_km,
                        travel_duration_minutes:
                        assignment.travel_duration_minutes,
                        assigned_fee:
                        assignment.assigned_fee,
                        assigned_expenses:
                        assignment.assigned_expenses,
                        assigned_by:
                        assignment.assigned_by,
                        assigned_at:
                        assignment.assigned_at,
                        accepted_at:
                        assignment.accepted_at,
                        notes:
                        assignment.notes,
                    };

                    await officialService.assignOfficial(
                        payload
                    );
                } else {
                    const updates: UpdateAssignmentInput =
                        {
                            competition_id:
                            assignment.competition_id,
                            fixture_id:
                            assignment.fixture_id,
                            venue_id:
                            assignment.venue_id,
                            sport_id:
                            assignment.sport_id,
                            role: assignment.role,
                            status:
                            assignment.status,
                            assignment_score:
                            assignment.assignment_score,
                            travel_distance_km:
                            assignment.travel_distance_km,
                            travel_duration_minutes:
                            assignment.travel_duration_minutes,
                            assigned_fee:
                            assignment.assigned_fee,
                            assigned_expenses:
                            assignment.assigned_expenses,
                            assigned_by:
                            assignment.assigned_by,
                            assigned_at:
                            assignment.assigned_at,
                            accepted_at:
                            assignment.accepted_at,
                            notes:
                            assignment.notes,
                        };

                    await officialService.updateAssignment(
                        assignment.id,
                        updates
                    );
                }
            }

            await loadAssignments();

            setSuccessMessage(
                'Assignments saved successfully.'
            );
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to save assignments.'
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-xl bg-white p-10 text-center text-slate-500">
                Loading assignments...
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
                    {successMessage}
                </div>
            )}

            <div className="flex items-center justify-between">

                <div>

                    <h2 className="flex items-center gap-2 text-xl font-bold">
                        <Calendar size={22} />
                        Assignments
                    </h2>

                    <p className="text-sm text-slate-500">
                        Tournament and fixture appointments for this official.
                    </p>

                </div>

                <button
                    onClick={addAssignment}
                    className="flex items-center gap-2 rounded-lg bg-lime-600 px-4 py-2 font-semibold text-white hover:bg-lime-700"
                >
                    <Plus size={16} />
                    New Assignment
                </button>

            </div>

            <div className="overflow-hidden rounded-xl border bg-white">

                <table className="min-w-full">

                    <thead className="bg-slate-50">

                    <tr>

                        <th className="px-4 py-3 text-left">
                            Competition
                        </th>

                        <th className="px-4 py-3 text-left">
                            Fixture
                        </th>

                        <th className="px-4 py-3 text-left">
                            Role
                        </th>

                        <th className="px-4 py-3 text-left">
                            Status
                        </th>

                        <th className="px-4 py-3 text-left">
                            Match Fee
                        </th>

                        <th className="px-4 py-3 text-left">
                            Expenses
                        </th>

                        <th className="w-20" />

                    </tr>

                    </thead>

                    <tbody>
                    {assignments.length === 0 ? (
                        <tr>
                            <td
                                colSpan={7}
                                className="px-6 py-12 text-center text-sm text-slate-500"
                            >
                                No assignments have been created for this official.
                            </td>
                        </tr>
                    ) : (
                        assignments.map((assignment, index) => (
                            <tr
                                key={assignment.id}
                                className="border-t align-top"
                            >
                                <td className="p-3">
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                        value={
                                            assignment.competition_id ?? ''
                                        }
                                        placeholder="Competition ID"
                                        onChange={event =>
                                            updateAssignment(
                                                index,
                                                'competition_id',
                                                toNullableString(
                                                    event.target.value
                                                )
                                            )
                                        }
                                    />
                                </td>

                                <td className="p-3">
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                        value={
                                            assignment.fixture_id ?? ''
                                        }
                                        placeholder="Fixture ID"
                                        onChange={event =>
                                            updateAssignment(
                                                index,
                                                'fixture_id',
                                                toNullableString(
                                                    event.target.value
                                                )
                                            )
                                        }
                                    />
                                </td>

                                <td className="p-3">
                                    <select
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                        value={assignment.role}
                                        onChange={event =>
                                            updateAssignment(
                                                index,
                                                'role',
                                                event.target
                                                    .value as OfficialRole
                                            )
                                        }
                                    >
                                        <option value="referee">
                                            Referee
                                        </option>
                                        <option value="assistant_referee">
                                            Assistant Referee
                                        </option>
                                        <option value="fourth_official">
                                            Fourth Official
                                        </option>
                                        <option value="match_commissioner">
                                            Match Commissioner
                                        </option>
                                        <option value="assessor">
                                            Assessor
                                        </option>
                                        <option value="observer">
                                            Observer
                                        </option>
                                        <option value="timekeeper">
                                            Timekeeper
                                        </option>
                                        <option value="scorekeeper">
                                            Scorekeeper
                                        </option>
                                        <option value="umpire">
                                            Umpire
                                        </option>
                                        <option value="line_judge">
                                            Line Judge
                                        </option>
                                        <option value="table_official">
                                            Table Official
                                        </option>
                                        <option value="marshal">
                                            Marshal
                                        </option>
                                        <option value="technical_delegate">
                                            Technical Delegate
                                        </option>
                                        <option value="venue_official">
                                            Venue Official
                                        </option>
                                        <option value="medical_official">
                                            Medical Official
                                        </option>
                                        <option value="other">
                                            Other
                                        </option>
                                    </select>
                                </td>

                                <td className="p-3">
                                    <select
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                        value={assignment.status}
                                        onChange={event =>
                                            updateAssignment(
                                                index,
                                                'status',
                                                event.target
                                                    .value as AssignmentStatus
                                            )
                                        }
                                    >
                                        <option value="draft">
                                            Draft
                                        </option>
                                        <option value="proposed">
                                            Proposed
                                        </option>
                                        <option value="offered">
                                            Offered
                                        </option>
                                        <option value="accepted">
                                            Accepted
                                        </option>
                                        <option value="declined">
                                            Declined
                                        </option>
                                        <option value="confirmed">
                                            Confirmed
                                        </option>
                                        <option value="completed">
                                            Completed
                                        </option>
                                        <option value="cancelled">
                                            Cancelled
                                        </option>
                                        <option value="no_show">
                                            No Show
                                        </option>
                                    </select>
                                </td>

                                <td className="p-3">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                        value={
                                            assignment.assigned_fee ?? 0
                                        }
                                        onChange={event =>
                                            updateAssignment(
                                                index,
                                                'assigned_fee',
                                                Number(
                                                    event.target.value
                                                )
                                            )
                                        }
                                    />
                                </td>

                                <td className="p-3">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                        value={
                                            assignment.assigned_expenses ??
                                            0
                                        }
                                        onChange={event =>
                                            updateAssignment(
                                                index,
                                                'assigned_expenses',
                                                Number(
                                                    event.target.value
                                                )
                                            )
                                        }
                                    />
                                </td>

                                <td className="p-3 text-right">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            void removeAssignment(
                                                assignment,
                                                index
                                            )
                                        }
                                        disabled={
                                            deletingId === assignment.id
                                        }
                                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                        aria-label="Delete assignment"
                                        title="Delete assignment"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}

                    </tbody>

                </table>

            </div>

            <div className="rounded-xl border bg-gradient-to-r from-lime-50 to-white p-5">

                <div className="flex items-center gap-3">

                    <Trophy className="text-lime-600" />

                    <div>

                        <div className="font-semibold">
                            AI Assignment Ready
                        </div>

                        <div className="text-sm text-slate-600">
                            These assignments can later be created automatically
                            by the TournamentHQ AI Assignment Engine using
                            availability, qualifications, distance, workload,
                            ratings and conflict detection.
                        </div>

                    </div>

                </div>

            </div>
            <div className="flex justify-end">

                <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Save size={18} />

                    {saving
                        ? 'Saving...'
                        : 'Save Assignments'}

                </button>

            </div>

        </div>
    );
};

export default AssignmentsTab;