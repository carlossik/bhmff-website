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
    BadgeCheck,
    BarChart3,
    Bot,
    Building2,
    CalendarDays,
    ChevronDown,
    CircleAlert,
    CircleUserRound,
    CreditCard,
    ExternalLink,
    Flag,
    Handshake,
    Image,
    Layers3,
    LayoutDashboard,
    Mail,
    MapPin,
    Newspaper,
    Palette,
    Shield,
    Sparkles,
    Target,
    Trophy,
    Users,
} from 'lucide-react'

import { AITournamentDirector } from './admin/AITournamentDirector/AITournamentDirector'
import CompetitionManager from './admin/Competitions/CompetitionManager'
import { MediaManager } from './admin/Media/MediaManager'
import { supabase } from '../lib/supabaseClient'
import { ClubsManager } from './admin/Clubs/ClubsManager'
import { TeamsManager } from './admin/Teams/TeamsManager'
import ClubSeasonsManager from './admin/Seasons/ClubSeasonsManager'
import { SquadManager } from './admin/Squad/SquadManager'
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
import { ClubProfileWebsiteManager } from './admin/ClubProfile/ClubProfileWebsiteManager'
import { AdminHeader } from './admin/AdminHeader'
import { CompetitionTeamsManager } from './admin/CompetitionTeams/CompetitionTeamsManager'
import { TournamentHQBrand } from './common/TournamentHQBrand'
import '../styles/adminTournamentHQTheme.css'

import {
    getOrganisationPublicSiteUrl,
} from '../config/organisationContent'

import {
    canAccessModule,
    formatAdminRole,
    type AdminModule,
    type AdminProfile,
    type SubscriptionPlan,
    type SubscriptionStatus,
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
                module: 'Club Profile & Website',
                icon: Palette,
            },
            {
                module: 'Competitions',
                icon: Trophy,
            },
            {
                module: 'Seasons',
                icon: CalendarDays,
            },
            {
                module: 'Squad',
                icon: Users,
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

type BillingPortalResponse = {
    url?: unknown
    error?: unknown
}

type BillingInterval =
    | 'monthly'
    | 'annual'

type BillingSummary = {
    hasBillingCustomer: boolean
    billingInterval: BillingInterval | null
    stripeStatus: string | null
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
}

type BillingSummaryResponse = {
    billing?: unknown
    error?: unknown
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null
    )
}

function parseBillingSummary(
    value: unknown,
): BillingSummary | null {
    if (value === null || value === undefined) {
        return null
    }

    if (!isRecord(value)) {
        throw new Error(
            'TournamentHQ returned an invalid billing summary.',
        )
    }

    const billingInterval =
        value.billingInterval

    if (
        billingInterval !== null &&
        billingInterval !== 'monthly' &&
        billingInterval !== 'annual'
    ) {
        throw new Error(
            'TournamentHQ returned an invalid billing interval.',
        )
    }

    const stripeStatus =
        value.stripeStatus
    const currentPeriodStart =
        value.currentPeriodStart
    const currentPeriodEnd =
        value.currentPeriodEnd

    if (
        typeof value.hasBillingCustomer !== 'boolean' ||
        typeof value.cancelAtPeriodEnd !== 'boolean' ||
        (
            stripeStatus !== null &&
            typeof stripeStatus !== 'string'
        ) ||
        (
            currentPeriodStart !== null &&
            typeof currentPeriodStart !== 'string'
        ) ||
        (
            currentPeriodEnd !== null &&
            typeof currentPeriodEnd !== 'string'
        )
    ) {
        throw new Error(
            'TournamentHQ returned incomplete billing information.',
        )
    }

    return {
        hasBillingCustomer:
            value.hasBillingCustomer,
        billingInterval,
        stripeStatus,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd:
            value.cancelAtPeriodEnd,
    }
}

function formatBillingDate(
    value: string | null,
): string | null {
    if (!value) {
        return null
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return null
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        },
    ).format(date)
}

function formatBillingInterval(
    interval: BillingInterval | null,
): string | null {
    if (interval === 'monthly') {
        return 'Monthly billing'
    }

    if (interval === 'annual') {
        return 'Annual billing'
    }

    return null
}

