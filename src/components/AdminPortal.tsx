import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import type { LucideIcon } from 'lucide-react'
import { Gavel } from 'lucide-react'
import OfficialsPage from '../pages/OfficialsPage'
import {
    BarChart3,
    Bot,
    Building2,
    CalendarDays,
    ChevronDown,
    CircleUserRound,
    ExternalLink,
    Flag,
    Handshake,
    Image,
    Layers3,
    LayoutDashboard,
    Mail,
    MapPin,
    Newspaper,
    Shield,
    Sparkles,
    Target,
    Trophy,
    Users,
} from 'lucide-react'

import MetricCard from './ui/MetricCard/MetricCard'
import { AITournamentDirector } from './admin/AITournamentDirector/AITournamentDirector'
import CompetitionManager from './admin/Competitions/CompetitionManager'
import { MediaManager } from './admin/Media/MediaManager'
import { supabase } from '../lib/supabaseClient'
import { ClubsManager } from './admin/Clubs/ClubsManager'
import { TeamsManager } from './admin/Teams/TeamsManager'
import { FixturesManager } from './admin/Fixtures/FixturesManager'
import { VenuesManager } from './admin/Venues/VenuesManager'
import { ResultsManager } from './admin/Results/ResultsManager'
import type { DbTeam } from './admin/Teams/teamTypes'
import { GoalsManager } from './admin/Goals/GoalsManager'
import { GroupsManager } from './admin/Groups/GroupsManager'
import { SponsorsManager } from './admin/Sponsors/SponsorsManager'
import { ArticlesManager } from './admin/Articles/ArticlesManager'
import { EnquiriesManager } from './admin/Enquiries/EnquiriesManager'
import { TournamentGenerator } from './admin/TournamentGenerator/TournamentGenerator'
import { UserManagement } from './admin/Users/UserManagement'
import OrganisationManager from './admin/Organisations/OrganisationManager'
import { AdminHeader } from './admin/AdminHeader'
import { CompetitionTeamsManager } from './admin/CompetitionTeams/CompetitionTeamsManager'
import { TournamentHQBrand } from './common/TournamentHQBrand'

import {
    canAccessModule,
    formatAdminRole,
    type AdminModule,
    type AdminProfile,
} from '../services/accessControl'

import { useOrganisation } from '../context/OrganisationContext'
import { useCompetition } from '../contexts/CompetitionContext'

type NavigationSectionId =
    | 'overview'
    | 'competition'
    | 'tools'
    | 'operations'
    | 'content'
    | 'administration'

type NavigationItem = {
    module: AdminModule
    icon: LucideIcon
    featured?: boolean
}

type NavigationSection = {
    id: NavigationSectionId
    title: string
    icon: LucideIcon
    items: readonly NavigationItem[]
}

const PUBLIC_SITE_URL =
    (
        import.meta.env
            .VITE_PUBLIC_SITE_URL as
            | string
            | undefined
    )?.replace(/\/$/, '') ||
    window.location.origin

