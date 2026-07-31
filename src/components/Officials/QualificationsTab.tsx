import React, { useEffect, useState } from 'react';
import {
    Plus,
    Save,
    Trash2,
    Award,
} from 'lucide-react';

import { officialService } from '../../services/officialService';
import {
    Official,
    OfficialQualification,
} from '../../types/officialTypes';

interface Props {
    official: Official;
}

const QualificationsTab: React.FC<Props> = ({ official }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [qualifications, setQualifications] =
        useState<OfficialQualification[]>([]);

    useEffect(() => {
        loadQualifications();
    }, [official.id]);

    const loadQualifications = async () => {
        try {
            setLoading(true);

            const data =
                await officialService.getQualifications(
                    official.id
                );

            setQualifications(data);
        } finally {
            setLoading(false);
        }
    };

    const addQualification = () => {
        setQualifications([
            ...qualifications,
            {
                id: crypto.randomUUID(),
                official_id: official.id,
                organisation_id: official.organisation_id,
                sport_id: null,
                qualification_name: '',
                issuing_body: '',
                qualification_level: '',
                certificate_number: '',
                issue_date: '',
                expiry_date: '',
                status: 'active',
                document_url: '',
                created_at: '',
                updated_at: '',
            },
        ]);
    };

    const updateQualification = (
        index: number,
        field: keyof OfficialQualification,
        value: any
    ) => {
        const rows = [...qualifications];

        rows[index] = {
            ...rows[index],
            [field]: value,
        };

        setQualifications(rows);
    };

    const removeQualification = (
        index: number
    ) => {
        const rows = [...qualifications];
        rows.splice(index, 1);
        setQualifications(rows);
    };

    const save = async () => {
        try {
            setSaving(true);

            for (const qualification of qualifications) {
                await officialService.addQualification(
                    qualification
                );
            }

            await loadQualifications();
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-xl bg-white p-10 text-center">
                Loading qualifications...
            </div>
        );
    }

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">

                <div>

                    <h2 className="flex items-center gap-2 text-xl font-bold">

                        <Award size={22} />

                        Qualifications

                    </h2>

                    <p className="text-sm text-slate-500">
                        Store referee licences,
                        coaching badges,
                        safeguarding and governing
                        body qualifications.
                    </p>

                </div>

                <button
                    onClick={addQualification}
                    className="flex items-center gap-2 rounded-lg bg-lime-600 px-4 py-2 font-semibold text-white"
                >
                    <Plus size={16} />
                    Add Qualification
                </button>

            </div>

            <div className="overflow-hidden rounded-xl border bg-white">

                <table className="min-w-full">

                    <thead className="bg-slate-50">

                    <tr>

                        <th className="px-4 py-3 text-left">
                            Qualification
                        </th>

                        <th className="px-4 py-3 text-left">
                            Issuing Body
                        </th>

                        <th className="px-4 py-3 text-left">
                            Level
                        </th>

                        <th className="px-4 py-3 text-left">
                            Issue Date
                        </th>

                        <th className="px-4 py-3 text-left">
                            Expiry Date
                        </th>

                        <th className="px-4 py-3 text-left">
                            Status
                        </th>

                        <th />

                    </tr>

                    </thead>

                    <tbody>

                    {qualifications.map(
                        (qualification, index) => (
                            <tr
                                key={qualification.id}
                                className="border-t"
                            >

                                <td className="p-3">

                                    <input
                                        className="w-full rounded-lg border p-2"
                                        value={
                                            qualification.qualification_name
                                        }
                                        onChange={(e) =>
                                            updateQualification(
                                                index,
                                                'qualification_name',
                                                e.target.value
                                            )
                                        }
                                    />

                                </td>

                                <td className="p-3">

                                    <input
                                        className="w-full rounded-lg border p-2"
                                        value={
                                            qualification.issuing_body
                                        }
                                        onChange={(e) =>
                                            updateQualification(
                                                index,
                                                'issuing_body',
                                                e.target.value
                                            )
                                        }
                                    />

                                </td>

                                <td className="p-3">

                                    <input
                                        className="w-full rounded-lg border p-2"
                                        value={
                                            qualification.qualification_level ??
                                            ''
                                        }
                                        onChange={(e) =>
                                            updateQualification(
                                                index,
                                                'qualification_level',
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
                                            qualification.issue_date ??
                                            ''
                                        }
                                        onChange={(e) =>
                                            updateQualification(
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
                                            qualification.expiry_date ??
                                            ''
                                        }
                                        onChange={(e) =>
                                            updateQualification(
                                                index,
                                                'expiry_date',
                                                e.target.value
                                            )
                                        }
                                    />

                                </td>

                                <td className="p-3">

                                    <select
                                        className="w-full rounded-lg border p-2"
                                        value={
                                            qualification.status
                                        }
                                        onChange={(e) =>
                                            updateQualification(
                                                index,
                                                'status',
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="active">
                                            Active
                                        </option>

                                        <option value="expired">
                                            Expired
                                        </option>

                                        <option value="pending">
                                            Pending
                                        </option>

                                        <option value="suspended">
                                            Suspended
                                        </option>

                                    </select>

                                </td>

                                <td className="p-3 text-right">

                                    <button
                                        onClick={() =>
                                            removeQualification(
                                                index
                                            )
                                        }
                                        className="rounded-lg p-2 hover:bg-red-50"
                                    >
                                        <Trash2 size={18} />
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
                        : 'Save Qualifications'}

                </button>

            </div>

        </div>
    );
};

export default QualificationsTab;