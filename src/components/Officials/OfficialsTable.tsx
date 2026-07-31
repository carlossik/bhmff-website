import React from 'react';
import {
    Calendar,
    Edit3,
    Eye,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    Star,
    Trash2,
    UserRoundSearch,
} from 'lucide-react';

import type { Official } from '../../types/officialTypes';

interface Props {
    officials: Official[];
    loading: boolean;
    onView: (official: Official) => void;
    onEdit: (official: Official) => void;
    onDelete: (
        official: Official
    ) => void | Promise<void>;
    onRefresh: () => void | Promise<void>;
    sportName?: string | null;
}

const statusBadge = (
    status: string
): string => {
    switch (status) {
        case 'active':
            return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
        case 'inactive':
            return 'border-slate-600 bg-slate-700/30 text-slate-300';
        case 'pending':
            return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
        case 'suspended':
            return 'border-red-500/40 bg-red-500/10 text-red-300';
        case 'retired':
            return 'border-violet-500/40 bg-violet-500/10 text-violet-300';
        case 'archived':
            return 'border-slate-700 bg-black/20 text-slate-500';
        default:
            return 'border-slate-700 bg-black/20 text-slate-400';
    }
};

const verificationBadge = (
    status: string
): React.ReactElement => {
    switch (status) {
        case 'verified':
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <ShieldCheck size={14} aria-hidden="true" />
                    Verified
                </span>
            );

        case 'pending':
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                    <ShieldAlert size={14} aria-hidden="true" />
                    Pending
                </span>
            );

        case 'rejected':
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                    <ShieldAlert size={14} aria-hidden="true" />
                    Rejected
                </span>
            );

        case 'not_verified':
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-700/20 px-3 py-1 text-xs font-semibold text-slate-400">
                    <ShieldAlert size={14} aria-hidden="true" />
                    Not Verified
                </span>
            );

        default:
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-black/20 px-3 py-1 text-xs font-semibold text-slate-500">
                    Unknown
                </span>
            );
    }
};

const formatRole = (
    role: string
): string =>
    role
        .replace(/_/g, ' ')
        .replace(
            /\b\w/g,
            character =>
                character.toUpperCase()
        );

const formatUpdatedDate = (
    updatedAt: string | null | undefined
): string => {
    if (!updatedAt) {
        return 'Not recorded';
    }

    const date = new Date(updatedAt);

    if (Number.isNaN(date.getTime())) {
        return 'Not recorded';
    }

    return date.toLocaleDateString(
        undefined,
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }
    );
};

const LoadingState: React.FC = () => (
    <section className="overflow-hidden rounded-2xl border border-lime-900/50 bg-[#10190f] shadow-xl shadow-black/10">
        <div className="border-b border-lime-900/40 px-5 py-5">
            <div className="h-4 w-36 animate-pulse rounded bg-lime-900/50" />
            <div className="mt-2 h-6 w-64 animate-pulse rounded bg-lime-900/40" />
        </div>

        <div className="space-y-3 p-5">
            {Array.from({
                length: 5,
            }).map((_, index) => (
                <div
                    key={index}
                    className="h-16 animate-pulse rounded-xl border border-lime-900/30 bg-black/20"
                />
            ))}
        </div>
    </section>
);

