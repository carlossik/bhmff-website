import React from 'react';
import {
    Filter,
    RotateCcw,
    Search,
    SlidersHorizontal,
} from 'lucide-react';

import type {
    MarketplaceVisibility,
    OfficialFilters as OfficialFiltersType,
    OfficialRole,
    OfficialStatus,
    VerificationStatus,
} from '../../types/officialTypes';

interface RoleOption {
    value: OfficialRole;
    label: string;
}

interface Props {
    search: string;
    onSearchChange: (value: string) => void;

    filters: OfficialFiltersType;
    onFiltersChange: (
        filters: OfficialFiltersType
    ) => void;

    onReset: () => void;

    sportName?: string | null;
    roleOptions?: RoleOption[];
    rolesLoading?: boolean;
}

const fallbackRoleOptions: RoleOption[] = [
    {
        value: 'referee',
        label: 'Referee',
    },
    {
        value: 'assistant_referee',
        label: 'Assistant Referee',
    },
    {
        value: 'fourth_official',
        label: 'Fourth Official',
    },
    {
        value: 'match_commissioner',
        label: 'Match Commissioner',
    },
    {
        value: 'assessor',
        label: 'Assessor',
    },
    {
        value: 'observer',
        label: 'Observer',
    },
    {
        value: 'timekeeper',
        label: 'Timekeeper',
    },
    {
        value: 'scorekeeper',
        label: 'Scorekeeper',
    },
    {
        value: 'umpire',
        label: 'Umpire',
    },
    {
        value: 'line_judge',
        label: 'Line Judge',
    },
    {
        value: 'table_official',
        label: 'Table Official',
    },
    {
        value: 'marshal',
        label: 'Marshal',
    },
    {
        value: 'technical_delegate',
        label: 'Technical Delegate',
    },
    {
        value: 'venue_official',
        label: 'Venue Official',
    },
    {
        value: 'medical_official',
        label: 'Medical Official',
    },
    {
        value: 'other',
        label: 'Other',
    },
];

const inputClass =
    'block w-full rounded-xl border border-lime-900/60 bg-[#071006] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-black/30 disabled:text-slate-500';

const labelClass =
    'mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400';

