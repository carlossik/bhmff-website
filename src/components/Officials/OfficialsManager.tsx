import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    Plus,
    RefreshCw,
    Search,
} from 'lucide-react';

import { officialService } from '../../services/officialService';
import { sportsService } from '../../services/sportsService';

import {
    Official,
    OfficialDashboardStats,
    OfficialFilters,
    OfficialRole,
    OfficialStatus,
    VerificationStatus,
} from '../../types/officialTypes';

import type {
    SportOfficialRole,
} from '../../types/sportTypes';

import OfficialsDashboard from './OfficialsDashboard';
import OfficialsTable from './OfficialsTable';
import OfficialModal from './OfficialModal';
import OfficialProfileDrawer from './OfficialProfileDrawer';

import { useOrganisation } from '../../context/OrganisationContext';
import { useCompetition } from '../../contexts/CompetitionContext';

const DEFAULT_STATS: OfficialDashboardStats = {
    totalOfficials: 0,
    activeOfficials: 0,
    availableOfficials: 0,
    suspendedOfficials: 0,
    pendingVerification: 0,
    expiringCompliance: 0,
    assignmentsToday: 0,
    assignmentsThisWeek: 0,
    paymentsPending: 0,
    averageRating: 0,
};

const OfficialsManager: React.FC = () => {
    const { currentOrganisation } = useOrganisation();
    const { currentCompetition } = useCompetition();
    console.log(currentCompetition);

    const currentOrganisationId =
        currentOrganisation?.id ?? '';

    const competitionSportId =
        currentCompetition?.sport_id ?? null;

    const competitionSportName =
        currentCompetition?.sport?.name ?? null;

    const [officials, setOfficials] =
        useState<Official[]>([]);

    const [stats, setStats] =
        useState<OfficialDashboardStats>(
            DEFAULT_STATS
        );

    const [availableRoles, setAvailableRoles] =
        useState<SportOfficialRole[]>([]);

    const [rolesLoading, setRolesLoading] =
        useState(false);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [
        selectedOfficial,
        setSelectedOfficial,
    ] = useState<Official | null>(null);

    const [modalOpen, setModalOpen] =
        useState(false);

    const [drawerOpen, setDrawerOpen] =
        useState(false);

    const [filters, setFilters] =
        useState<OfficialFilters>({
            search: '',
        });

    const loadOfficials =
        useCallback(async (): Promise<void> => {
            if (!currentOrganisationId) {
                setOfficials([]);
                setStats(DEFAULT_STATS);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                const [
                    officialData,
                    dashboard,
                ] = await Promise.all([
                    officialService.getAll(
                        currentOrganisationId
                    ),
                    officialService.getDashboardStats(
                        currentOrganisationId
                    ),
                ]);

                setOfficials(officialData);
                setStats(dashboard);
            } catch (error) {
                console.error(
                    'Failed to load officials:',
                    error
                );

                setOfficials([]);
                setStats(DEFAULT_STATS);
            } finally {
                setLoading(false);
            }
        }, [currentOrganisationId]);

    const loadSportRoles =
        useCallback(async (): Promise<void> => {
            if (!competitionSportId) {
                setAvailableRoles([]);
                setRolesLoading(false);

                setFilters(previous => ({
                    ...previous,
                    role: undefined,
                }));

                return;
            }

            try {
                setRolesLoading(true);

                const roles =
                    await sportsService.getRolesForSport(
                        competitionSportId
                    );

                const activeRoles =
                    roles.filter(
                        role => role.active
                    );

                setAvailableRoles(activeRoles);

                setFilters(previous => {
                    if (
                        !previous.role ||
                        activeRoles.some(
                            role =>
                                role.role ===
                                previous.role
                        )
                    ) {
                        return previous;
                    }

                    return {
                        ...previous,
                        role: undefined,
                    };
                });
            } catch (error) {
                console.error(
                    'Failed to load sport official roles:',
                    error
                );

                setAvailableRoles([]);

                setFilters(previous => ({
                    ...previous,
                    role: undefined,
                }));
            } finally {
                setRolesLoading(false);
            }
        }, [competitionSportId]);

    useEffect(() => {
        void loadOfficials();
    }, [loadOfficials]);

    useEffect(() => {
        void loadSportRoles();
    }, [loadSportRoles]);

    useEffect(() => {
        setSelectedOfficial(null);
        setModalOpen(false);
        setDrawerOpen(false);
    }, [
        currentOrganisationId,
        currentCompetition?.id,
    ]);

    const filteredOfficials =
        useMemo(() => {
            let data = [...officials];

            const search =
                filters.search
                    ?.trim()
                    .toLowerCase() ?? '';

            if (search) {
                data = data.filter(
                    official =>
                        (
                            official.full_name ??
                            `${official.first_name} ${official.last_name}`
                        )
                            .toLowerCase()
                            .includes(search) ||
                        official.email
                            ?.toLowerCase()
                            .includes(search) ||
                        official.phone
                            ?.toLowerCase()
                            .includes(search)
                );
            }

            if (filters.role) {
                data = data.filter(
                    official =>
                        official.role ===
                        filters.role
                );
            }

            if (filters.status) {
                data = data.filter(
                    official =>
                        official.status ===
                        filters.status
                );
            }

            if (
                filters.verification_status
            ) {
                data = data.filter(
                    official =>
                        official
                            .verification_status ===
                        filters.verification_status
                );
            }

            return data;
        }, [officials, filters]);

    const handleCreate = (): void => {
        setSelectedOfficial(null);
        setDrawerOpen(false);
        setModalOpen(true);
    };

    const handleEdit = (
        official: Official
    ): void => {
        setSelectedOfficial(official);
        setDrawerOpen(false);
        setModalOpen(true);
    };

    const handleView = (
        official: Official
    ): void => {
        setSelectedOfficial(official);
        setModalOpen(false);
        setDrawerOpen(true);
    };

    const handleDelete = async (
        official: Official
    ): Promise<void> => {
        const officialName =
            official.full_name ??
            `${official.first_name} ${official.last_name}`;

        if (
            !window.confirm(
                `Delete ${officialName}?`
            )
        ) {
            return;
        }

        try {
            await officialService.delete(
                official.id
            );

            await loadOfficials();
        } catch (error) {
            console.error(
                'Failed to delete official:',
                error
            );
        }
    };

    const handleSave = async (
        payload: Partial<Official>
    ): Promise<void> => {
        if (!currentOrganisationId) {
            console.error(
                'Cannot save official without an organisation.'
            );
            return;
        }

        try {
            setSaving(true);

            const sportAwarePayload: Partial<Official> = {
                ...payload,
                sport_id:
                    payload.sport_id ??
                    competitionSportId,
            };

            if (selectedOfficial) {
                await officialService.update(
                    selectedOfficial.id,
                    sportAwarePayload
                );
            } else {
                await officialService.create({
                    ...sportAwarePayload,
                    organisation_id:
                    currentOrganisationId,
                    first_name:
                        sportAwarePayload
                            .first_name ?? '',
                    last_name:
                        sportAwarePayload
                            .last_name ?? '',
                    role:
                        sportAwarePayload.role ??
                        'referee',
                    status:
                        sportAwarePayload.status ??
                        'active',
                } as Parameters<
                    typeof officialService.create
                >[0]);
            }

            setModalOpen(false);
            setSelectedOfficial(null);

            await loadOfficials();
        } catch (error) {
            console.error(
                'Failed to save official:',
                error
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <OfficialsDashboard
                stats={stats}
            />

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Sports Officials
                        </h1>

                        <p className="text-sm text-slate-500">
                            Manage referees, umpires,
                            judges, assessors and match
                            officials.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                void loadOfficials()
                            }
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <RefreshCw
                                size={16}
                                className={
                                    loading
                                        ? 'animate-spin'
                                        : ''
                                }
                            />

                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={handleCreate}
                            disabled={
                                !currentOrganisationId
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-lime-600 px-4 py-2 text-sm font-semibold text-white hover:bg-lime-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus size={16} />

                            Add Official
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-5">
                    <div className="relative lg:col-span-2">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            size={18}
                        />

                        <input
                            type="search"
                            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100"
                            placeholder="Search officials..."
                            value={
                                filters.search
                            }
                            onChange={event =>
                                setFilters(
                                    previous => ({
                                        ...previous,
                                        search:
                                        event
                                            .target
                                            .value,
                                    })
                                )
                            }
                        />
                    </div>

                    <select
                        className="rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100"
                        value={
                            filters.role ?? ''
                        }
                        disabled={
                            rolesLoading ||
                            !competitionSportId
                        }
                        onChange={event =>
                            setFilters(
                                previous => ({
                                    ...previous,
                                    role:
                                        event.target
                                            .value
                                            ? (event
                                                .target
                                                .value as OfficialRole)
                                            : undefined,
                                })
                            )
                        }
                    >
                        <option value="">
                            {rolesLoading
                                ? 'Loading roles...'
                                : competitionSportId
                                    ? 'All Roles'
                                    : 'Select Competition'}
                        </option>

                        {availableRoles.map(
                            role => (
                                <option
                                    key={role.id}
                                    value={role.role}
                                >
                                    {
                                        role.display_name
                                    }
                                </option>
                            )
                        )}
                    </select>

                    <select
                        className="rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100"
                        value={
                            filters.status ?? ''
                        }
                        onChange={event =>
                            setFilters(
                                previous => ({
                                    ...previous,
                                    status:
                                        event.target
                                            .value
                                            ? (event
                                                .target
                                                .value as OfficialStatus)
                                            : undefined,
                                })
                            )
                        }
                    >
                        <option value="">
                            All Status
                        </option>

                        <option value="active">
                            Active
                        </option>

                        <option value="inactive">
                            Inactive
                        </option>

                        <option value="suspended">
                            Suspended
                        </option>
                    </select>

                    <select
                        className="rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100"
                        value={
                            filters
                                .verification_status ??
                            ''
                        }
                        onChange={event =>
                            setFilters(
                                previous => ({
                                    ...previous,
                                    verification_status:
                                        event.target
                                            .value
                                            ? (event
                                                .target
                                                .value as VerificationStatus)
                                            : undefined,
                                })
                            )
                        }
                    >
                        <option value="">
                            Verification
                        </option>

                        <option value="verified">
                            Verified
                        </option>

                        <option value="pending">
                            Pending
                        </option>

                        <option value="rejected">
                            Rejected
                        </option>
                    </select>
                </div>
            </div>

            <OfficialsTable
                officials={filteredOfficials}
                loading={loading}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={loadOfficials}
            />

            <OfficialModal
                open={modalOpen}
                official={selectedOfficial}
                saving={saving}
                competitionSportId={
                    competitionSportId
                }
                competitionSportName={
                    competitionSportName
                }
                onClose={() => {
                    setModalOpen(false);
                    setSelectedOfficial(null);
                }}
                onSave={handleSave}
            />

            <OfficialProfileDrawer
                open={drawerOpen}
                official={selectedOfficial}
                onClose={() => {
                    setDrawerOpen(false);
                    setSelectedOfficial(null);
                }}
            />
        </div>
    );
};

export default OfficialsManager;