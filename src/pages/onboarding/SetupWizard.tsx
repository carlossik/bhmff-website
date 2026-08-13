import {
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from 'react'

import {
    ArrowRight,
    Building2,
    CalendarDays,
    CheckCircle2,
    Loader2,
    ShieldCheck,
    Trophy,
} from 'lucide-react'

import {
    clubFixtureService,
} from '../../components/admin/Fixtures/clubFixtureService'

import {
    defaultOrganisation,
    type OrganisationFormData,
    type SubscriptionPlan,
} from '../../components/admin/Organisations/organisationTypes'

import {
    competitionService,
} from '../../services/competitionService'

import {
    onboardingService,
} from '../../services/onboardingService'

import {
    supabase,
} from '../../lib/supabaseClient'

import type {
    CompetitionFormat,
    CreateCompetitionInput,
} from '../../types/competitionTypes'

import type {
    Sport,
} from '../../types/sportTypes'

type SetupOrganisationType =
    | 'competition_organiser'
    | 'club'

type SetupPlan =
    | 'trial'
    | 'starter'
    | 'professional'
    | 'enterprise'

type SetupIntent = {
    organisationType:
        SetupOrganisationType
    plan: SetupPlan
}

type DateParts = {
    day: string
    month: string
    year: string
}

type FormState = {
    organisationName: string
    organisationSlug: string
    sportId: string
    publicSiteEnabled: boolean

    competitionName: string
    competitionSlug: string
    competitionSeason: string
    competitionFormat:
        CompetitionFormat
    competitionPublished: boolean

    seasonName: string
    seasonLabel: string

    startDate: DateParts
    endDate: DateParts
}

type AccessState =
    | 'checking'
    | 'authenticated'
    | 'signed_out'
    | 'existing_workspace'

const CURRENT_ORGANISATION_KEY =
    'tournamenthq-current-organisation'

const fieldClassName =
    'mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#8cf566]/60 focus:ring-2 focus:ring-[#8cf566]/10'

const formats: Array<{
    value: CompetitionFormat
    label: string
}> = [
    {
        value: 'LEAGUE',
        label: 'League',
    },
    {
        value: 'ROUND_ROBIN',
        label: 'Round Robin',
    },
    {
        value: 'GROUP_AND_KNOCKOUT',
        label: 'Group and Knockout',
    },
    {
        value: 'KNOCKOUT',
        label: 'Knockout',
    },
    {
        value: 'SINGLE_MATCH',
        label: 'Single Match',
    },
    {
        value: 'FRIENDLY',
        label: 'Friendly',
    },
    {
        value: 'CUSTOM',
        label: 'Custom',
    },
]

const monthOptions = [
    ['01', 'January'],
    ['02', 'February'],
    ['03', 'March'],
    ['04', 'April'],
    ['05', 'May'],
    ['06', 'June'],
    ['07', 'July'],
    ['08', 'August'],
    ['09', 'September'],
    ['10', 'October'],
    ['11', 'November'],
    ['12', 'December'],
] as const

function createSlug(
    value: string,
): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[\'’]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function isOrganisationType(
    value: string | null,
): value is SetupOrganisationType {
    return (
        value ===
            'competition_organiser' ||
        value === 'club'
    )
}

function isSetupPlan(
    value: string | null,
): value is SetupPlan {
    return (
        value === 'trial' ||
        value === 'starter' ||
        value === 'professional' ||
        value === 'enterprise'
    )
}

function getIntentFromUrl():
    Partial<SetupIntent> {
    if (
        typeof window ===
        'undefined'
    ) {
        return {}
    }

    const params =
        new URLSearchParams(
            window.location.search,
        )

    const type =
        params.get('type')

    const plan =
        params.get('plan')

    return {
        organisationType:
            isOrganisationType(type)
                ? type
                : undefined,
        plan: isSetupPlan(plan)
            ? plan
            : undefined,
    }
}

function getUserMetadataIntent(
    metadata: Record<
        string,
        unknown
    >,
): Partial<SetupIntent> {
    const typeValue =
        typeof metadata
            .signup_organisation_type ===
        'string'
            ? metadata
                  .signup_organisation_type
            : null

    const planValue =
        typeof metadata
            .signup_plan ===
        'string'
            ? metadata.signup_plan
            : null

    return {
        organisationType:
            isOrganisationType(
                typeValue,
            )
                ? typeValue
                : undefined,
        plan: isSetupPlan(planValue)
            ? planValue
            : undefined,
    }
}

function resolveIntent(
    metadata: Record<
        string,
        unknown
    >,
): SetupIntent {
    const urlIntent =
        getIntentFromUrl()

    const metadataIntent =
        getUserMetadataIntent(
            metadata,
        )

    return {
        organisationType:
            urlIntent.organisationType ??
            metadataIntent.organisationType ??
            'competition_organiser',
        plan:
            urlIntent.plan ??
            metadataIntent.plan ??
            'trial',
    }
}

function createEmptyDate():
    DateParts {
    return {
        day: '',
        month: '',
        year: '',
    }
}

function getDaysInMonth(
    year: number,
    month: number,
): number {
    return new Date(
        year,
        month,
        0,
    ).getDate()
}

function toIsoDate(
    date: DateParts,
): string {
    if (
        !date.day ||
        !date.month ||
        !date.year
    ) {
        return ''
    }

    const year =
        Number(date.year)

    const month =
        Number(date.month)

    const day =
        Number(date.day)

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day) ||
        year < 1900 ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day >
            getDaysInMonth(
                year,
                month,
            )
    ) {
        return ''
    }

    return `${date.year}-${date.month}-${date.day}`
}

