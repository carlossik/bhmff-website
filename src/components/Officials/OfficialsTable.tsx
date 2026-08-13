import React from 'react';
import {
    Calendar,
    Edit,
    Eye,
    ShieldAlert,
    ShieldCheck,
    Star,
    Trash2,
} from 'lucide-react';

import { Official } from '../../types/officialTypes';

interface Props {
    officials: Official[];
    loading: boolean;
    onView: (official: Official) => void;
    onEdit: (official: Official) => void;
    onDelete: (official: Official) => void | Promise<void>;
    onRefresh: () => void | Promise<void>;
}

const statusBadge = (status: string): string => {
    switch (status) {
        case 'active':
            return 'bg-[var(--organisation-surface)] text-[var(--organisation-accent)]';
        case 'inactive':
            return 'bg-[color:var(--organisation-text)]/10 text-[color:var(--organisation-text)]/75';
        case 'suspended':
            return 'bg-red-500/15 text-red-300';
        case 'pending':
            return 'bg-amber-500/15 text-amber-300';
        default:
            return 'bg-[color:var(--organisation-text)]/10 text-[color:var(--organisation-text)]/75';
    }
};

const verificationBadge = (
    status: string
): React.ReactElement => {
    switch (status) {
        case 'verified':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--organisation-surface)] px-3 py-1 text-xs font-semibold text-[var(--organisation-accent)]">
                    <ShieldCheck size={14} />
                    Verified
                </span>
            );

        case 'pending':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    <ShieldAlert size={14} />
                    Pending
                </span>
            );

        case 'rejected':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    <ShieldAlert size={14} />
                    Rejected
                </span>
            );

        default:
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Unknown
                </span>
            );
    }
};

const formatRole = (role: string): string =>
    role.replace(/_/g, ' ');

const formatUpdatedDate = (
    updatedAt: string | null | undefined
): string => {
    if (!updatedAt) {
        return '-';
    }

    const date = new Date(updatedAt);

    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleDateString();
};

const OfficialsTable: React.FC<Props> = ({
                                             officials,
                                             loading,
                                             onView,
                                             onEdit,
                                             onDelete,
                                         }) => {
    if (loading) {
        return (
            <div className="rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-12 text-center">
                Loading officials...
            </div>
        );
    }

    if (officials.length === 0) {
        return (
            <div className="rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-12 text-center text-[color:var(--organisation-text)]/55">
                No officials found.
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full text-[var(--organisation-text)]">
                    <thead className="bg-[var(--organisation-background)]">
                    <tr className="text-left text-xs uppercase tracking-wider text-[color:var(--organisation-text)]/55">
                        <th className="px-6 py-4">Official</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Verification</th>
                        <th className="px-6 py-4">Rating</th>
                        <th className="px-6 py-4">Matches</th>
                        <th className="px-6 py-4">Updated</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                    </thead>

                    <tbody className="divide-y divide-[color:var(--organisation-border)]">
                    {officials.map(official => {
                        const displayName =
                            official.full_name?.trim() ||
                            `${official.first_name} ${official.last_name}`.trim();

                        return (
                            <tr
                                key={official.id}
                                className="hover:bg-[var(--organisation-background)]"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--organisation-accent)] text-sm font-bold text-[var(--organisation-on-accent)]">
                                            {official.first_name.charAt(0).toUpperCase()}
                                            {official.last_name.charAt(0).toUpperCase()}
                                        </div>

                                        <div>
                                            <div className="font-semibold text-[var(--organisation-text)]">
                                                {displayName}
                                            </div>

                                            <div className="text-xs text-[color:var(--organisation-text)]/55">
                                                {official.city ?? '-'}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-6 py-4 capitalize">
                                    {formatRole(official.role)}
                                </td>

                                <td className="px-6 py-4">
                                    {official.email ?? '-'}
                                </td>

                                <td className="px-6 py-4">
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                                                official.status
                                            )}`}
                                        >
                                            {official.status}
                                        </span>
                                </td>

                                <td className="px-6 py-4">
                                    {verificationBadge(
                                        official.verification_status
                                    )}
                                </td>

                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Star
                                            size={16}
                                            className="text-yellow-500"
                                        />

                                        {typeof official.average_rating === 'number'
                                            ? official.average_rating.toFixed(1)
                                            : '-'}
                                    </div>
                                </td>

                                <td className="px-6 py-4">
                                    {official.completed_matches ?? 0}
                                </td>

                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-[color:var(--organisation-text)]/55">
                                        <Calendar size={14} />
                                        {formatUpdatedDate(
                                            official.updated_at
                                        )}
                                    </div>
                                </td>

                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onView(official)}
                                            title={`View ${displayName}`}
                                            aria-label={`View ${displayName}`}
                                            className="rounded-lg border border-[color:var(--organisation-border)] p-2 text-[color:var(--organisation-text)]/70 transition-colors hover:bg-[color:var(--organisation-accent)]/10 hover:text-[var(--organisation-text)]"
                                        >
                                            <Eye size={16} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onEdit(official)}
                                            title={`Edit ${displayName}`}
                                            aria-label={`Edit ${displayName}`}
                                            className="rounded-lg border border-[color:var(--organisation-border)] p-2 text-[color:var(--organisation-text)]/70 transition-colors hover:bg-[color:var(--organisation-accent)]/10 hover:text-[var(--organisation-accent)]"
                                        >
                                            <Edit size={16} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                void onDelete(official)
                                            }
                                            title={`Delete ${displayName}`}
                                            aria-label={`Delete ${displayName}`}
                                            className="rounded-lg border border-[color:var(--organisation-border)] p-2 text-[color:var(--organisation-text)]/70 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OfficialsTable;