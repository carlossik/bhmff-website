import React, { useEffect, useState } from 'react';
import {
    ShieldCheck,
    Plus,
    Save,
    Trash2,
} from 'lucide-react';

import { officialService } from '../../services/officialService';
import {
    Official,
    OfficialCompliance,
} from '../../types/officialTypes';

interface Props {
    official: Official;
}

const ComplianceTab: React.FC<Props> = ({ official }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [records, setRecords] = useState<
        OfficialCompliance[]
    >([]);

    useEffect(() => {
        loadCompliance();
    }, [official.id]);

    const loadCompliance = async () => {
        try {
            setLoading(true);

            const data =
                await officialService.getCompliance(
                    official.id
                );

            setRecords(data);
        } finally {
            setLoading(false);
        }
    };

    const addCompliance = () => {
        setRecords([
            ...records,
            {
                id: crypto.randomUUID(),
                official_id: official.id,
                organisation_id: official.organisation_id,
                compliance_name: '',
                status: 'valid',
                issue_date: '',
                expiry_date: '',
                document_url: '',
                notes: '',
                created_at: '',
                updated_at: '',
            },
        ]);
    };

    const updateRow = (
        index: number,
        field: keyof OfficialCompliance,
        value: any
    ) => {
        const rows = [...records];

        rows[index] = {
            ...rows[index],
            [field]: value,
        };

        setRecords(rows);
    };

    const removeRow = (index: number) => {
        const rows = [...records];
        rows.splice(index, 1);
        setRecords(rows);
    };

    const save = async (): Promise<void> => {
        try {
            setSaving(true);

            for (const row of records) {
                const isExistingRecord =
                    Boolean(row.created_at) &&
                    Boolean(row.updated_at);

                if (isExistingRecord) {
                    await officialService.updateCompliance(
                        row.id,
                        {
                            compliance_name:
                            row.compliance_name,
                            status: row.status,
                            issue_date:
                            row.issue_date,
                            expiry_date:
                            row.expiry_date,
                            document_url:
                            row.document_url,
                            notes: row.notes,
                        }
                    );
                } else {
                    await officialService.addCompliance({
                        official_id: official.id,
                        organisation_id:
                        official.organisation_id,
                        compliance_name:
                        row.compliance_name,
                        status: row.status,
                        issue_date:
                        row.issue_date,
                        expiry_date:
                        row.expiry_date,
                        document_url:
                        row.document_url,
                        notes: row.notes,
                    });
                }
            }

            await loadCompliance();
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-xl bg-white p-12 text-center">
                Loading compliance...
            </div>
        );
    }

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">

                <div>

                    <h2 className="flex items-center gap-2 text-xl font-bold">

                        <ShieldCheck size={22} />

                        Compliance

                    </h2>

                    <p className="text-sm text-slate-500">
                        DBS, safeguarding, insurance,
                        identity verification and other
                        compliance records.
                    </p>

                </div>

                <button
                    onClick={addCompliance}
                    className="flex items-center gap-2 rounded-lg bg-lime-600 px-4 py-2 font-semibold text-white"
                >
                    <Plus size={16} />
                    Add Compliance
                </button>

            </div>

            <div className="overflow-hidden rounded-xl border bg-white">

                <table className="min-w-full">

                    <thead className="bg-slate-50">

                    <tr>

                        <th className="px-4 py-3 text-left">
                            Compliance
                        </th>

                        <th className="px-4 py-3 text-left">
                            Status
                        </th>

                        <th className="px-4 py-3 text-left">
                            Issue Date
                        </th>

                        <th className="px-4 py-3 text-left">
                            Expiry Date
                        </th>

                        <th className="px-4 py-3 text-left">
                            Notes
                        </th>

                        <th />

                    </tr>

                    </thead>

                    <tbody>

                    {records.map((row, index) => (
                        <tr
                            key={row.id}
                            className="border-t"
                        >

                            <td className="p-3">

                                <input
                                    className="w-full rounded-lg border p-2"
                                    value={
                                        row.compliance_name
                                    }
                                    onChange={(e) =>
                                        updateRow(
                                            index,
                                            'compliance_name',
                                            e.target.value
                                        )
                                    }
                                />

                            </td>

                            <td className="p-3">

                                <select
                                    className="w-full rounded-lg border p-2"
                                    value={row.status}
                                    onChange={(e) =>
                                        updateRow(
                                            index,
                                            'status',
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="valid">
                                        Valid
                                    </option>

                                    <option value="expiring">
                                        Expiring
                                    </option>

                                    <option value="expired">
                                        Expired
                                    </option>

                                    <option value="missing">
                                        Missing
                                    </option>

                                </select>

                            </td>

                            <td className="p-3">

                                <input
                                    type="date"
                                    className="w-full rounded-lg border p-2"
                                    value={
                                        row.issue_date ?? ''
                                    }
                                    onChange={(e) =>
                                        updateRow(
                                            index,
                                            'issue_date',
                                            e.target.value
                                        )
                                    }
                                />

                            </td>

                            <td className="p-3">

                                <input
                                    type="date"
                                    className="w-full rounded-lg border p-2"
                                    value={
                                        row.expiry_date ??
                                        ''
                                    }
                                    onChange={(e) =>
                                        updateRow(
                                            index,
                                            'expiry_date',
                                            e.target.value
                                        )
                                    }
                                />

                            </td>

                            <td className="p-3">

                                <input
                                    className="w-full rounded-lg border p-2"
                                    value={
                                        row.notes ?? ''
                                    }
                                    onChange={(e) =>
                                        updateRow(
                                            index,
                                            'notes',
                                            e.target.value
                                        )
                                    }
                                />

                            </td>

                            <td className="p-3 text-right">

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
                    ))}

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
                        : 'Save Compliance'}

                </button>

            </div>

        </div>
    );
};

export default ComplianceTab;