function mapPlan(
    plan: SetupPlan,
): SubscriptionPlan {
    switch (plan) {
        case 'professional':
            return 'professional'
        case 'enterprise':
            return 'enterprise'
        default:
            return 'starter'
    }
}

function formatPlan(
    plan: SetupPlan,
): string {
    switch (plan) {
        case 'professional':
            return 'Professional'
        case 'enterprise':
            return 'Enterprise'
        case 'starter':
            return 'Starter'
        default:
            return 'Free trial'
    }
}

function getTrialEnd(): string {
    const date = new Date()
    date.setDate(
        date.getDate() + 14,
    )

    return date
        .toISOString()
        .slice(0, 10)
}

function getClubModules():
    string[] {
    return [
        'Dashboard',
        'Seasons',
        'Teams',
        'Venues',
        'Sports Officials',
        'Fixtures',
        'Results',
        'Goals',
        'Articles',
        'Media',
        'Sponsors',
        'Enquiries',
        'User Access',
    ]
}

function DateSelect({
    label,
    value,
    onChange,
    required = false,
}: {
    label: string
    value: DateParts
    onChange: (
        value: DateParts,
    ) => void
    required?: boolean
}) {
    const currentYear =
        new Date().getFullYear()

    const years = Array.from(
        { length: 13 },
        (_, index) =>
            currentYear -
            2 +
            index,
    )

    const selectedYear =
        Number(value.year)

    const selectedMonth =
        Number(value.month)

    const dayLimit =
        value.year &&
        value.month &&
        Number.isFinite(
            selectedYear,
        ) &&
        Number.isFinite(
            selectedMonth,
        )
            ? getDaysInMonth(
                  selectedYear,
                  selectedMonth,
              )
            : 31

    const days = Array.from(
        {
            length: dayLimit,
        },
        (_, index) =>
            String(
                index + 1,
            ).padStart(2, '0'),
    )

    function update(
        key: keyof DateParts,
        nextValue: string,
    ) {
        const next = {
            ...value,
            [key]: nextValue,
        }

        if (
            key !== 'day' &&
            next.day &&
            next.month &&
            next.year
        ) {
            const limit =
                getDaysInMonth(
                    Number(next.year),
                    Number(next.month),
                )

            if (
                Number(next.day) >
                limit
            ) {
                next.day =
                    String(
                        limit,
                    ).padStart(
                        2,
                        '0',
                    )
            }
        }

        onChange(next)
    }

    return (
        <fieldset>
            <legend className="text-sm font-bold text-slate-200">
                {label}
                {required ? ' *' : ''}
            </legend>

            <div className="mt-1.5 grid grid-cols-[0.8fr_1.25fr_1fr] gap-2">
                <select
                    value={value.day}
                    onChange={(event) =>
                        update(
                            'day',
                            event.target
                                .value,
                        )
                    }
                    className={fieldClassName}
                    aria-label={`${label} day`}
                >
                    <option value="">
                        Day
                    </option>
                    {days.map(
                        (day) => (
                            <option
                                key={day}
                                value={day}
                            >
                                {day}
                            </option>
                        ),
                    )}
                </select>

                <select
                    value={
                        value.month
                    }
                    onChange={(event) =>
                        update(
                            'month',
                            event.target
                                .value,
                        )
                    }
                    className={fieldClassName}
                    aria-label={`${label} month`}
                >
                    <option value="">
                        Month
                    </option>

                    {monthOptions.map(
                        ([
                            month,
                            name,
                        ]) => (
                            <option
                                key={
                                    month
                                }
                                value={
                                    month
                                }
                            >
                                {name}
                            </option>
                        ),
                    )}
                </select>

                <select
                    value={
                        value.year
                    }
                    onChange={(event) =>
                        update(
                            'year',
                            event.target
                                .value,
                        )
                    }
                    className={fieldClassName}
                    aria-label={`${label} year`}
                >
                    <option value="">
                        Year
                    </option>

                    {years.map(
                        (year) => (
                            <option
                                key={
                                    year
                                }
                                value={
                                    year
                                }
                            >
                                {year}
                            </option>
                        ),
                    )}
                </select>
            </div>
        </fieldset>
    )
}

