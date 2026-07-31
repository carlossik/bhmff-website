import React, { useEffect, useState } from 'react';
import {
    CalendarDays,
    Clock,
    Plus,
    Trash2,
    Save,
} from 'lucide-react';

import { officialService } from '../../services/officialService';
import {
    Official,
    OfficialAvailability,
} from '../../types/officialTypes';

interface Props {
    official: Official;
}

const AvailabilityTab: React.FC<Props> = ({ official }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [availability, setAvailability] = useState<
        OfficialAvailability[]
    >([]);

    useEffect(() => {
        loadAvailability();
    }, [official.id]);

    const loadAvailability = async () => {
        try {
            setLoading(true);

            const data =
                await officialService.getAvailability(
                    official.id
                );

            setAvailability(data);
        } finally {
            setLoading(false);
        }
    };

    const addAvailability = () => {
        setAvailability([
            ...availability,
            {
                id: crypto.randomUUID(),
                official_id: official.id,
                organisation_id:
                official.organisation_id,
                start_datetime: '',
                end_datetime: '',
                status: 'available',
                recurring: false,
                recurrence_rule: null,
                notes: '',
                created_at: '',
                updated_at: '',
            },
        ]);
    };

    const updateRow = (
        index: number,
        field: keyof OfficialAvailability,
        value: any
    ) => {
        const rows = [...availability];

        rows[index] = {
            ...rows[index],
            [field]: value,
        };

        setAvailability(rows);
    };

    const removeRow = async (
        index: number
    ): Promise<void> => {
        const record = availability[index];

        if (record.created_at && record.updated_at) {
            await officialService.deleteAvailability(
                record.id
            );
        }

        setAvailability(current =>
            current.filter(
                (_, rowIndex) => rowIndex !== index
            )
        );
    };

    const save = async (): Promise<void> => {
        try {
            setSaving(true);

            for (const record of availability) {
                const isExistingRecord =
                    Boolean(record.created_at) &&
                    Boolean(record.updated_at);

                if (isExistingRecord) {
                    await officialService.updateAvailability(
                        record.id,
                        {
                            start_datetime: record.start_datetime,
                            end_datetime: record.end_datetime,
                            status: record.status,
                            recurring: record.recurring,
                            recurrence_rule:
                            record.recurrence_rule,
                            notes: record.notes,
                        }
                    );
                } else {
                    await officialService.saveAvailability({
                        official_id: official.id,
                        organisation_id:
                        official.organisation_id,
                        start_datetime:
                        record.start_datetime,
                        end_datetime:
                        record.end_datetime,
                        status: record.status,
                        recurring: record.recurring,
                        recurrence_rule:
                        record.recurrence_rule,
                        notes: record.notes,
                    });
                }
            }

            await loadAvailability();
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-xl bg-white p-10 text-center">
                Loading...
            </div>
        );
    }

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">

                <div>

                    <h2 className="text-xl font-bold">
                        Availability
                    </h2>

                    <p className="text-sm text-slate-500">
                        Record when this official is
                        available for appointments.
                    </p>

                </div>

                <button
                    onClick={addAvailability}
                    className="flex items-center gap-2 rounded-lg bg-lime-600 px-4 py-2 font-medium text-white"
                >
                    <Plus size={16} />
                    Add Availability
                </button>

            </div>

            <div className="overflow-hidden rounded-xl border bg-white">

                <table className="min-w-full">

                    <thead className="bg-slate-50">

                    <tr>

                        <th className="px-5 py-3 text-left">
                            Start
                        </th>

                        <th className="px-5 py-3 text-left">
                            End
                        </th>

                        <th className="px-5 py-3 text-left">
                            Status
                        </th>

                        <th className="px-5 py-3 text-left">
                            Recurring
                        </th>

                        <th />

                    </tr>

                    </thead>

                    <tbody>

                    {availability.map(
                        (item, index) => (
                            <tr
                                key={item.id}
                                className="border-t"
                            >

                                <td className="p-4">

                                    <input
                                        type="datetime-local"
                                        className="w-full rounded-lg border p-2"
                                        value={
                                            item.start_datetime
                                        }
                                        onChange={(e) =>
                                            updateRow(
                                                index,
                                                'start_datetime',
                                                e.target
                                                    .value
                                            )
                                        }
                                    />

                                </td>

                                <td className="p-4">

                                    <input
                                        type="datetime-local"
                                        className="w-full rounded-lg border p-2"
                                        value={
                                            item.end_datetime
                                        }
                                        onChange={(e) =>
                                            updateRow(
                                                index,
                                                'end_datetime',
                                                e.target
                                                    .value
                                            )
                                        }
                                    />

                                </td>

                                <td className="p-4">

                                    <select
                                        className="w-full rounded-lg border p-2"
                                        value={
                                            item.status
                                        }
                                        onChange={(e) =>
                                            updateRow(
                                                index,
                                                'status',
                                                e.target
                                                    .value
                                            )
                                        }
                                    >
                                        <option value="available">
                                            Available
                                        </option>

                                        <option value="tentative">
                                            Tentative
                                        </option>

                                        <option value="unavailable">
                                            Unavailable
                                        </option>

                                        <option value="holiday">
                                            Holiday
                                        </option>

                                        <option value="blocked">
                                            Blocked
                                        </option>

                                    </select>

                                </td>

                                <td className="p-4">

                                    <input
                                        type="checkbox"
                                        checked={
                                            item.recurring
                                        }
                                        onChange={(e) =>
                                            updateRow(
                                                index,
                                                'recurring',
                                                e.target
                                                    .checked
                                            )
                                        }
                                    />

                                </td>

                                <td className="p-4 text-right">

                                    <button
                                        onClick={() =>
                                            removeRow(
                                                index
                                            )
                                        }
                                        className="rounded-lg p-2 hover:bg-red-50"
                                    >
                                        <Trash2
                                            size={18}
                                        />
                                    </button>

                                </td>

                            </tr>
                        )
                    )}

                    </tbody>

                </table>

            </div>

            <div className="flex justify-end">

                <button
                    onClick={save}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white"
                >
                    <Save size={18} />

                    {saving
                        ? 'Saving...'
                        : 'Save Availability'}

                </button>

            </div>

        </div>
    );
};

export default AvailabilityTab;