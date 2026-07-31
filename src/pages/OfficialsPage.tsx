import React, {
    useMemo,
    useState,
} from 'react';
import {
    Plus,
    Trophy,
} from 'lucide-react';

import { useCompetition } from '../contexts/CompetitionContext';
import { useOrganisation } from '../context/OrganisationContext';
import { useOfficials } from '../hooks/useOfficials';

import OfficialStatsCards from '../components/Officials/OfficialStatsCards';
import OfficialsFilters from '../components/Officials/OfficialsFilters';
import OfficialsTable from '../components/Officials/OfficialsTable';
import OfficialModal from '../components/Officials/OfficialModal';
import OfficialProfileDrawer from '../components/Officials/OfficialProfileDrawer';

import type { Official } from '../types/officialTypes';

const OfficialsPage: React.FC = () => {
    const { currentOrganisation } =
        useOrganisation();

    const { currentCompetition } =
        useCompetition();

    const {
        officials,
        dashboard,
        loading,
        saving,

        search,
        setSearch,

        filters,
        setFilters,

        refresh,
        createOfficial,
        updateOfficial,
        deleteOfficial,
    } = useOfficials({
        organisationId:
            currentOrganisation?.id ?? '',
    });

    const [modalOpen, setModalOpen] =
        useState(false);

    const [
        selectedOfficial,
        setSelectedOfficial,
    ] = useState<Official | null>(null);

    const [drawerOpen, setDrawerOpen] =
        useState(false);

    const editing = useMemo(
        () =>
            Boolean(selectedOfficial) &&
            modalOpen,
        [
            selectedOfficial,
            modalOpen,
        ]
    );

    const sportName =
        currentCompetition?.sport?.name ??
        null;

    const pageTitle = sportName
        ? `${sportName} Officials`
        : 'Sports Officials';

    const pageDescription =
        currentCompetition
            ? `Manage ${sportName ?? 'sports'} officials for ${currentCompetition.name}.`
            : 'Manage referees, umpires, judges, assessors, commissioners and all competition officials.';

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
        const displayName =
            official.full_name?.trim() ||
            `${official.first_name} ${official.last_name}`.trim();

        if (
            !window.confirm(
                `Delete ${displayName}?`
            )
        ) {
            return;
        }

        await deleteOfficial(official.id);
    };

    const handleSave = async (
        official: Partial<Official>
    ): Promise<void> => {
        if (
            editing &&
            selectedOfficial
        ) {
            await updateOfficial(
                selectedOfficial.id,
                official
            );
        } else {
            await createOfficial(official);
        }

        setModalOpen(false);
        setSelectedOfficial(null);
    };

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-lime-900/50 bg-[#10190f] shadow-2xl shadow-black/20">
                <div className="relative px-6 py-7 sm:px-8">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,230,53,0.10),transparent_38%)]" />

                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">
                                Official Operations
                            </p>

                            <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
                                {pageTitle}
                            </h1>

                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
                                {pageDescription}
                            </p>

                            {currentCompetition && (
                                <div className="mt-5 flex flex-wrap items-center gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-lime-700/60 bg-lime-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-lime-300">
                                        <Trophy
                                            size={14}
                                            aria-hidden="true"
                                        />

                                        {
                                            currentCompetition.name
                                        }
                                    </span>

                                    {sportName && (
                                        <span className="inline-flex items-center rounded-full border border-slate-700 bg-black/20 px-3 py-1.5 text-xs font-semibold text-slate-300">
                                            {sportName}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleCreate}
                            disabled={
                                !currentOrganisation?.id
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-6 py-3 font-bold text-black shadow-lg shadow-lime-950/30 transition hover:-translate-y-0.5 hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Plus
                                size={18}
                                aria-hidden="true"
                            />

                            Add Official
                        </button>
                    </div>
                </div>
            </section>

            <OfficialStatsCards
                stats={dashboard}
                loading={loading}
                sportName={sportName}
            />

            <OfficialsFilters
                search={search}
                onSearchChange={setSearch}
                filters={filters}
                onFiltersChange={setFilters}
                onReset={() => {
                    setSearch('');
                    setFilters({});
                }}
                sportName={sportName}
            />

            <OfficialsTable
                officials={officials}
                loading={loading}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={refresh}
                sportName={sportName}
            />

            <OfficialModal
                open={modalOpen}
                official={selectedOfficial}
                saving={saving}
                competitionSportId={
                    currentCompetition
                        ?.sport_id ?? null
                }
                competitionSportName={
                    sportName
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

export default OfficialsPage;