const OfficialsFilters: React.FC<Props> = ({
                                               search,
                                               onSearchChange,
                                               filters,
                                               onFiltersChange,
                                               onReset,
                                               sportName = null,
                                               roleOptions,
                                               rolesLoading = false,
                                           }) => {
    const availableRoleOptions =
        roleOptions ?? fallbackRoleOptions;

    const updateFilter = <
        Key extends keyof OfficialFiltersType
    >(
        key: Key,
        value: OfficialFiltersType[Key]
    ): void => {
        onFiltersChange({
            ...filters,
            [key]: value || undefined,
        });
    };

    const hasActiveFilters =
        Boolean(search.trim()) ||
        Boolean(filters.role) ||
        Boolean(filters.status) ||
        Boolean(filters.verification_status) ||
        Boolean(filters.marketplace_visibility) ||
        Boolean(filters.location) ||
        filters.minimum_rating !== undefined;

    return (
        <section className="overflow-hidden rounded-2xl border border-lime-900/50 bg-[#10190f] shadow-xl shadow-black/10">
            <div className="flex flex-col gap-4 border-b border-lime-900/40 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-lime-700/50 bg-lime-400/10 text-lime-400">
                        <Filter
                            size={19}
                            aria-hidden="true"
                        />
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-400">
                            Official Directory
                        </p>

                        <h3 className="mt-1 text-lg font-bold text-white">
                            Search & Filters
                        </h3>

                        <p className="mt-1 text-sm text-slate-400">
                            {sportName
                                ? `Filter ${sportName} officials by role, status and verification.`
                                : 'Filter officials by role, status and verification.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <SlidersHorizontal
                        size={16}
                        aria-hidden="true"
                    />

                    <span>
                        {hasActiveFilters
                            ? 'Filters active'
                            : 'No filters applied'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-12">
                <div className="xl:col-span-3">
                    <label
                        htmlFor="official-search"
                        className={labelClass}
                    >
                        Search
                    </label>

                    <div className="relative">
                        <Search
                            size={17}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                            aria-hidden="true"
                        />

                        <input
                            id="official-search"
                            type="search"
                            placeholder="Name, email or phone..."
                            value={search}
                            onChange={event =>
                                onSearchChange(
                                    event.target.value
                                )
                            }
                            className={`${inputClass} pl-10`}
                        />
                    </div>
                </div>

                <div className="xl:col-span-2">
                    <label
                        htmlFor="official-role-filter"
                        className={labelClass}
                    >
                        Role
                    </label>

                    <select
                        id="official-role-filter"
                        value={filters.role ?? ''}
                        disabled={rolesLoading}
                        onChange={event =>
                            updateFilter(
                                'role',
                                event.target.value
                                    ? (event.target
                                        .value as OfficialRole)
                                    : undefined
                            )
                        }
                        className={inputClass}
                    >
                        <option value="">
                            {rolesLoading
                                ? 'Loading roles...'
                                : 'All Roles'}
                        </option>

                        {availableRoleOptions.map(
                            option => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            )
                        )}
                    </select>
                </div>

                <div className="xl:col-span-2">
                    <label
                        htmlFor="official-status-filter"
                        className={labelClass}
                    >
                        Status
                    </label>

                    <select
                        id="official-status-filter"
                        value={filters.status ?? ''}
                        onChange={event =>
                            updateFilter(
                                'status',
                                event.target.value
                                    ? (event.target
                                        .value as OfficialStatus)
                                    : undefined
                            )
                        }
                        className={inputClass}
                    >
                        <option value="">
                            All Statuses
                        </option>
                        <option value="active">
                            Active
                        </option>
                        <option value="inactive">
                            Inactive
                        </option>
                        <option value="pending">
                            Pending
                        </option>
                        <option value="suspended">
                            Suspended
                        </option>
                        <option value="retired">
                            Retired
                        </option>
                        <option value="archived">
                            Archived
                        </option>
                    </select>
                </div>

                <div className="xl:col-span-2">
                    <label
                        htmlFor="official-verification-filter"
                        className={labelClass}
                    >
                        Verification
                    </label>

                    <select
                        id="official-verification-filter"
                        value={
                            filters.verification_status ??
                            ''
                        }
                        onChange={event =>
                            updateFilter(
                                'verification_status',
                                event.target.value
                                    ? (event.target
                                        .value as VerificationStatus)
                                    : undefined
                            )
                        }
                        className={inputClass}
                    >
                        <option value="">
                            All Verification
                        </option>
                        <option value="not_verified">
                            Not Verified
                        </option>
                        <option value="pending">
                            Pending
                        </option>
                        <option value="verified">
                            Verified
                        </option>
                        <option value="rejected">
                            Rejected
                        </option>
                    </select>
                </div>

                <div className="xl:col-span-2">
                    <label
                        htmlFor="official-marketplace-filter"
                        className={labelClass}
                    >
                        Marketplace
                    </label>

                    <select
                        id="official-marketplace-filter"
                        value={
                            filters.marketplace_visibility ??
                            ''
                        }
                        onChange={event =>
                            updateFilter(
                                'marketplace_visibility',
                                event.target.value
                                    ? (event.target
                                        .value as MarketplaceVisibility)
                                    : undefined
                            )
                        }
                        className={inputClass}
                    >
                        <option value="">
                            All Visibility
                        </option>
                        <option value="public">
                            Public
                        </option>
                        <option value="organisation_only">
                            Organisation Only
                        </option>
                        <option value="private">
                            Private
                        </option>
                    </select>
                </div>

                <div className="flex items-end xl:col-span-1">
                    <button
                        type="button"
                        onClick={onReset}
                        disabled={!hasActiveFilters}
                        className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-black/20 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-lime-600 hover:bg-lime-400/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <RotateCcw
                            size={16}
                            aria-hidden="true"
                        />

                        Reset
                    </button>
                </div>
            </div>
        </section>
    );
};

export default OfficialsFilters;