export function SetupWizard() {
    const [
        accessState,
        setAccessState,
    ] =
        useState<AccessState>(
            'checking',
        )

    const [userId, setUserId] =
        useState<string | null>(null)

    const [
        userName,
        setUserName,
    ] = useState('')

    const [
        userEmail,
        setUserEmail,
    ] = useState('')

    const [intent, setIntent] =
        useState<SetupIntent>({
            organisationType:
                'competition_organiser',
            plan: 'trial',
        })

    const [sports, setSports] =
        useState<Sport[]>([])

    const [
        sportsLoading,
        setSportsLoading,
    ] = useState(true)

    const [saving, setSaving] =
        useState(false)

    const [
        errorMessage,
        setErrorMessage,
    ] = useState<
        string | null
    >(null)

    const [form, setForm] =
        useState<FormState>({
            organisationName: '',
            organisationSlug: '',
            sportId: '',
            publicSiteEnabled: true,
            competitionName: '',
            competitionSlug: '',
            competitionSeason: '',
            competitionFormat:
                'GROUP_AND_KNOCKOUT',
            competitionPublished:
                false,
            seasonName: '',
            seasonLabel: '',
            startDate:
                createEmptyDate(),
            endDate:
                createEmptyDate(),
        })

    const isClub =
        intent.organisationType ===
        'club'

    useEffect(() => {
        let mounted = true

        async function hydrate() {
            const {
                data: {
                    user,
                },
            } =
                await supabase.auth.getUser()

            if (!mounted) {
                return
            }

            if (!user) {
                setAccessState(
                    'signed_out',
                )
                setSportsLoading(
                    false,
                )
                return
            }

            const {
                data: existingMemberships,
                error: membershipError,
            } = await supabase
                .from('organisation_memberships')
                .select('organisation_id')
                .eq('user_id', user.id)
                .eq('active', true)
                .limit(1)

            if (!mounted) {
                return
            }

            if (membershipError) {
                console.error(
                    'Unable to inspect existing organisation access:',
                    membershipError,
                )
                setErrorMessage(
                    'Unable to verify your existing TournamentHQ workspace.',
                )
                setSportsLoading(false)
                setAccessState('authenticated')
                return
            }

            const existingOrganisationId =
                existingMemberships?.[0]?.organisation_id

            if (existingOrganisationId) {
                window.localStorage.setItem(
                    CURRENT_ORGANISATION_KEY,
                    existingOrganisationId,
                )
                setAccessState('existing_workspace')
                setSportsLoading(false)
                window.location.replace('/admin')
                return
            }

            setUserId(user.id)

            const metadata =
                (user.user_metadata ??
                    {}) as Record<
                    string,
                    unknown
                >

            const resolvedIntent =
                resolveIntent(
                    metadata,
                )

            setIntent(
                resolvedIntent,
            )

            const name =
                typeof metadata
                    .full_name ===
                'string'
                    ? metadata
                          .full_name
                    : ''

            setUserName(name)

            setUserEmail(
                user.email ?? '',
            )

            setAccessState(
                'authenticated',
            )

            const {
                data,
                error,
            } = await supabase
                .from('sports')
                .select(
                    'id, name, slug, icon_key, active, created_at, updated_at',
                )
                .eq('active', true)
                .order('name')

            if (!mounted) {
                return
            }

            if (error) {
                console.error(
                    'Failed to load sports:',
                    error,
                )

                setSports([])
                setErrorMessage(
                    'Unable to load sports. Refresh and try again.',
                )
            } else {
                setSports(
                    (data ??
                        []) as Sport[],
                )
            }

            setSportsLoading(
                false,
            )
        }

        void hydrate()

        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        if (
            sports.length === 0 ||
            form.sportId
        ) {
            return
        }

        const football =
            sports.find(
                (sport) =>
                    sport.slug
                        .toLowerCase() ===
                    'football',
            )

        if (football) {
            setForm(
                (current) => ({
                    ...current,
                    sportId:
                        football.id,
                }),
            )
        }
    }, [form.sportId, sports])

    const selectedSport =
        useMemo(
            () =>
                sports.find(
                    (sport) =>
                        sport.id ===
                        form.sportId,
                ),
            [
                form.sportId,
                sports,
            ],
        )

    function updateForm<
        K extends keyof FormState
    >(
        key: K,
        value: FormState[K],
    ) {
        setForm(
            (current) => ({
                ...current,
                [key]: value,
            }),
        )

        setErrorMessage(null)
    }

    function updateOrganisationName(
        value: string,
    ) {
        setForm(
            (current) => ({
                ...current,
                organisationName:
                    value,
                organisationSlug:
                    createSlug(
                        value,
                    ),
            }),
        )

        setErrorMessage(null)
    }

    function updateCompetitionName(
        value: string,
    ) {
        setForm(
            (current) => ({
                ...current,
                competitionName:
                    value,
                competitionSlug:
                    createSlug(
                        value,
                    ),
            }),
        )

        setErrorMessage(null)
    }

    async function handleSubmit(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        if (
            saving ||
            !userId
        ) {
            return
        }

        const organisationName =
            form.organisationName.trim()

        const organisationSlug =
            form.organisationSlug.trim()

        if (!organisationName) {
            setErrorMessage(
                isClub
                    ? 'Club name is required.'
                    : 'Organisation name is required.',
            )
            return
        }

        if (
            !organisationSlug
        ) {
            setErrorMessage(
                'Organisation URL slug is required.',
            )
            return
        }

        if (!form.sportId) {
            setErrorMessage(
                'Sport is required.',
            )
            return
        }

        const startDate =
            toIsoDate(
                form.startDate,
            )

        const endDate =
            toIsoDate(
                form.endDate,
            )

        if (
            startDate &&
            endDate &&
            endDate < startDate
        ) {
            setErrorMessage(
                'The end date cannot be before the start date.',
            )
            return
        }

        if (isClub) {
            if (
                !form.seasonName.trim()
            ) {
                setErrorMessage(
                    'Season name is required.',
                )
                return
            }

            if (
                !form.seasonLabel.trim()
            ) {
                setErrorMessage(
                    'Season label is required.',
                )
                return
            }
        } else {
            if (
                !form.competitionName.trim()
            ) {
                setErrorMessage(
                    'Competition name is required.',
                )
                return
            }

            if (
                !form.competitionSlug.trim()
            ) {
                setErrorMessage(
                    'Competition URL slug is required.',
                )
                return
            }
        }

        setSaving(true)
        setErrorMessage(null)

        try {
            const subscriptionPlan =
                mapPlan(
                    intent.plan,
                )

            const organisation: OrganisationFormData =
                {
                    ...defaultOrganisation,
                    name:
                        organisationName,
                    slug:
                        organisationSlug,
                    organisation_type:
                        intent.organisationType,
                    subscription_plan:
                        subscriptionPlan,
                    subscription_status:
                        'trial',
                    trial_end:
                        getTrialEnd(),
                    public_site_enabled:
                        form.publicSiteEnabled,
                    owner_name:
                        userName ||
                        userEmail,
                    owner_email:
                        userEmail,
                    owner_phone: '',
                    max_competitions:
                        isClub
                            ? 1
                            : defaultOrganisation.max_competitions,
                    enabled_modules:
                        isClub
                            ? getClubModules()
                            : [
                                  ...defaultOrganisation.enabled_modules,
                              ],
                }

            const onboarding =
                await onboardingService.createOrganisation(
                    {
                        organisation,
                        provisionalId:
                            crypto.randomUUID(),
                    },
                )

            const createdOrganisation =
                onboarding.organisation

            /*
             * The organisation service also corrects this after the
             * bootstrap RPC, but keeping the onboarding invariant explicit
             * makes this flow resilient if the RPC still defaults old rows.
             */
            if (
                createdOrganisation.organisation_type !==
                intent.organisationType
            ) {
                const {
                    error,
                } =
                    await supabase
                        .from(
                            'organisations',
                        )
                        .update({
                            organisation_type:
                                intent.organisationType,
                        })
                        .eq(
                            'id',
                            createdOrganisation.id,
                        )

                if (error) {
                    throw new Error(
                        `Organisation created, but its operating model could not be finalised: ${error.message}`,
                    )
                }
            }

            if (isClub) {
                await clubFixtureService.createSeason(
                    createdOrganisation.id,
                    {
                        name:
                            form.seasonName.trim(),
                        season_label:
                            form.seasonLabel.trim(),
                        start_date:
                            startDate,
                        end_date:
                            endDate,
                        status:
                            'active',
                    },
                )
            } else {
                const input: CreateCompetitionInput =
                    {
                        organisation_id:
                            createdOrganisation.id,
                        sport_id:
                            form.sportId,
                        name:
                            form.competitionName.trim(),
                        slug:
                            form.competitionSlug.trim(),
                        season:
                            form.competitionSeason.trim() ||
                            null,
                        format:
                            form.competitionFormat,
                        description:
                            null,
                        start_date:
                            startDate ||
                            null,
                        end_date:
                            endDate ||
                            null,
                        status:
                            'DRAFT',
                        published:
                            form.competitionPublished,
                    }

                await competitionService.create(
                    input,
                )
            }

            const {
                data: ownerMembership,
                error: ownerMembershipError,
            } = await supabase
                .from('organisation_memberships')
                .select(
                    'id, organisation_id, user_id, role, active',
                )
                .eq(
                    'organisation_id',
                    createdOrganisation.id,
                )
                .eq('user_id', userId)
                .eq('active', true)
                .maybeSingle()

            if (ownerMembershipError) {
                throw new Error(
                    `Workspace created, but administrator access could not be verified: ${ownerMembershipError.message}`,
                )
            }

            if (!ownerMembership) {
                throw new Error(
                    'Workspace created, but the administrator membership was not created.',
                )
            }

            window.localStorage.setItem(
                CURRENT_ORGANISATION_KEY,
                createdOrganisation.id,
            )

            await supabase.auth.refreshSession()

            window.location.replace('/admin')
        } catch (error) {
            console.error(
                'Unable to complete onboarding:',
                error,
            )

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Unable to complete TournamentHQ setup.',
            )
        } finally {
            setSaving(false)
        }
    }

    if (
        accessState ===
        'checking'
    ) {
        return (
            <main className="grid min-h-screen place-items-center bg-[#061008] text-white">
                <div className="text-center">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#8cf566]" />
                    <p className="mt-3 text-sm text-slate-400">
                        Loading secure setup...
                    </p>
                </div>
            </main>
        )
    }

    if (
        accessState ===
        'existing_workspace'
    ) {
        return (
            <main className="grid min-h-screen place-items-center bg-[#061008] px-4 text-white">
                <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a160d] p-6 text-center">
                    <CheckCircle2 className="mx-auto h-7 w-7 text-[#8cf566]" />
                    <h1 className="mt-4 !text-2xl !leading-tight font-black">
                        Workspace already configured
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                        This account already has an active TournamentHQ workspace.
                    </p>
                    <a
                        href="/admin"
                        className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#8cf566] px-5 py-2.5 text-sm font-black text-[#061008] no-underline"
                    >
                        Open workspace
                        <ArrowRight className="h-4 w-4" />
                    </a>
                </section>
            </main>
        )
    }

    if (
        accessState ===
        'signed_out'
    ) {
        return (
            <main className="grid min-h-screen place-items-center bg-[#061008] px-4 text-white">
                <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a160d] p-6 text-center">
                    <ShieldCheck className="mx-auto h-7 w-7 text-[#8cf566]" />

                    <h1 className="mt-4 text-2xl font-black">
                        Sign in to continue
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                        Your TournamentHQ
                        setup is protected by
                        your verified account.
                    </p>

                    <a
                        href="/admin"
                        className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#8cf566] px-5 py-2.5 text-sm font-black text-[#061008] no-underline"
                    >
                        Open sign in
                        <ArrowRight className="h-4 w-4" />
                    </a>
                </section>
            </main>
        )
    }

    const planLabel =
        formatPlan(intent.plan)

    return (
        <main className="min-h-screen bg-[#061008] px-4 py-5 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <header className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <a
                            href="https://tournamenthq.co.uk"
                            className="text-lg font-black tracking-tight text-white no-underline"
                        >
                            Tournament
                            <span className="text-[#8cf566]">
                                HQ
                            </span>
                        </a>

                        <h1 className="mt-2 !text-2xl !leading-tight font-black tracking-tight sm:!text-3xl">
                            {isClub
                                ? 'Set up your club'
                                : 'Set up your competition operation'}
                        </h1>

                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                            One compact setup.
                            Your organisation type
                            is locked from the
                            signup journey and can
                            no longer be changed
                            here.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-[#8cf566]/20 bg-[#8cf566]/10 px-3 py-1.5 text-xs font-black text-[#8cf566]">
                            {isClub
                                ? 'Club / Team'
                                : 'Competition Organiser'}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-slate-300">
                            {planLabel}
                        </span>
                    </div>
                </header>

                <form
                    onSubmit={
                        handleSubmit
                    }
                    className="mt-5 grid gap-4"
                >
                    <section className="rounded-2xl border border-white/10 bg-[#0a160d] p-5">
                        <div className="flex items-start gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#8cf566]/10 text-[#8cf566]">
                                <Building2 className="h-4.5 w-4.5" />
                            </div>

                            <div>
                                <h2 className="!text-xl !leading-tight font-black">
                                    {isClub
                                        ? 'Club details'
                                        : 'Organisation details'}
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Core identity,
                                    sport and public
                                    website preference.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <label className="text-sm font-bold text-slate-200">
                                {isClub
                                    ? 'Club name *'
                                    : 'Organisation name *'}

                                <input
                                    value={
                                        form.organisationName
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateOrganisationName(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    className={
                                        fieldClassName
                                    }
                                    placeholder={
                                        isClub
                                            ? 'e.g. Petts Wood Vets'
                                            : 'e.g. Kent Youth League'
                                    }
                                    autoFocus
                                />
                            </label>

                            <label className="text-sm font-bold text-slate-200">
                                Public URL slug *

                                <input
                                    value={
                                        form.organisationSlug
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateForm(
                                            'organisationSlug',
                                            createSlug(
                                                event
                                                    .target
                                                    .value,
                                            ),
                                        )
                                    }
                                    className={
                                        fieldClassName
                                    }
                                    placeholder={
                                        isClub
                                            ? 'pettswood-vets'
                                            : 'kent-youth-league'
                                    }
                                />
                            </label>

                            <label className="text-sm font-bold text-slate-200">
                                Sport *

                                <select
                                    value={
                                        form.sportId
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateForm(
                                            'sportId',
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    className={
                                        fieldClassName
                                    }
                                    disabled={
                                        sportsLoading
                                    }
                                >
                                    <option value="">
                                        {sportsLoading
                                            ? 'Loading sports...'
                                            : 'Select sport'}
                                    </option>

                                    {sports.map(
                                        (
                                            sport,
                                        ) => (
                                            <option
                                                key={
                                                    sport.id
                                                }
                                                value={
                                                    sport.id
                                                }
                                            >
                                                {
                                                    sport.name
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <div className="rounded-xl border border-white/10 bg-[#071009] p-3.5">
                                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                                    Administrator account
                                </span>

                                <strong className="mt-1 block text-sm text-white">
                                    {userName || 'Administrator'}
                                </strong>

                                <span className="mt-0.5 block text-xs text-slate-500">
                                    {userEmail}
                                </span>

                                <p className="mt-1 text-xs text-slate-500">
                                    Created securely on the previous account step.
                                </p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-[#071009] p-3.5">
                                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                                    Organisation type
                                </span>

                                <strong className="mt-1 flex items-center gap-2 text-sm text-white">
                                    {isClub ? (
                                        <ShieldCheck className="h-4 w-4 text-[#8cf566]" />
                                    ) : (
                                        <Trophy className="h-4 w-4 text-[#8cf566]" />
                                    )}
                                    {isClub
                                        ? 'Club / Team'
                                        : 'Competition Organiser'}
                                </strong>

                                <p className="mt-1 text-xs text-slate-500">
                                    Locked from your
                                    signup selection.
                                </p>
                            </div>

                            <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#071009] p-3.5 md:col-span-2 xl:col-span-3">
                                <input
                                    type="checkbox"
                                    checked={
                                        form.publicSiteEnabled
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateForm(
                                            'publicSiteEnabled',
                                            event
                                                .target
                                                .checked,
                                        )
                                    }
                                    className="mt-0.5 h-4 w-4 accent-[#8cf566]"
                                />

                                <span>
                                    <strong className="block text-sm text-white">
                                        Enable public site
                                    </strong>
                                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                                        Publish your
                                        organisation&apos;s
                                        fixtures, results,
                                        content and media
                                        when you are ready.
                                    </span>
                                </span>
                            </label>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-white/10 bg-[#0a160d] p-5">
                        <div className="flex items-start gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#8cf566]/10 text-[#8cf566]">
                                {isClub ? (
                                    <CalendarDays className="h-4.5 w-4.5" />
                                ) : (
                                    <Trophy className="h-4.5 w-4.5" />
                                )}
                            </div>

                            <div>
                                <h2 className="!text-xl !leading-tight font-black">
                                    {isClub
                                        ? 'First season'
                                        : 'First competition'}
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {isClub
                                        ? 'Create the playing season that will contain your fixtures and results.'
                                        : 'Create the first competition owned by this organisation.'}
                                </p>
                            </div>
                        </div>

                        {isClub ? (
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-bold text-slate-200">
                                    Season name *

                                    <input
                                        value={
                                            form.seasonName
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            updateForm(
                                                'seasonName',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className={
                                            fieldClassName
                                        }
                                        placeholder="Petts Wood Vets 2026/27"
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-200">
                                    Season label *

                                    <input
                                        value={
                                            form.seasonLabel
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            updateForm(
                                                'seasonLabel',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className={
                                            fieldClassName
                                        }
                                        placeholder="2026/27"
                                    />
                                </label>

                                <DateSelect
                                    label="Start date"
                                    value={
                                        form.startDate
                                    }
                                    onChange={(
                                        value,
                                    ) =>
                                        updateForm(
                                            'startDate',
                                            value,
                                        )
                                    }
                                />

                                <DateSelect
                                    label="End date"
                                    value={
                                        form.endDate
                                    }
                                    onChange={(
                                        value,
                                    ) =>
                                        updateForm(
                                            'endDate',
                                            value,
                                        )
                                    }
                                />
                            </div>
                        ) : (
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-bold text-slate-200">
                                    Competition name *

                                    <input
                                        value={
                                            form.competitionName
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            updateCompetitionName(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className={
                                            fieldClassName
                                        }
                                        placeholder="e.g. Kent Youth League 2026/27"
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-200">
                                    Competition URL slug *

                                    <input
                                        value={
                                            form.competitionSlug
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            updateForm(
                                                'competitionSlug',
                                                createSlug(
                                                    event
                                                        .target
                                                        .value,
                                                ),
                                            )
                                        }
                                        className={
                                            fieldClassName
                                        }
                                        placeholder="kent-youth-league-2026"
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-200">
                                    Season

                                    <input
                                        value={
                                            form.competitionSeason
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            updateForm(
                                                'competitionSeason',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className={
                                            fieldClassName
                                        }
                                        placeholder="2026/27"
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-200">
                                    Competition format

                                    <select
                                        value={
                                            form.competitionFormat
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            updateForm(
                                                'competitionFormat',
                                                event
                                                    .target
                                                    .value as CompetitionFormat,
                                            )
                                        }
                                        className={
                                            fieldClassName
                                        }
                                    >
                                        {formats.map(
                                            (
                                                option,
                                            ) => (
                                                <option
                                                    key={
                                                        option.value
                                                    }
                                                    value={
                                                        option.value
                                                    }
                                                >
                                                    {
                                                        option.label
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </label>

                                <DateSelect
                                    label="Start date"
                                    value={
                                        form.startDate
                                    }
                                    onChange={(
                                        value,
                                    ) =>
                                        updateForm(
                                            'startDate',
                                            value,
                                        )
                                    }
                                />

                                <DateSelect
                                    label="End date"
                                    value={
                                        form.endDate
                                    }
                                    onChange={(
                                        value,
                                    ) =>
                                        updateForm(
                                            'endDate',
                                            value,
                                        )
                                    }
                                />

                                <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#071009] p-3.5 md:col-span-2">
                                    <input
                                        type="checkbox"
                                        checked={
                                            form.competitionPublished
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            updateForm(
                                                'competitionPublished',
                                                event
                                                    .target
                                                    .checked,
                                            )
                                        }
                                        className="mt-0.5 h-4 w-4 accent-[#8cf566]"
                                    />

                                    <span>
                                        <strong className="block text-sm text-white">
                                            Publish
                                            competition
                                        </strong>
                                        <span className="mt-0.5 block text-xs text-slate-500">
                                            You can also
                                            leave it as a
                                            draft and
                                            publish later.
                                        </span>
                                    </span>
                                </label>
                            </div>
                        )}
                    </section>

                    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0a160d] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs leading-5 text-slate-500">
                            <span className="font-black text-slate-300">
                                {formatPlan(
                                    intent.plan,
                                )}
                            </span>
                            {' · '}
                            {selectedSport
                                ? selectedSport.name
                                : 'Select a sport'}
                            {' · '}
                            {isClub
                                ? 'Club workspace'
                                : 'Competition workspace'}
                        </div>

                        <button
                            type="submit"
                            disabled={
                                saving ||
                                sportsLoading
                            }
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#8cf566] px-5 py-2.5 text-sm font-black text-[#061008] transition hover:bg-[#a5ff80] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating workspace...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    {isClub
                                        ? 'Create Club Workspace'
                                        : 'Create Competition Workspace'}
                                </>
                            )}
                        </button>
                    </section>

                    {errorMessage && (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                        >
                            {
                                errorMessage
                            }
                        </div>
                    )}
                </form>
            </div>
        </main>
    )
}