const navigationSections: readonly NavigationSection[] = [
    {
        id: 'overview',
        title: 'Overview',
        icon: LayoutDashboard,
        items: [
            {
                module: 'Dashboard',
                icon: LayoutDashboard,
            },
        ],
    },
    {
        id: 'competition',
        title: 'Competition Setup',
        icon: Trophy,
        items: [
            {
                module: 'Organisations',
                icon: Building2,
            },
            {
                module: 'Competitions',
                icon: Trophy,
            },
            {
                module: 'Clubs',
                icon: Shield,
            },
            {
                module: 'Teams',
                icon: Users,
            },
            {
                module: 'Competition Teams',
                icon: Flag,
            },
            {
                module: 'Groups',
                icon: Layers3,
            },
            {
                module: 'Venues',
                icon: MapPin,
            },
            {
                module: 'Sports Officials',
                icon: Gavel,
            },
        ],
    },
    {
        id: 'tools',
        title: 'Tournament Tools',
        icon: Sparkles,
        items: [
            {
                module: 'AI Tournament Director',
                icon: Bot,
                featured: true,
            },
            {
                module: 'Auto Fixture Generator',
                icon: CalendarDays,
            },
        ],
    },
    {
        id: 'operations',
        title: 'Match Operations',
        icon: CalendarDays,
        items: [
            {
                module: 'Fixtures',
                icon: CalendarDays,
            },
            {
                module: 'Results',
                icon: BarChart3,
            },
            {
                module: 'Goals',
                icon: Target,
            },
        ],
    },
    {
        id: 'content',
        title: 'Content & Commercial',
        icon: Newspaper,
        items: [
            {
                module: 'Sponsors',
                icon: Handshake,
            },
            {
                module: 'Articles',
                icon: Newspaper,
            },
            {
                module: 'Media',
                icon: Image,
            },
            {
                module: 'Enquiries',
                icon: Mail,
            },
        ],
    },
    {
        id: 'administration',
        title: 'Administration',
        icon: CircleUserRound,
        items: [
            {
                module: 'User Access',
                icon: CircleUserRound,
            },
        ],
    },
]

const adminTabs: readonly AdminModule[] =
    navigationSections.flatMap((section) =>
        section.items.map((item) => item.module)
    )

const defaultExpandedSections: Record<
    NavigationSectionId,
    boolean
> = {
    overview: true,
    competition: true,
    tools: true,
    operations: true,
    content: false,
    administration: false,
}

type AdminPortalProps = {
    profile: AdminProfile
    onLogout: () => void
}

type OrganisationDashboardStats = {
    clubs: number
    teams: number
    venues: number
    sponsors: number
    articles: number
    media: number
}

type CompetitionDashboardStats = {
    competitionTeams: number
    groups: number
    fixtures: number
    results: number
    goals: number
}

const emptyOrganisationStats: OrganisationDashboardStats = {
    clubs: 0,
    teams: 0,
    venues: 0,
    sponsors: 0,
    articles: 0,
    media: 0,
}

const emptyCompetitionStats: CompetitionDashboardStats = {
    competitionTeams: 0,
    groups: 0,
    fixtures: 0,
    results: 0,
    goals: 0,
}