function formatSubscriptionPlan(
    plan: SubscriptionPlan,
): string {
    return plan
        .split('_')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1),
        )
        .join(' ')
}

function formatSubscriptionStatus(
    status: SubscriptionStatus,
): string {
    if (status === 'past_due') {
        return 'Past Due'
    }

    return status
        .split('_')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1),
        )
        .join(' ')
}

function getSubscriptionStatusClasses(
    status: SubscriptionStatus,
): string {
    if (status === 'active') {
        return 'border-lime-400/40 bg-lime-400/10 text-lime-300'
    }

    if (
        status === 'past_due' ||
        status === 'suspended'
    ) {
        return 'border-amber-400/40 bg-amber-400/10 text-amber-200'
    }

    if (status === 'cancelled') {
        return 'border-rose-400/40 bg-rose-400/10 text-rose-200'
    }

    return 'border-sky-400/40 bg-sky-400/10 text-sky-200'
}

function getSubscriptionSummary(
    plan: SubscriptionPlan,
    status: SubscriptionStatus,
    billing: BillingSummary | null,
): string {
    const periodEnd =
        formatBillingDate(
            billing?.currentPeriodEnd ?? null,
        )

    if (
        plan === 'professional' &&
        status === 'active' &&
        billing?.cancelAtPeriodEnd
    ) {
        return periodEnd
            ? `Cancellation scheduled. Professional access remains available until ${periodEnd}.`
            : 'Cancellation scheduled. Professional access remains available until the end of the current paid billing period.'
    }

    if (status === 'past_due') {
        return 'Your payment requires attention. Open billing to review the payment method and outstanding invoice.'
    }

    if (status === 'suspended') {
        return 'This workspace is currently suspended. Open billing to review the subscription or contact TournamentHQ support.'
    }

    if (status === 'cancelled') {
        return 'This paid subscription has ended. TournamentHQ is updating the workspace entitlement.'
    }

    if (
        plan === 'starter' &&
        billing?.stripeStatus === 'canceled'
    ) {
        return 'Your Professional subscription has ended and this workspace is now on the Starter plan.'
    }

    if (plan === 'professional') {
        if (periodEnd) {
            return `Your Professional workspace is active. The current billing period runs until ${periodEnd}.`
        }

        return 'Your Professional workspace is active with the paid TournamentHQ feature set and account limits.'
    }

    if (plan === 'enterprise') {
        return 'Your Enterprise workspace is active with organisation-specific limits and commercial terms.'
    }

    return 'Your Starter workspace is active. Paid billing is not required for the Starter plan.'
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
        articleCreateRequestKey,
        setArticleCreateRequestKey,
    ] = useState(0)

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

    const [
        billingPortalLoading,
        setBillingPortalLoading,
    ] = useState(false)

    const [
        billingPortalError,
        setBillingPortalError,
    ] = useState('')

    const [
        billingSummary,
        setBillingSummary,
    ] = useState<BillingSummary | null>(null)

    const [
        billingSummaryLoading,
        setBillingSummaryLoading,
    ] = useState(false)

    const [
        billingSummaryError,
        setBillingSummaryError,
    ] = useState('')

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

    const organisationType =
        effectiveProfile.currentOrganisation.organisation_type

    const isClub =
        organisationType === 'club'

    const subscriptionPlan =
        effectiveProfile.currentOrganisation.subscription_plan

    const subscriptionStatus =
        effectiveProfile.currentOrganisation.subscription_status

    const canManageBilling =
        subscriptionPlan === 'professional' ||
        billingSummary?.hasBillingCustomer === true

    const billingPeriodEnd =
        formatBillingDate(
            billingSummary?.currentPeriodEnd ?? null,
        )

    const billingIntervalLabel =
        formatBillingInterval(
            billingSummary?.billingInterval ?? null,
        )

    const publicSiteUrl =
        getOrganisationPublicSiteUrl(
            window.location.origin,
            effectiveProfile.currentOrganisation.slug,
        )

    const visibleTabs = useMemo(
        () =>
            adminTabs.filter((tab) =>
                canAccessModule(
                    activeRole,
                    tab,
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
                )
            ),
        [
            activeRole,
            effectiveProfile.isPlatformAdmin,
            organisationType,
        ]
    )

    const visibleNavigationSections =
        useMemo(
            () =>
                navigationSections
                    .map((section) => ({
                        ...section,
                        title:
                            isClub && section.id === 'competition'
                                ? 'Club Setup'
                                : section.title,
                        icon:
                            isClub && section.id === 'competition'
                                ? Shield
                                : section.icon,
                        items: section.items.filter(
                            (item) => {
                                if (
                                    isClub &&
                                    item.module ===
                                    'Organisations'
                                ) {
                                    return false
                                }

                                if (
                                    !isClub &&
                                    item.module ===
                                    'Club Profile & Website'
                                ) {
                                    return false
                                }

                                if (
                                    isClub &&
                                    item.module === 'Venues'
                                ) {
                                    return false
                                }

                                return visibleTabs.includes(
                                    item.module
                                )
                            }
                        ),
                    }))
                    .filter(
                        (section) =>
                            section.items.length > 0
                    ),
            [
                isClub,
                visibleTabs,
            ]
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
        setArticleCreateRequestKey(0)
        setBillingPortalError('')
        setBillingPortalLoading(false)
        setBillingSummary(null)
        setBillingSummaryError('')
        setBillingSummaryLoading(false)
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
                    'Teams',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
            effectiveProfile.isPlatformAdmin,
            organisationType,
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
            if (
                isClub ||
                !currentCompetitionId
            ) {
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
        }, [
            currentCompetitionId,
            isClub,
        ])

    const loadEnquiryCount =
        useCallback(async () => {
            if (
                !currentOrganisation?.id ||
                !canAccessModule(
                    activeRole,
                    'Enquiries',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
            effectiveProfile.isPlatformAdmin,
            organisationType,
        ])

    const loadBillingSummary =
        useCallback(async () => {
            if (!currentOrganisation?.id) {
                setBillingSummary(null)
                setBillingSummaryError('')
                return
            }

            setBillingSummaryLoading(true)
            setBillingSummaryError('')

            try {
                const {
                    data,
                    error,
                } = await supabase.functions.invoke<BillingSummaryResponse>(
                    'get-billing-summary',
                    {
                        body: {
                            organisationId:
                                currentOrganisation.id,
                        },
                    },
                )

                if (error) {
                    throw error
                }

                if (
                    data &&
                    typeof data.error === 'string' &&
                    data.error.trim()
                ) {
                    throw new Error(
                        data.error.trim(),
                    )
                }

                setBillingSummary(
                    parseBillingSummary(
                        data?.billing,
                    ),
                )
            } catch (error) {
                console.error(
                    'Failed to load billing summary:',
                    error,
                )

                setBillingSummary(null)
                setBillingSummaryError(
                    error instanceof Error
                        ? error.message
                        : 'TournamentHQ could not load the billing summary.',
                )
            } finally {
                setBillingSummaryLoading(false)
            }
        }, [currentOrganisation?.id])

    useEffect(() => {
        if (!currentOrganisation?.id) {
            return
        }

        void Promise.all([
            loadTeams(),
            loadOrganisationStats(),
            loadEnquiryCount(),
            loadBillingSummary(),
        ])
    }, [
        currentOrganisation?.id,
        loadTeams,
        loadOrganisationStats,
        loadEnquiryCount,
        loadBillingSummary,
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
                    'Clubs',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
                    'Teams',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
                !isClub &&
                canAccessModule(
                    activeRole,
                    'Venues',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
                    'Sponsors',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
                    'Articles',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
                    'Media',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
                    'Enquiries',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
            effectiveProfile.isPlatformAdmin,
            enquiryCount,
            isClub,
            organisationStats,
            organisationType,
        ])

    const competitionStatItems =
        useMemo(() => {
            if (isClub) {
                return []
            }

            const items: Array<{
                label: string
                value: number
                module: AdminModule
            }> = []

            if (
                canAccessModule(
                    activeRole,
                    'Competition Teams',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
                    'Groups',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
                    'Fixtures',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
                    'Results',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
                    'Goals',
                    effectiveProfile.isPlatformAdmin,
                    organisationType,
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
            effectiveProfile.isPlatformAdmin,
            isClub,
            organisationType,
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
                <div className="rounded-2xl border border-dashed border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] px-6 py-10 text-center">
                    <Trophy className="mx-auto h-9 w-9 text-[var(--thq-admin-accent)] opacity-70" />

                    <h4 className="mt-4 text-base font-semibold text-[var(--thq-admin-text)]">
                        No statistics available
                    </h4>

                    <p className="mt-2 text-sm text-[var(--thq-admin-muted)]">
                        No statistics are available for your current access
                        level.
                    </p>
                </div>
            )
        }

        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {items.map((stat) => {
                    const StatisticIcon =
                        getStatisticIcon(stat.label)

                    return (
                        <button
                            key={stat.label}
                            type="button"
                            onClick={() =>
                                setActiveTab(
                                    stat.module
                                )
                            }
                            aria-label={`Open ${stat.module}`}
                            className="group rounded-2xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] p-5 text-left text-[var(--thq-admin-text)] shadow-sm outline-none transition duration-200 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-[var(--thq-admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--thq-admin-background)]"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                                    style={{
                                        backgroundColor:
                                            'color-mix(in srgb, var(--thq-admin-accent) 12%, transparent)',
                                        borderColor:
                                            'color-mix(in srgb, var(--thq-admin-accent) 28%, transparent)',
                                    }}
                                >
                                    <StatisticIcon className="h-6 w-6 text-[var(--thq-admin-accent)]" />
                                </div>

                                <strong className="text-3xl font-black leading-none text-[var(--thq-admin-text)]">
                                    {stat.value}
                                </strong>
                            </div>

                            <span className="mt-6 block text-base font-black text-[var(--thq-admin-text)]">
                                {stat.label}
                            </span>

                            <span className="sr-only">
                                Open {stat.module}
                            </span>
                        </button>
                    )
                })}
            </div>
        )
    }

    async function openBillingPortal() {
        if (
            billingPortalLoading ||
            !canManageBilling
        ) {
            return
        }

        setBillingPortalLoading(true)
        setBillingPortalError('')

        try {
            const {
                data,
                error,
            } = await supabase.functions.invoke<BillingPortalResponse>(
                'create-billing-portal-session',
                {
                    body: {
                        organisationId:
                            currentOrganisation.id,
                    },
                },
            )

            if (error) {
                throw error
            }

            if (
                !data ||
                typeof data.url !== 'string' ||
                !data.url.trim()
            ) {
                const message =
                    data &&
                    typeof data.error === 'string'
                        ? data.error
                        : 'TournamentHQ could not open the billing portal.'

                throw new Error(message)
            }

            window.location.assign(
                data.url.trim(),
            )
        } catch (error) {
            console.error(
                'Failed to open billing portal:',
                error,
            )

            setBillingPortalError(
                error instanceof Error
                    ? error.message
                    : 'TournamentHQ could not open the billing portal.',
            )
        } finally {
            setBillingPortalLoading(false)
        }
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
                activeTab,
                effectiveProfile.isPlatformAdmin,
                organisationType,
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

                            {canAccessModule(
                                activeRole,
                                'Articles',
                                effectiveProfile.isPlatformAdmin,
                                organisationType,
                            ) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setArticleCreateRequestKey(
                                            (current) =>
                                                current + 1
                                        )
                                        setActiveTab('Articles')
                                    }}
                                    className="inline-flex items-center justify-center rounded-xl bg-[var(--thq-admin-accent)] px-5 py-3 text-sm font-black text-[var(--thq-admin-on-accent)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--thq-admin-accent)] focus:ring-offset-2 focus:ring-offset-[var(--thq-admin-background)]"
                                >
                                    + Add Article
                                </button>
                            )}
                        </div>

                        <section className="mb-6 rounded-2xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] p-5 shadow-sm">
                            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--thq-admin-border)] bg-black/20 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[var(--thq-admin-text)]">
                                            <BadgeCheck className="h-4 w-4 text-[var(--thq-admin-accent)]" />
                                            {formatSubscriptionPlan(
                                                subscriptionPlan,
                                            )}
                                        </span>

                                        <span
                                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${getSubscriptionStatusClasses(
                                                subscriptionStatus,
                                            )}`}
                                        >
                                            {subscriptionStatus ===
                                            'active' ? (
                                                <BadgeCheck className="h-4 w-4" />
                                            ) : (
                                                <CircleAlert className="h-4 w-4" />
                                            )}
                                            {formatSubscriptionStatus(
                                                subscriptionStatus,
                                            )}
                                        </span>

                                        {billingSummary?.cancelAtPeriodEnd && (
                                            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-amber-200">
                                                <CircleAlert className="h-4 w-4" />
                                                Cancellation scheduled
                                            </span>
                                        )}
                                    </div>

                                    <h4 className="mt-4 text-lg font-black text-[var(--thq-admin-text)]">
                                        Subscription & Billing
                                    </h4>

                                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--thq-admin-muted)]">
                                        {getSubscriptionSummary(
                                            subscriptionPlan,
                                            subscriptionStatus,
                                            billingSummary,
                                        )}
                                    </p>

                                    {subscriptionStatus === 'past_due' && (
                                        <div
                                            role="alert"
                                            className="mt-4 flex items-start gap-3 rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
                                        >
                                            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                                            <div>
                                                <strong className="block font-black text-amber-100">
                                                    Payment needs attention
                                                </strong>
                                                <p className="mt-1 leading-6 text-amber-100/80">
                                                    Your Professional access remains available while payment recovery is in progress. Open Manage Billing to update the payment method, complete any required authentication or pay the outstanding invoice.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {subscriptionStatus === 'suspended' && (
                                        <div
                                            role="alert"
                                            className="mt-4 flex items-start gap-3 rounded-xl border border-rose-400/35 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
                                        >
                                            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
                                            <div>
                                                <strong className="block font-black text-rose-100">
                                                    Subscription requires action
                                                </strong>
                                                <p className="mt-1 leading-6 text-rose-100/80">
                                                    Payment recovery has not completed. Your TournamentHQ data remains intact. Open Manage Billing to update payment details and resolve any outstanding invoice.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {(billingSummaryLoading ||
                                        billingIntervalLabel ||
                                        billingPeriodEnd) && (
                                        <p className="mt-3 text-xs font-semibold text-[var(--thq-admin-muted)]">
                                            {billingSummaryLoading
                                                ? 'Loading billing cycle…'
                                                : [
                                                      billingIntervalLabel,
                                                      billingSummary?.cancelAtPeriodEnd
                                                          ? billingPeriodEnd
                                                              ? `Access until ${billingPeriodEnd}`
                                                              : 'Ends after current billing period'
                                                          : billingPeriodEnd
                                                            ? `Renews ${billingPeriodEnd}`
                                                            : null,
                                                  ]
                                                      .filter(
                                                          (
                                                              value,
                                                          ): value is string =>
                                                              Boolean(
                                                                  value,
                                                              ),
                                                      )
                                                      .join(
                                                          ' · ',
                                                      )}
                                        </p>
                                    )}

                                    <p className="mt-2 text-xs font-semibold text-[var(--thq-admin-muted)]">
                                        Account limits: {effectiveProfile.currentOrganisation.max_users}{' '}
                                        administrator accounts
                                        {!isClub && (
                                            <>
                                                {' '}·{' '}
                                                {effectiveProfile.currentOrganisation.max_competitions}{' '}
                                                competitions
                                            </>
                                        )}
                                    </p>
                                </div>

                                {canManageBilling && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void openBillingPortal()
                                        }}
                                        disabled={billingPortalLoading}
                                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[color:var(--thq-admin-border)] bg-black/20 px-5 py-3 text-sm font-black text-[var(--thq-admin-text)] transition hover:border-[var(--thq-admin-accent)] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--thq-admin-accent)] focus:ring-offset-2 focus:ring-offset-[var(--thq-admin-background)]"
                                    >
                                        <CreditCard className="h-4 w-4 text-[var(--thq-admin-accent)]" />
                                        {billingPortalLoading
                                            ? 'Opening Billing…'
                                            : 'Manage Billing'}
                                    </button>
                                )}
                            </div>

                            {billingPortalError && (
                                <div
                                    role="alert"
                                    className="mt-4 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
                                >
                                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{billingPortalError}</span>
                                </div>
                            )}

                            {billingSummaryError && (
                                <div
                                    role="alert"
                                    className="mt-4 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
                                >
                                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>
                                        Billing details are temporarily unavailable. Your workspace access is unaffected.
                                    </span>
                                </div>
                            )}
                        </section>

                        <section>
                            <h4>
                                {isClub
                                    ? 'Club Statistics'
                                    : 'Organisation Statistics'}
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

                        {!isClub && (
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
                        )}

                        <div className="adminChecklist">
                            <h4>Your Access</h4>

                            <p>
                                Signed in as{' '}
                                <strong>
                                    {formatAdminRole(
                                        activeRole,
                                        effectiveProfile.isPlatformAdmin,
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

            case 'Club Profile & Website':
                return (
                    <ClubProfileWebsiteManager />
                )

            case 'Competitions':
                return (
                    <CompetitionManager />
                )

            case 'Seasons':
                return <ClubSeasonsManager />

            case 'Squad':
                return <SquadManager />

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
                return isClub
                    ? null
                    : <VenuesManager />
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
                        createRequestKey={
                            articleCreateRequestKey
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
            <section className="min-h-screen bg-slate-950 px-4 py-10 font-sans text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-[1600px]">
                    <div className="rounded-3xl border border-slate-800 bg-slate-900 px-6 py-12 text-center">
                        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-700 border-t-slate-300" />

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
            className="min-h-screen bg-[var(--thq-admin-background)] px-4 py-8 font-sans text-[var(--thq-admin-text)] sm:px-6 lg:px-8"
        >
            <div className="mx-auto w-full max-w-[1600px]">
                <AdminHeader
                    profile={
                        effectiveProfile
                    }
                    onLogout={onLogout}
                />

                <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--thq-admin-accent)]">
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
                        href={publicSiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--thq-admin-accent)] px-5 py-3 text-sm font-black text-[var(--thq-admin-on-accent)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--thq-admin-accent)] focus:ring-offset-2 focus:ring-offset-[var(--thq-admin-background)]"
                        aria-label="Open the public website in a new tab"
                    >
                        <ExternalLink className="h-4 w-4" />
                        View Public Site
                    </a>
                </div>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--thq-admin-muted)] sm:text-base">
                    Your portal access is limited
                    to the modules required for
                    your assigned operational role.
                </p>

                <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
                    <aside className="w-full overflow-hidden rounded-3xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] shadow-2xl shadow-black/20">
                        <div className="border-b border-[color:var(--thq-admin-border)] px-5 py-5">
                            <TournamentHQBrand
                                variant="compact"
                                size="sm"
                                className="max-w-[170px]"
                            />

                            <strong className="mt-3 block text-lg leading-6 text-white">
                                {isClub
                                    ? 'Club Administration'
                                    : 'Competition Administration'}
                            </strong>

                            <span className="mt-2 block text-sm text-slate-400">
                                {formatAdminRole(
                                    activeRole,
                                    effectiveProfile.isPlatformAdmin,
                                )}
                            </span>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="inline-flex items-center rounded-full border border-[color:var(--thq-admin-border)] bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--thq-admin-text)]">
                                    {formatSubscriptionPlan(
                                        subscriptionPlan,
                                    )}
                                </span>

                                <span
                                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getSubscriptionStatusClasses(
                                        subscriptionStatus,
                                    )}`}
                                >
                                    {formatSubscriptionStatus(
                                        subscriptionStatus,
                                    )}
                                </span>
                            </div>
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
                                                                            ? 'bg-[var(--thq-admin-accent)] text-[var(--thq-admin-on-accent)] shadow-lg shadow-black/20'
                                                                            : isFeatured
                                                                                ? 'border border-[color:var(--thq-admin-border)] bg-[color:var(--thq-admin-border)] text-[var(--thq-admin-text)] hover:brightness-110'
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
                                                                                ? 'text-[var(--thq-admin-on-accent)]'
                                                                                : isFeatured
                                                                                    ? 'text-[var(--thq-admin-accent)]'
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
                                                                                        ? 'bg-black/15 text-[var(--thq-admin-on-accent)]'
                                                                                        : 'bg-[var(--thq-admin-accent)] text-[var(--thq-admin-on-accent)]'
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