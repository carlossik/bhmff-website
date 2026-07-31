import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    CreateOfficialInput,
    officialService,
    UpdateOfficialInput,
} from '../services/officialService';
import {
    Official,
    OfficialDashboardStats,
    OfficialFilters,
} from '../types/officialTypes';

interface UseOfficialsOptions {
    organisationId: string;
    autoLoad?: boolean;
}

export const useOfficials = ({
                                 organisationId,
                                 autoLoad = true,
                             }: UseOfficialsOptions) => {
    const [officials, setOfficials] =
        useState<Official[]>([]);

    const [dashboard, setDashboard] =
        useState<OfficialDashboardStats | null>(
            null
        );

    const [loading, setLoading] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [search, setSearch] =
        useState('');

    const [filters, setFilters] =
        useState<OfficialFilters>({});

    const loadOfficials =
        useCallback(async (): Promise<void> => {
            if (!organisationId) {
                setOfficials([]);
                setDashboard(null);
                return;
            }

            try {
                setLoading(true);

                const [
                    officialData,
                    dashboardStats,
                ] = await Promise.all([
                    officialService.getAll(
                        organisationId,
                        filters
                    ),
                    officialService.getDashboardStats(
                        organisationId
                    ),
                ]);

                setOfficials(officialData);
                setDashboard(dashboardStats);
            } finally {
                setLoading(false);
            }
        }, [
            organisationId,
            filters,
        ]);

    useEffect(() => {
        if (!autoLoad) {
            return;
        }

        void loadOfficials();
    }, [
        autoLoad,
        loadOfficials,
    ]);

    const refresh =
        useCallback(async (): Promise<void> => {
            await loadOfficials();
        }, [loadOfficials]);

    const createOfficial = useCallback(
        async (
            input: Partial<Official>
        ): Promise<Official> => {
            if (!organisationId) {
                throw new Error(
                    'An organisation must be selected before creating an official.'
                );
            }

            try {
                setSaving(true);

                const created =
                    await officialService.create({
                        organisation_id: organisationId,

                        first_name: input.first_name ?? '',
                        last_name: input.last_name ?? '',

                        role: input.role ?? 'referee',
                        status: input.status ?? 'active',

                        email: input.email ?? null,
                        phone: input.phone ?? null,

                        sport_id: input.sport_id ?? null,
                        user_id: input.user_id ?? null,

                        ...input,
                    } as CreateOfficialInput);

                setOfficials(previous => [
                    created,
                    ...previous,
                ]);

                const dashboardStats =
                    await officialService.getDashboardStats(
                        organisationId
                    );

                setDashboard(dashboardStats);

                return created;
            } finally {
                setSaving(false);
            }
        },
        [organisationId]
    );

    const updateOfficial = useCallback(
        async (
            id: string,
            updates: UpdateOfficialInput
        ): Promise<Official> => {
            try {
                setSaving(true);

                const updated =
                    await officialService.update(
                        id,
                        updates
                    );

                setOfficials(previous =>
                    previous.map(official =>
                        official.id === id
                            ? updated
                            : official
                    )
                );

                return updated;
            } finally {
                setSaving(false);
            }
        },
        []
    );

    const deleteOfficial = useCallback(
        async (id: string): Promise<void> => {
            try {
                setSaving(true);

                await officialService.delete(id);

                setOfficials(previous =>
                    previous.filter(
                        official =>
                            official.id !== id
                    )
                );

                if (organisationId) {
                    const dashboardStats =
                        await officialService.getDashboardStats(
                            organisationId
                        );

                    setDashboard(
                        dashboardStats
                    );
                }
            } finally {
                setSaving(false);
            }
        },
        [organisationId]
    );

    const filteredOfficials =
        useMemo((): Official[] => {
            const term = search
                .trim()
                .toLowerCase();

            if (!term) {
                return officials;
            }

            return officials.filter(official => {
                const fullName =
                    official.full_name ??
                    `${official.first_name} ${official.last_name}`;

                return (
                    fullName
                        .toLowerCase()
                        .includes(term) ||
                    official.email
                        ?.toLowerCase()
                        .includes(term) ||
                    official.phone
                        ?.toLowerCase()
                        .includes(term) ||
                    official.role
                        .toLowerCase()
                        .includes(term)
                );
            });
        }, [
            officials,
            search,
        ]);

    return {
        officials: filteredOfficials,
        allOfficials: officials,
        dashboard,

        loading,
        saving,

        search,
        setSearch,

        filters,
        setFilters,

        refresh,
        loadOfficials,

        createOfficial,
        updateOfficial,
        deleteOfficial,
    };
};