const OfficialsTable: React.FC<Props> = ({
                                             officials,
                                             loading,
                                             onView,
                                             onEdit,
                                             onDelete,
                                             onRefresh,
                                             sportName = null,
                                         }) => {
    if (loading) {
        return <LoadingState />;
    }

    if (officials.length === 0) {
        const heading = sportName
            ? `No ${sportName} officials found`
            : 'No officials found';

        const description = sportName
            ? `Add your first ${sportName} official to begin building your competition operations team.`
            : 'Add your first official to begin building your competition operations team.';

        return (
            <section className="rounded-2xl border border-dashed border-lime-800/60 bg-[#10190f] px-6 py-14 text-center shadow-xl shadow-black/10">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-lime-700/50 bg-lime-400/10 text-lime-400">
                    <UserRoundSearch
                        size={28}
                        aria-hidden="true"
                    />
                </div>

                <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-lime-400">
                    Official Directory
                </p>

                <h3 className="mt-2 text-2xl font-bold text-white">
                    {heading}
                </h3>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
                    {description}
                </p>

                <button
                    type="button"
                    onClick={() =>
                        void onRefresh()
                    }
                    className="mt-6 inline-flex items-center gap-2 rounded-xl border border-lime-700/60 bg-lime-400/10 px-4 py-2.5 text-sm font-semibold text-lime-300 transition hover:border-lime-400 hover:bg-lime-400/15 hover:text-lime-200"
                >
                    <RefreshCw
                        size={16}
                        aria-hidden="true"
                    />

                    Refresh List
                </button>
            </section>
        );
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-lime-900/50 bg-[#10190f] shadow-xl shadow-black/10">
            <div className="flex flex-col gap-3 border-b border-lime-900/40 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-400">
                        Official Directory
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-white">
                        {sportName
                            ? `${sportName} Officials`
                            : 'All Officials'}
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                        {officials.length}{' '}
                        {officials.length === 1
                            ? 'official'
                            : 'officials'}{' '}
                        currently shown.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        void onRefresh()
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-800/60 bg-black/20 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-lime-500 hover:bg-lime-400/10 hover:text-white"
                >
                    <RefreshCw
                        size={16}
                        aria-hidden="true"
                    />

                    Refresh
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead className="sticky top-0 z-10 bg-[#0b140a]">
                    <tr className="border-b border-lime-900/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
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

                    <tbody className="divide-y divide-lime-900/30">
                    {officials.map(
                        (
                            official,
                            index
                        ) => {
                            const displayName =
                                official
                                    .full_name
                                    ?.trim() ||
                                `${official.first_name} ${official.last_name}`.trim();

                            const initials =
                                `${official.first_name?.charAt(0) ?? ''}${official.last_name?.charAt(0) ?? ''}`.toUpperCase();

                            return (
                                <tr
                                    key={official.id}
                                    className={`transition ${
                                        index % 2 === 0
                                            ? 'bg-black/5'
                                            : 'bg-white/[0.015]'
                                    } hover:bg-lime-400/[0.05]`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-lime-500/40 bg-lime-400/10 text-sm font-black text-lime-300 shadow-inner shadow-black/20">
                                                {initials || 'OF'}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-white">
                                                    {displayName}
                                                </p>

                                                <p className="mt-1 truncate text-xs text-slate-500">
                                                    {official.city ||
                                                        'Location not set'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 text-sm font-medium text-slate-300">
                                        {formatRole(
                                            official.role
                                        )}
                                    </td>

                                    <td className="max-w-[220px] px-6 py-4">
                                            <span className="block truncate text-sm text-slate-400">
                                                {official.email ||
                                                    'No email'}
                                            </span>
                                    </td>

                                    <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusBadge(
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
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                                            <Star
                                                size={16}
                                                className="fill-amber-400 text-amber-400"
                                                aria-hidden="true"
                                            />

                                            {typeof official.average_rating ===
                                            'number'
                                                ? official.average_rating.toFixed(1)
                                                : '—'}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 text-sm font-semibold text-slate-300">
                                        {official.completed_matches ?? 0}
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-500">
                                            <Calendar
                                                size={14}
                                                aria-hidden="true"
                                            />

                                            {formatUpdatedDate(
                                                official.updated_at
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onView(official)
                                                }
                                                title={`View ${displayName}`}
                                                aria-label={`View ${displayName}`}
                                                className="rounded-lg border border-slate-700 bg-black/20 p-2 text-slate-400 transition hover:border-lime-500 hover:bg-lime-400/10 hover:text-lime-300"
                                            >
                                                <Eye size={16} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onEdit(official)
                                                }
                                                title={`Edit ${displayName}`}
                                                aria-label={`Edit ${displayName}`}
                                                className="rounded-lg border border-slate-700 bg-black/20 p-2 text-slate-400 transition hover:border-sky-500 hover:bg-sky-500/10 hover:text-sky-300"
                                            >
                                                <Edit3 size={16} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void onDelete(official)
                                                }
                                                title={`Delete ${displayName}`}
                                                aria-label={`Delete ${displayName}`}
                                                className="rounded-lg border border-slate-700 bg-black/20 p-2 text-slate-400 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-300"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }
                    )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default OfficialsTable;