export function AdminPortal({
                                profile,
                                onLogout,
                            }: AdminPortalProps) {
    const {
        currentOrganisation,
        currentMembership,
        currentRole,
    } = useOrganisation()

    const {
        currentCompetition,
        currentCompetitionId,
    } = useCompetition()

    const [activeTab, setActiveTab] =
        useState<AdminModule>('Dashboard')

    const [
        expandedSections,
        setExpandedSections,
    ] = useState(defaultExpandedSections)

    const [dbTeams, setDbTeams] =
        useState<DbTeam[]>([])

    const [
        organisationStats,
        setOrganisationStats,
    ] = useState<OrganisationDashboardStats>(
        emptyOrganisationStats
    )

    const [
        competitionStats,
        setCompetitionStats,
    ] = useState<CompetitionDashboardStats>(
        emptyCompetitionStats
    )

    const [enquiryCount, setEnquiryCount] =
        useState(0)

    const [
        organisationStatsLoading,
        setOrganisationStatsLoading,
    ] = useState(false)

    const [
        competitionStatsLoading,
        setCompetitionStatsLoading,
    ] = useState(false)

    const effectiveProfile =
        useMemo<AdminProfile>(
            () => ({
                ...profile,
                role:
                    currentRole ??
                    profile.role,
                currentOrganisation:
                    currentOrganisation ??
                    profile.currentOrganisation,
                currentMembership:
                    currentMembership ??
                    profile.currentMembership,
            }),
            [
                currentOrganisation,
                currentMembership,
                currentRole,
                profile,
            ]
        )

    const activeRole =
        effectiveProfile.role

    const visibleTabs = useMemo(
        () =>
            adminTabs.filter((tab) =>
                canAccessModule(
                    activeRole,
                    tab
                )
            ),
        [activeRole]
    )

    const visibleNavigationSections =
        useMemo(
            () =>
                navigationSections
                    .map((section) => ({
                        ...section,
                        items: section.items.filter(
                            (item) =>
                                visibleTabs.includes(
                                    item.module
                                )
                        ),
                    }))
                    .filter(
                        (section) =>
                            section.items.length > 0
                    ),
            [visibleTabs]
        )

    useEffect(() => {
        if (
            !visibleTabs.includes(
                activeTab
            )
        ) {
            setActiveTab('Dashboard')
        }
    }, [
        activeTab,
        visibleTabs,
    ])

    useEffect(() => {
        const activeSection =
            navigationSections.find(
                (section) =>
                    section.items.some(
                        (item) =>
                            item.module ===
                            activeTab
                    )
            )

        if (!activeSection) {
            return
        }

        setExpandedSections(
            (current) => ({
                ...current,
                [activeSection.id]: true,
            })
        )
    }, [activeTab])

    useEffect(() => {
        setActiveTab('Dashboard')
        setDbTeams([])
        setOrganisationStats(
            emptyOrganisationStats
        )
        setCompetitionStats(
            emptyCompetitionStats
        )
        setEnquiryCount(0)
    }, [currentOrganisation?.id])

    useEffect(() => {
        setCompetitionStats(
            emptyCompetitionStats
        )
    }, [currentCompetitionId])

    const loadTeams =
        useCallback(async () => {
            if (
                !currentOrganisation ||
                !canAccessModule(
                    activeRole,
                    'Teams'
                )
            ) {
                setDbTeams([])
                return
            }

            const { data, error } =
                await supabase
                    .from('teams')
                    .select('*')
                    .eq(
                        'organisation_id',
                        currentOrganisation.id
                    )
                    .order('created_at', {
                        ascending: false,
                    })

            if (error) {
                console.error(
                    'Failed to load teams:',
                    error
                )
                setDbTeams([])
                return
            }

            setDbTeams(
                (data ?? []) as DbTeam[]
            )
        }, [
            activeRole,
            currentOrganisation,
        ])

    const loadOrganisationStats =
        useCallback(async () => {
            if (!currentOrganisation?.id) {
                setOrganisationStats(
                    emptyOrganisationStats
                )
                return
            }

            setOrganisationStatsLoading(true)

            const organisationId =
                currentOrganisation.id

            try {
                const [
                    clubsResponse,
                    teamsResponse,
                    venuesResponse,
                    sponsorsResponse,
                    articlesResponse,
                    mediaResponse,
                ] = await Promise.all([
                    supabase
                        .from('clubs')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'organisation_id',
                            organisationId
                        ),
                    supabase
                        .from('teams')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'organisation_id',
                            organisationId
                        ),
                    supabase
                        .from('venues')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'organisation_id',
                            organisationId
                        ),
                    supabase
                        .from('sponsors')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'organisation_id',
                            organisationId
                        ),
                    supabase
                        .from('articles')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'organisation_id',
                            organisationId
                        ),
                    supabase
                        .from('media_items')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'organisation_id',
                            organisationId
                        ),
                ])

                const responses = [
                    {
                        name: 'clubs',
                        response: clubsResponse,
                    },
                    {
                        name: 'teams',
                        response: teamsResponse,
                    },
                    {
                        name: 'venues',
                        response: venuesResponse,
                    },
                    {
                        name: 'sponsors',
                        response: sponsorsResponse,
                    },
                    {
                        name: 'articles',
                        response: articlesResponse,
                    },
                    {
                        name: 'media',
                        response: mediaResponse,
                    },
                ]

                responses.forEach(
                    ({
                         name,
                         response,
                     }) => {
                        if (response.error) {
                            console.error(
                                `Failed to load ${name} count:`,
                                response.error
                            )
                        }
                    }
                )

                setOrganisationStats({
                    clubs:
                        clubsResponse.error
                            ? 0
                            : clubsResponse.count ??
                            0,
                    teams:
                        teamsResponse.error
                            ? 0
                            : teamsResponse.count ??
                            0,
                    venues:
                        venuesResponse.error
                            ? 0
                            : venuesResponse.count ??
                            0,
                    sponsors:
                        sponsorsResponse.error
                            ? 0
                            : sponsorsResponse.count ??
                            0,
                    articles:
                        articlesResponse.error
                            ? 0
                            : articlesResponse.count ??
                            0,
                    media:
                        mediaResponse.error
                            ? 0
                            : mediaResponse.count ??
                            0,
                })
            } finally {
                setOrganisationStatsLoading(false)
            }
        }, [currentOrganisation?.id])

    const loadCompetitionStats =
        useCallback(async () => {
            if (!currentCompetitionId) {
                setCompetitionStats(
                    emptyCompetitionStats
                )
                return
            }

            setCompetitionStatsLoading(true)

            try {
                const [
                    competitionTeamsResponse,
                    groupsResponse,
                    fixturesResponse,
                ] = await Promise.all([
                    supabase
                        .from('competition_teams')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'competition_id',
                            currentCompetitionId
                        ),
                    supabase
                        .from('groups')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'competition_id',
                            currentCompetitionId
                        ),
                    supabase
                        .from('fixtures')
                        .select('id', {
                            count: 'exact',
                        })
                        .eq(
                            'competition_id',
                            currentCompetitionId
                        ),
                ])

                if (
                    competitionTeamsResponse.error
                ) {
                    console.error(
                        'Failed to load competition teams count:',
                        competitionTeamsResponse.error
                    )
                }

                if (groupsResponse.error) {
                    console.error(
                        'Failed to load groups count:',
                        groupsResponse.error
                    )
                }

                if (fixturesResponse.error) {
                    console.error(
                        'Failed to load fixtures count:',
                        fixturesResponse.error
                    )
                }

                const fixtureIds =
                    fixturesResponse.error
                        ? []
                        : (
                            fixturesResponse.data ??
                            []
                        ).map(
                            (fixture) =>
                                fixture.id
                        )

                let resultsCount = 0
                let goalsCount = 0

                if (fixtureIds.length > 0) {
                    const [
                        resultsResponse,
                        goalsResponse,
                    ] = await Promise.all([
                        supabase
                            .from('results')
                            .select('id', {
                                count: 'exact',
                                head: true,
                            })
                            .in(
                                'fixture_id',
                                fixtureIds
                            ),
                        supabase
                            .from('goals')
                            .select('id', {
                                count: 'exact',
                                head: true,
                            })
                            .in(
                                'fixture_id',
                                fixtureIds
                            ),
                    ])

                    if (
                        resultsResponse.error
                    ) {
                        console.error(
                            'Failed to load results count:',
                            resultsResponse.error
                        )
                    } else {
                        resultsCount =
                            resultsResponse.count ??
                            0
                    }

                    if (goalsResponse.error) {
                        console.error(
                            'Failed to load goals count:',
                            goalsResponse.error
                        )
                    } else {
                        goalsCount =
                            goalsResponse.count ??
                            0
                    }
                }

                setCompetitionStats({
                    competitionTeams:
                        competitionTeamsResponse.error
                            ? 0
                            : competitionTeamsResponse.count ??
                            0,
                    groups:
                        groupsResponse.error
                            ? 0
                            : groupsResponse.count ??
                            0,
                    fixtures:
                        fixturesResponse.error
                            ? 0
                            : fixturesResponse.count ??
                            0,
                    results: resultsCount,
                    goals: goalsCount,
                })
            } finally {
                setCompetitionStatsLoading(false)
            }
        }, [currentCompetitionId])

    const loadEnquiryCount =
        useCallback(async () => {
            if (
                !currentOrganisation?.id ||
                !canAccessModule(
                    activeRole,
                    'Enquiries'
                )
            ) {
                setEnquiryCount(0)
                return
            }

            const {
                count,
                error,
            } = await supabase
                .from('sponsor_enquiries')
                .select('id', {
                    count: 'exact',
                    head: true,
                })
                .eq(
                    'organisation_id',
                    currentOrganisation.id
                )
                .eq('status', 'new')

            if (error) {
                console.error(
                    'Failed to load enquiry count:',
                    error
                )
                setEnquiryCount(0)
                return
            }

            setEnquiryCount(count ?? 0)
        }, [
            activeRole,
            currentOrganisation?.id,
        ])

    useEffect(() => {
        if (!currentOrganisation?.id) {
            return
        }

        void Promise.all([
            loadTeams(),
            loadOrganisationStats(),
            loadEnquiryCount(),
        ])
    }, [
        currentOrganisation?.id,
        loadTeams,
        loadOrganisationStats,
        loadEnquiryCount,
    ])

    useEffect(() => {
        void loadCompetitionStats()
    }, [loadCompetitionStats])

    const organisationStatItems =
        useMemo(() => {
            const items: Array<{
                label: string
                value: number
                module: AdminModule
            }> = []

            if (
                canAccessModule(
                    activeRole,
                    'Clubs'
                )
            ) {
                items.push({
                    label: 'Clubs',
                    value:
                    organisationStats.clubs,
                    module: 'Clubs',
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Teams'
                )
            ) {
                items.push({
                    label: 'Teams',
                    value:
                    organisationStats.teams,
                    module: 'Teams',
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Venues'
                )
            ) {
                items.push({
                    label: 'Venues',
                    value:
                    organisationStats.venues,
                    module: 'Venues',
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Sponsors'
                )
            ) {
                items.push({
                    label: 'Sponsors',
                    value:
                    organisationStats.sponsors,
                    module: 'Sponsors',
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Articles'
                )
            ) {
                items.push({
                    label: 'Articles',
                    value:
                    organisationStats.articles,
                    module: 'Articles',
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Media'
                )
            ) {
                items.push({
                    label: 'Media',
                    value:
                    organisationStats.media,
                    module: 'Media',
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Enquiries'
                )
            ) {
                items.push({
                    label: 'New Enquiries',
                    value: enquiryCount,
                    module: 'Enquiries',
                })
            }

            return items
        }, [
            activeRole,
            organisationStats,
            enquiryCount,
        ])

    const competitionStatItems =
        useMemo(() => {
            const items: Array<{
                label: string
                value: number
                module: AdminModule
            }> = []

            if (
                canAccessModule(
                    activeRole,
                    'Competition Teams'
                )
            ) {
                items.push({
                    label:
                        'Competition Teams',
                    value:
                    competitionStats.competitionTeams,
                    module: 'Competition Teams',
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Groups'
                )
            ) {
                items.push({
                    label: 'Groups',
                    value:
                    competitionStats.groups,
                    module: 'Groups',
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Fixtures'
                )
            ) {
                items.push({
                    label: 'Fixtures',
                    value:
                    competitionStats.fixtures,
                    module: 'Fixtures',
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Results'
                )
            ) {
                items.push({
                    label: 'Results',
                    value:
                    competitionStats.results,
                    module: 'Results',
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Goals'
                )
            ) {
                items.push({
                    label: 'Goals',
                    value:
                    competitionStats.goals,
                    module: 'Goals',
                })
            }

            return items
        }, [
            activeRole,
            competitionStats,
        ])

    function getStatisticIcon(
        label: string
    ): LucideIcon {
        const normalisedLabel =
            label.toLowerCase()

        if (
            normalisedLabel.includes(
                'club'
            )
        ) {
            return Shield
        }

        if (
            normalisedLabel.includes(
                'team'
            ) ||
            normalisedLabel.includes(
                'participant'
            )
        ) {
            return Users
        }

        if (
            normalisedLabel.includes(
                'venue'
            )
        ) {
            return MapPin
        }

        if (
            normalisedLabel.includes(
                'sponsor'
            )
        ) {
            return Handshake
        }

        if (
            normalisedLabel.includes(
                'article'
            )
        ) {
            return Newspaper
        }

        if (
            normalisedLabel.includes(
                'media'
            )
        ) {
            return Image
        }

        if (
            normalisedLabel.includes(
                'enquir'
            )
        ) {
            return Mail
        }

        if (
            normalisedLabel.includes(
                'group'
            )
        ) {
            return Layers3
        }

        if (
            normalisedLabel.includes(
                'fixture'
            )
        ) {
            return CalendarDays
        }

        if (
            normalisedLabel.includes(
                'result'
            ) ||
            normalisedLabel.includes(
                'competition'
            )
        ) {
            return Trophy
        }

        if (
            normalisedLabel.includes(
                'goal'
            )
        ) {
            return Target
        }

        return Trophy
    }

    function renderStatGrid(
        items: Array<{
            label: string
            value: number
            module: AdminModule
        }>
    ) {
        if (!items.length) {
            return (
                <div className="rounded-2xl border border-dashed border-lime-900/60 bg-black/20 px-6 py-10 text-center">
                    <Trophy className="mx-auto h-9 w-9 text-lime-400/70" />

                    <h4 className="mt-4 text-base font-semibold text-white">
                        No statistics available
                    </h4>

                    <p className="mt-2 text-sm text-slate-400">
                        No statistics are available for your current access
                        level.
                    </p>
                </div>
            )
        }

        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {items.map((stat) => (
                    <button
                        key={stat.label}
                        type="button"
                        onClick={() =>
                            setActiveTab(
                                stat.module
                            )
                        }
                        aria-label={`Open ${stat.module}`}
                        className="group rounded-2xl text-left outline-none transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-lime-950/20 focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071006]"
                    >
                        <MetricCard
                            title={stat.label}
                            value={stat.value}
                            icon={getStatisticIcon(
                                stat.label
                            )}
                        />

                        <span className="sr-only">
                            Open {stat.module}
                        </span>
                    </button>
                ))}
            </div>
        )
    }

    function toggleSection(
        sectionId: NavigationSectionId
    ) {
        setExpandedSections(
            (current) => ({
                ...current,
                [sectionId]:
                    !current[sectionId],
            })
        )
    }

    function renderActiveModule() {
        if (
            !canAccessModule(
                activeRole,
                activeTab
            )
        ) {
            return (
                <div className="teamsEmptyState">
                    <h3>Access denied</h3>

                    <p>
                        Your account does not have
                        permission to access this
                        module for the selected
                        organisation.
                    </p>
                </div>
            )
        }

        switch (activeTab) {
            case 'Dashboard':
                return (
                    <div>
                        <div className="adminWorkspaceHeader">
                            <div>
                                <h3>
                                    Dashboard Overview
                                </h3>

                                <p className="muted">
                                    Overview for{' '}
                                    <strong>
                                        {
                                            currentOrganisation.name
                                        }
                                    </strong>
                                    .
                                </p>
                            </div>
                        </div>

                        <section>
                            <h4>
                                Organisation Statistics
                            </h4>

                            {organisationStatsLoading && (
                                <p className="muted">
                                    Loading organisation statistics...
                                </p>
                            )}

                            {renderStatGrid(
                                organisationStatItems
                            )}
                        </section>

                        <section className="adminChecklist">
                            <h4>
                                Competition Statistics
                            </h4>

                            {currentCompetition ? (
                                <>
                                    <p>
                                        Selected competition:{' '}
                                        <strong>
                                            {
                                                currentCompetition.name
                                            }
                                        </strong>
                                    </p>

                                    {competitionStatsLoading && (
                                        <p className="muted">
                                            Loading competition statistics...
                                        </p>
                                    )}

                                    {renderStatGrid(
                                        competitionStatItems
                                    )}
                                </>
                            ) : (
                                <div className="teamsEmptyState">
                                    <h3>
                                        No competition selected
                                    </h3>

                                    <p>
                                        Select or create a
                                        competition to view
                                        competition-specific
                                        statistics.
                                    </p>
                                </div>
                            )}
                        </section>

                        <div className="adminChecklist">
                            <h4>Your Access</h4>

                            <p>
                                Signed in as{' '}
                                <strong>
                                    {formatAdminRole(
                                        activeRole
                                    )}
                                </strong>{' '}
                                for{' '}
                                <strong>
                                    {
                                        currentOrganisation.name
                                    }
                                </strong>
                                .
                            </p>

                            <ul>
                                {visibleTabs
                                    .filter(
                                        (tab) =>
                                            tab !==
                                            'Dashboard'
                                    )
                                    .map(
                                        (tab) => (
                                            <li
                                                key={
                                                    tab
                                                }
                                            >
                                                {tab}
                                            </li>
                                        )
                                    )}
                            </ul>
                        </div>
                    </div>
                )

            case 'Organisations':
                return (
                    <OrganisationManager />
                )

            case 'Competitions':
                return (
                    <CompetitionManager />
                )

            case 'Clubs':
                return <ClubsManager />

            case 'Teams':
                return (
                    <TeamsManager
                        teams={dbTeams}
                        onTeamCreated={
                            async () => {
                                await loadTeams()
                                await loadOrganisationStats()
                            }
                        }
                    />
                )

            case 'Competition Teams':
                return (
                    <CompetitionTeamsManager />
                )

            case 'Groups':
                return <GroupsManager />

            case 'AI Tournament Director':
                return (
                    <AITournamentDirector />
                )

            case 'Auto Fixture Generator':
                return (
                    <TournamentGenerator />
                )

            case 'Venues':
                return <VenuesManager />
            case 'Sports Officials':
                return <OfficialsPage />

            case 'Fixtures':
                return <FixturesManager />

            case 'Results':
                return <ResultsManager />

            case 'Goals':
                return <GoalsManager />

            case 'Sponsors':
                return <SponsorsManager />

            case 'Articles':
                return (
                    <ArticlesManager
                        onArticlesChanged={
                            loadOrganisationStats
                        }
                    />
                )

            case 'Media':
                return <MediaManager />

            case 'Enquiries':
                return (
                    <EnquiriesManager />
                )

            case 'User Access':
                return (
                    <UserManagement
                        key={
                            currentOrganisation.id
                        }
                        currentProfile={
                            effectiveProfile
                        }
                    />
                )
        }
    }

    if (!currentOrganisation) {
        return (
            <section className="min-h-screen bg-[#071006] px-4 py-10 font-sans text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-[1600px]">
                    <div className="rounded-3xl border border-lime-900/50 bg-[#10190f] px-6 py-12 text-center">
                        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-lime-900 border-t-lime-400" />

                        <p className="mt-4 text-sm font-semibold text-slate-300">
                            Loading organisation...
                        </p>
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section
            id="admin"
            className="min-h-screen bg-[#071006] px-4 py-8 font-sans text-white sm:px-6 lg:px-8"
        >
            <div className="mx-auto w-full max-w-[1600px]">
                <AdminHeader
                    profile={
                        effectiveProfile
                    }
                    onLogout={onLogout}
                />

                <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-lime-900/50 bg-[#0b140a] px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-400">
                            Public Website
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <strong className="truncate text-sm text-white sm:text-base">
                                {currentOrganisation.name}
                            </strong>

                            {currentCompetition && (
                                <>
                                    <span
                                        className="hidden text-slate-600 sm:inline"
                                        aria-hidden="true"
                                    >
                                        •
                                    </span>

                                    <span className="truncate text-sm text-slate-400">
                                        {currentCompetition.name}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <a
                        href={PUBLIC_SITE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3 text-sm font-black text-black transition hover:bg-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:ring-offset-2 focus:ring-offset-[#071006]"
                        aria-label="Open the public website in a new tab"
                    >
                        <ExternalLink className="h-4 w-4" />
                        View Public Site
                    </a>
                </div>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
                    Your portal access is limited
                    to the modules required for
                    your assigned operational role.
                </p>

                <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
                    <aside className="w-full overflow-hidden rounded-3xl border border-lime-900/50 bg-[#0b140a] shadow-2xl shadow-black/20">
                        <div className="border-b border-lime-900/50 px-5 py-5">
                            <TournamentHQBrand
                                variant="compact"
                                size="sm"
                                className="max-w-[170px]"
                            />

                            <strong className="mt-3 block text-lg leading-6 text-white">
                                Competition Administration
                            </strong>

                            <span className="mt-2 block text-sm text-slate-400">
                                {formatAdminRole(
                                    activeRole
                                )}
                            </span>
                        </div>

                        <nav
                            aria-label="Administration modules"
                            className="space-y-2 px-3 py-4"
                        >
                            {visibleNavigationSections.map(
                                (section) => {
                                    const SectionIcon =
                                        section.icon

                                    const isExpanded =
                                        expandedSections[
                                            section.id
                                            ]

                                    return (
                                        <section
                                            key={
                                                section.id
                                            }
                                            className="overflow-hidden rounded-2xl border border-lime-900/40 bg-black/10"
                                        >
                                            <button
                                                type="button"
                                                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-400 transition hover:bg-lime-400/5 hover:text-lime-300"
                                                aria-expanded={
                                                    isExpanded
                                                }
                                                onClick={() =>
                                                    toggleSection(
                                                        section.id
                                                    )
                                                }
                                            >
                                                <span className="flex min-w-0 items-center gap-2.5">
                                                    <SectionIcon className="h-4 w-4 shrink-0 text-lime-400" />

                                                    <span className="truncate">
                                                        {
                                                            section.title
                                                        }
                                                    </span>
                                                </span>

                                                <ChevronDown
                                                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                                                        isExpanded
                                                            ? 'rotate-180'
                                                            : ''
                                                    }`}
                                                />
                                            </button>

                                            {isExpanded && (
                                                <div className="space-y-1 border-t border-lime-900/30 p-2">
                                                    {section.items.map(
                                                        (
                                                            item
                                                        ) => {
                                                            const ItemIcon =
                                                                item.icon

                                                            const isActive =
                                                                activeTab ===
                                                                item.module

                                                            const isFeatured =
                                                                item.featured

                                                            return (
                                                                <button
                                                                    key={
                                                                        item.module
                                                                    }
                                                                    type="button"
                                                                    className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                                                                        isActive
                                                                            ? 'bg-lime-400 text-black shadow-lg shadow-lime-950/30'
                                                                            : isFeatured
                                                                                ? 'border border-lime-700/60 bg-lime-400/10 text-lime-200 hover:border-lime-500 hover:bg-lime-400/15'
                                                                                : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                                                    }`}
                                                                    onClick={() =>
                                                                        setActiveTab(
                                                                            item.module
                                                                        )
                                                                    }
                                                                >
                                                                    <ItemIcon
                                                                        className={`h-4.5 w-4.5 shrink-0 ${
                                                                            isActive
                                                                                ? 'text-black'
                                                                                : isFeatured
                                                                                    ? 'text-lime-400'
                                                                                    : 'text-slate-500'
                                                                        }`}
                                                                    />

                                                                    <span className="min-w-0 flex-1">
                                                                        {
                                                                            item.module
                                                                        }
                                                                    </span>

                                                                    {item.module ===
                                                                        'Enquiries' &&
                                                                        enquiryCount >
                                                                        0 && (
                                                                            <span
                                                                                className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                                                                    isActive
                                                                                        ? 'bg-black/15 text-black'
                                                                                        : 'bg-lime-400 text-black'
                                                                                }`}
                                                                            >
                                                                                {
                                                                                    enquiryCount
                                                                                }
                                                                            </span>
                                                                        )}
                                                                </button>
                                                            )
                                                        }
                                                    )}
                                                </div>
                                            )}
                                        </section>
                                    )
                                }
                            )}
                        </nav>
                    </aside>

                    <main className="min-w-0">
                        {renderActiveModule()}
                    </main>
                </div>
            </div>
        </section>
    )
}