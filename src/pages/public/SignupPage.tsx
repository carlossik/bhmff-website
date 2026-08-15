import {
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from 'react'
import {
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    ShieldCheck,
    Sparkles,
    Trophy,
    UserRound,
    UsersRound,
} from 'lucide-react'
import type {
    LucideIcon,
} from 'lucide-react'

import {
    REQUESTED_PLAN_STORAGE_KEY,
    getRequestedPlanFromSearch,
} from '../../config/subscriptionPlans'
import {
    persistRequestedOrganisationType,
    resolveRequestedOrganisationType,
} from '../../config/onboardingJourney'
import type {
    OrganisationType,
} from '../../components/admin/Organisations/organisationTypes'
import { supabase } from '../../lib/supabaseClient'

type SignupStatus =
    | 'checking-session'
    | 'idle'
    | 'submitting'
    | 'verify-email'

function getStoredRequestedPlan():
    'starter' | 'professional' | null {
    if (typeof window === 'undefined') {
        return null
    }

    const value = window.localStorage.getItem(
        REQUESTED_PLAN_STORAGE_KEY,
    )

    return value === 'starter' ||
        value === 'professional'
        ? value
        : null
}

function persistRequestedPlan():
    'starter' | 'professional' | null {
    if (typeof window === 'undefined') {
        return null
    }

    const requestedPlan =
        getRequestedPlanFromSearch(
            window.location.search,
        ) ?? getStoredRequestedPlan()

    if (requestedPlan) {
        window.localStorage.setItem(
            REQUESTED_PLAN_STORAGE_KEY,
            requestedPlan,
        )
    }

    return requestedPlan
}

function persistRequestedType(): OrganisationType {
    if (typeof window === 'undefined') {
        return 'competition_organiser'
    }

    const organisationType =
        resolveRequestedOrganisationType(
            window.location.search,
        )

    persistRequestedOrganisationType(
        organisationType,
    )

    return organisationType
}

function getOnboardingPath(): string {
    if (typeof window === 'undefined') {
        return '/onboarding'
    }

    const params = new URLSearchParams()
    const organisationType =
        persistRequestedType()
    const requestedPlan =
        persistRequestedPlan()

    params.set('type', organisationType)

    if (requestedPlan) {
        params.set('plan', requestedPlan)
    }

    return `/onboarding?${params.toString()}`
}

function getRedirectUrl(): string {
    if (typeof window === 'undefined') {
        return '/onboarding'
    }

    return `${window.location.origin}${getOnboardingPath()}`
}

export function SignupPage() {
    const [fullName, setFullName] =
        useState('')
    const [email, setEmail] =
        useState('')
    const [password, setPassword] =
        useState('')
    const [
        confirmPassword,
        setConfirmPassword,
    ] = useState('')
    const [
        showPassword,
        setShowPassword,
    ] = useState(false)
    const [
        acceptedTerms,
        setAcceptedTerms,
    ] = useState(false)
    const [status, setStatus] =
        useState<SignupStatus>(
            'checking-session',
        )
    const [errorMessage, setErrorMessage] =
        useState('')

    const organisationType =
        useMemo<OrganisationType>(
            () =>
                typeof window === 'undefined'
                    ? 'competition_organiser'
                    : resolveRequestedOrganisationType(
                          window.location.search,
                      ),
            [],
        )
    const isClub =
        organisationType === 'club'
    const journeyFeatures: Array<[
        LucideIcon,
        string,
    ]> = isClub
        ? [
              [
                  UsersRound,
                  'Set up your club workspace',
              ],
              [
                  ShieldCheck,
                  'Manage teams, squads and fixtures',
              ],
              [
                  Sparkles,
                  'Launch a branded club website',
              ],
          ]
        : [
              [
                  Trophy,
                  'Create your first competition',
              ],
              [
                  ShieldCheck,
                  'Launch a branded public site',
              ],
              [
                  Sparkles,
                  'Continue into AI-assisted scheduling',
              ],
          ]

    const isSubmitting =
        status === 'submitting'

    const passwordChecks = useMemo(
        () => ({
            length:
                password.length >= 8,
            upper:
                /[A-Z]/.test(password),
            lower:
                /[a-z]/.test(password),
            number:
                /\d/.test(password),
        }),
        [password],
    )

    const passwordIsValid =
        Object.values(
            passwordChecks,
        ).every(Boolean)

    useEffect(() => {
        let isMounted = true

        persistRequestedPlan()
        persistRequestedType()

        void supabase.auth
            .getSession()
            .then(({ data, error }) => {
                if (!isMounted) {
                    return
                }

                if (error) {
                    console.error(
                        'Unable to check the existing TournamentHQ session:',
                        error,
                    )
                    setStatus('idle')
                    return
                }

                if (data.session) {
                    window.location.replace(
                        getOnboardingPath(),
                    )
                    return
                }

                setStatus('idle')
            })

        return () => {
            isMounted = false
        }
    }, [])

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        if (isSubmitting) {
            return
        }

        setErrorMessage('')

        const normalisedName =
            fullName.trim()
        const normalisedEmail =
            email.trim().toLowerCase()
        const requestedPlan =
            persistRequestedPlan()
        const requestedOrganisationType =
            persistRequestedType()

        if (!normalisedName) {
            setErrorMessage(
                'Enter your name.',
            )
            return
        }

        if (!normalisedEmail) {
            setErrorMessage(
                'Enter your email address.',
            )
            return
        }

        if (!passwordIsValid) {
            setErrorMessage(
                'Your password must be at least 8 characters and include uppercase, lowercase and a number.',
            )
            return
        }

        if (
            password !==
            confirmPassword
        ) {
            setErrorMessage(
                'The passwords do not match.',
            )
            return
        }

        if (!acceptedTerms) {
            setErrorMessage(
                'Please confirm that you accept the Terms of Service and Privacy Policy.',
            )
            return
        }

        setStatus('submitting')

        try {
            const {
                data,
                error,
            } =
                await supabase.auth.signUp(
                    {
                        email:
                            normalisedEmail,
                        password,
                        options: {
                            emailRedirectTo:
                                getRedirectUrl(),
                            data: {
                                full_name:
                                    normalisedName,
                                requested_plan:
                                    requestedPlan,
                                requested_organisation_type:
                                    requestedOrganisationType,
                            },
                        },
                    },
                )

            if (error) {
                throw error
            }

            if (data.session) {
                window.location.replace(
                    getOnboardingPath(),
                )
                return
            }

            setStatus('verify-email')
        } catch (error) {
            setStatus('idle')
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Unable to create your TournamentHQ account.',
            )
        }
    }

    if (
        status === 'checking-session'
    ) {
        return (
            <main className="min-h-screen bg-[#061008] px-4 py-8 text-white sm:px-6">
                <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-xl place-items-center">
                    <section className="w-full rounded-3xl border border-[#8cf566]/20 bg-[#0b180e] p-8 text-center shadow-2xl shadow-black/30">
                        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#8cf566]/20 border-t-[#8cf566]" />

                        <h1 className="mt-6 text-2xl font-black tracking-tight">
                            Preparing your {isClub
                                ? 'club'
                                : 'competition'} setup
                        </h1>

                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
                            Checking whether you already have a TournamentHQ session before showing account creation.
                        </p>
                    </section>
                </div>
            </main>
        )
    }

    if (
        status === 'verify-email'
    ) {
        return (
            <main className="min-h-screen bg-[#061008] px-4 py-8 text-white sm:px-6">
                <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-2xl place-items-center">
                    <section className="w-full rounded-3xl border border-[#8cf566]/20 bg-[#0b180e] p-7 text-center shadow-2xl shadow-black/30 sm:p-10">
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[#8cf566]/25 bg-[#8cf566]/10 text-[#8cf566]">
                            <Mail className="h-7 w-7" />
                        </div>

                        <span className="mt-6 inline-flex rounded-full border border-[#8cf566]/20 bg-[#8cf566]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.15em] text-[#8cf566]">
                            One final step
                        </span>

                        <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                            Check your email
                        </h1>

                        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-400 sm:text-base">
                            We sent a verification
                            link to{' '}
                            <strong className="text-white">
                                {email.trim()}
                            </strong>
                            . Verify your email and
                            we will take you directly
                            into the TournamentHQ
                            Setup Assistant.
                        </p>

                        <a
                            href="/admin"
                            className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-black text-white no-underline transition hover:border-[#8cf566]/40 hover:bg-white/5"
                        >
                            Already verified? Sign in
                            <ArrowRight className="h-4 w-4" />
                        </a>
                    </section>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_80%_10%,rgba(140,245,102,0.10),transparent_28%),#061008] px-4 py-6 text-white sm:px-6 lg:px-8">
            <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center">
                <div className="grid w-full overflow-hidden rounded-[32px] border border-[#8cf566]/20 bg-[#0a160d] shadow-2xl shadow-black/40 lg:grid-cols-[0.9fr_1.1fr]">
                    <section className="relative hidden overflow-hidden border-r border-[#8cf566]/10 bg-[#08120b] p-10 lg:flex lg:flex-col lg:justify-between">
                        <div
                            aria-hidden="true"
                            className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#8cf566]/10 blur-3xl"
                        />

                        <div className="relative">
                            <a
                                href="https://tournamenthq.co.uk"
                                className="inline-flex items-center text-xl font-black tracking-[-0.04em] text-white no-underline"
                            >
                                Tournament
                                <span className="text-[#8cf566]">
                                    HQ
                                </span>
                            </a>

                            <div className="mt-16">
                                <span className="inline-flex items-center gap-2 rounded-full border border-[#8cf566]/20 bg-[#8cf566]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.15em] text-[#8cf566]">
                                    <Sparkles className="h-4 w-4" />
                                    Start in minutes
                                </span>

                                <h2 className="mt-6 max-w-md text-4xl font-black leading-[1.05] tracking-tight">
                                    {isClub
                                        ? 'Your club.'
                                        : 'Your competition.'}
                                    <span className="block text-[#8cf566]">
                                        One operating system.
                                    </span>
                                </h2>

                                <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
                                    {isClub
                                        ? 'Create your account, set up your club workspace and start organising your teams through one guided workflow.'
                                        : 'Create your account, configure your organisation and launch your first competition through one guided workflow.'}
                                </p>
                            </div>
                        </div>

                        <div className="relative grid gap-3">
                            {journeyFeatures.map(
                                ([
                                    Icon,
                                    text,
                                ]) => (
                                    <div
                                        key={text as string}
                                        className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
                                    >
                                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#8cf566]/10 text-[#8cf566]">
                                            <Icon className="h-5 w-5" />
                                        </div>

                                        <span className="text-sm font-bold text-slate-200">
                                            {text}
                                        </span>
                                    </div>
                                ),
                            )}
                        </div>
                    </section>

                    <section className="p-6 sm:p-9 lg:p-12">
                        <div className="mx-auto max-w-xl">
                            <a
                                href="https://tournamenthq.co.uk"
                                className="mb-8 inline-flex text-lg font-black tracking-[-0.04em] text-white no-underline lg:hidden"
                            >
                                Tournament
                                <span className="text-[#8cf566]">
                                    HQ
                                </span>
                            </a>

                            <div className="flex items-center justify-between gap-4">
                                <span className="text-xs font-black uppercase tracking-[0.16em] text-[#8cf566]">
                                    Create account
                                </span>

                                <a
                                    href="https://tournamenthq.co.uk"
                                    className="text-xs font-bold text-slate-400 no-underline transition hover:text-white"
                                >
                                    Back to website
                                </a>
                            </div>

                            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                                Start your TournamentHQ journey
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-slate-400">
                                No organisation setup
                                required yet. Create your
                                secure account first, then
                                the Setup Assistant will
                                guide you through the rest.
                            </p>

                            <form
                                className="mt-8 grid gap-5"
                                onSubmit={
                                    handleSubmit
                                }
                            >
                                <label className="grid gap-2">
                                    <span className="text-sm font-bold text-slate-200">
                                        Full name
                                    </span>

                                    <span className="relative">
                                        <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            autoComplete="name"
                                            value={
                                                fullName
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setFullName(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="Your name"
                                            className="min-h-12 w-full rounded-xl border border-white/10 bg-[#071009] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#8cf566]/60 focus:ring-2 focus:ring-[#8cf566]/10"
                                        />
                                    </span>
                                </label>

                                <label className="grid gap-2">
                                    <span className="text-sm font-bold text-slate-200">
                                        Email address
                                    </span>

                                    <span className="relative">
                                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(
                                                event,
                                            ) =>
                                                setEmail(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="you@organisation.com"
                                            className="min-h-12 w-full rounded-xl border border-white/10 bg-[#071009] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#8cf566]/60 focus:ring-2 focus:ring-[#8cf566]/10"
                                        />
                                    </span>
                                </label>

                                <label className="grid gap-2">
                                    <span className="text-sm font-bold text-slate-200">
                                        Password
                                    </span>

                                    <span className="relative">
                                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                                        <input
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            autoComplete="new-password"
                                            value={
                                                password
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setPassword(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="Create a secure password"
                                            className="min-h-12 w-full rounded-xl border border-white/10 bg-[#071009] py-3 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#8cf566]/60 focus:ring-2 focus:ring-[#8cf566]/10"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(
                                                    (
                                                        current,
                                                    ) =>
                                                        !current,
                                                )
                                            }
                                            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white"
                                            aria-label={
                                                showPassword
                                                    ? 'Hide password'
                                                    : 'Show password'
                                            }
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </span>
                                </label>

                                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                                    {[
                                        [
                                            passwordChecks.length,
                                            '8+ chars',
                                        ],
                                        [
                                            passwordChecks.upper,
                                            'Uppercase',
                                        ],
                                        [
                                            passwordChecks.lower,
                                            'Lowercase',
                                        ],
                                        [
                                            passwordChecks.number,
                                            'Number',
                                        ],
                                    ].map(
                                        ([
                                            passed,
                                            label,
                                        ]) => (
                                            <span
                                                key={
                                                    label as string
                                                }
                                                className={[
                                                    'inline-flex items-center gap-1.5',
                                                    passed
                                                        ? 'text-[#8cf566]'
                                                        : 'text-slate-600',
                                                ].join(
                                                    ' ',
                                                )}
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                {
                                                    label
                                                }
                                            </span>
                                        ),
                                    )}
                                </div>

                                <label className="grid gap-2">
                                    <span className="text-sm font-bold text-slate-200">
                                        Confirm password
                                    </span>

                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        value={
                                            confirmPassword
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setConfirmPassword(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        placeholder="Repeat your password"
                                        className="min-h-12 w-full rounded-xl border border-white/10 bg-[#071009] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#8cf566]/60 focus:ring-2 focus:ring-[#8cf566]/10"
                                    />
                                </label>

                                <label className="flex items-start gap-3 text-xs leading-5 text-slate-400">
                                    <input
                                        type="checkbox"
                                        checked={
                                            acceptedTerms
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setAcceptedTerms(
                                                event
                                                    .target
                                                    .checked,
                                            )
                                        }
                                        className="mt-0.5 h-4 w-4 accent-[#8cf566]"
                                    />

                                    <span>
                                        I agree to the
                                        TournamentHQ Terms
                                        of Service and
                                        Privacy Policy.
                                    </span>
                                </label>

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

                                <button
                                    type="submit"
                                    disabled={
                                        isSubmitting
                                    }
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#8cf566] px-5 py-3 text-sm font-black text-[#061008] transition hover:bg-[#a5ff80] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSubmitting
                                        ? 'Creating account...'
                                        : 'Create account'}
                                    {!isSubmitting && (
                                        <ArrowRight className="h-4 w-4" />
                                    )}
                                </button>
                            </form>

                            <div className="mt-7 border-t border-white/10 pt-6 text-center text-sm text-slate-500">
                                Already have an account?{' '}
                                <a
                                    href="/admin"
                                    className="font-black text-[#8cf566] no-underline hover:text-[#a5ff80]"
                                >
                                    Sign in
                                </a>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    )
}
