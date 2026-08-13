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
} from 'lucide-react'

import { supabase } from '../../lib/supabaseClient'

type SignupStatus =
    | 'idle'
    | 'submitting'
    | 'verify-email'

type SignupOrganisationType =
    | 'competition_organiser'
    | 'club'

type SignupPlan =
    | 'trial'
    | 'starter'
    | 'professional'
    | 'enterprise'

type SignupIntent = {
    organisationType: SignupOrganisationType
    plan: SignupPlan
}

function isOrganisationType(
    value: string | null,
): value is SignupOrganisationType {
    return (
        value === 'competition_organiser' ||
        value === 'club'
    )
}

function isSignupPlan(
    value: string | null,
): value is SignupPlan {
    return (
        value === 'trial' ||
        value === 'starter' ||
        value === 'professional' ||
        value === 'enterprise'
    )
}

function getSignupIntent(): SignupIntent {
    if (typeof window === 'undefined') {
        return {
            organisationType:
                'competition_organiser',
            plan: 'trial',
        }
    }

    const params = new URLSearchParams(
        window.location.search,
    )

    const requestedType =
        params.get('type')

    const requestedPlan =
        params.get('plan')

    return {
        organisationType:
            isOrganisationType(requestedType)
                ? requestedType
                : 'competition_organiser',
        plan: isSignupPlan(requestedPlan)
            ? requestedPlan
            : 'trial',
    }
}

function createOnboardingPath(
    intent: SignupIntent,
): string {
    const params = new URLSearchParams({
        type: intent.organisationType,
        plan: intent.plan,
    })

    return `/onboarding?${params.toString()}`
}

function getRedirectUrl(
    intent: SignupIntent,
): string {
    if (typeof window === 'undefined') {
        return createOnboardingPath(intent)
    }

    return `${window.location.origin}${createOnboardingPath(
        intent,
    )}`
}

function formatPlan(
    plan: SignupPlan,
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

export function SignupPage() {
    const intent = useMemo(
        getSignupIntent,
        [],
    )

    const isClub =
        intent.organisationType === 'club'

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
        useState<SignupStatus>('idle')

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('')

    const isSubmitting =
        status === 'submitting'

    const passwordChecks = useMemo(
        () => ({
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            number: /\d/.test(password),
        }),
        [password],
    )

    const passwordIsValid =
        Object.values(
            passwordChecks,
        ).every(Boolean)

    useEffect(() => {
        let isMounted = true

        async function routeExistingSession() {
            const {
                data,
                error,
            } = await supabase.auth.getSession()

            if (
                !isMounted ||
                error ||
                !data.session
            ) {
                return
            }

            const userId =
                data.session.user.id

            const {
                data: membershipData,
                error: membershipError,
            } = await supabase
                .from('organisation_memberships')
                .select('organisation_id')
                .eq('user_id', userId)
                .eq('active', true)
                .limit(1)

            if (!isMounted) {
                return
            }

            if (membershipError) {
                console.error(
                    'Unable to inspect existing organisation access:',
                    membershipError,
                )
                return
            }

            const existingOrganisationId =
                membershipData?.[0]?.organisation_id

            if (existingOrganisationId) {
                window.localStorage.setItem(
                    'tournamenthq-current-organisation',
                    existingOrganisationId,
                )

                window.location.replace('/admin')
                return
            }

            window.location.replace(
                createOnboardingPath(intent),
            )
        }

        void routeExistingSession()

        return () => {
            isMounted = false
        }
    }, [intent])

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
                                getRedirectUrl(
                                    intent,
                                ),
                            data: {
                                full_name:
                                    normalisedName,
                                signup_organisation_type:
                                    intent.organisationType,
                                signup_plan:
                                    intent.plan,
                            },
                        },
                    },
                )

            if (error) {
                throw error
            }

            if (data.session) {
                window.location.replace(
                    createOnboardingPath(
                        intent,
                    ),
                )
                return
            }

            setStatus(
                'verify-email',
            )
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
        status === 'verify-email'
    ) {
        return (
            <main className="min-h-screen bg-[#061008] px-4 py-8 text-white sm:px-6">
                <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-2xl place-items-center">
                    <section className="w-full rounded-2xl border border-[#8cf566]/20 bg-[#0b180e] p-6 text-center shadow-2xl shadow-black/30 sm:p-8">
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl border border-[#8cf566]/25 bg-[#8cf566]/10 text-[#8cf566]">
                            <Mail className="h-6 w-6" />
                        </div>

                        <span className="mt-5 inline-flex rounded-full border border-[#8cf566]/20 bg-[#8cf566]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#8cf566]">
                            Verify your account
                        </span>

                        <h1 className="mt-4 text-2xl font-black tracking-tight">
                            Check your email
                        </h1>

                        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
                            We sent a verification
                            link to{' '}
                            <strong className="text-white">
                                {email.trim()}
                            </strong>
                            . After verification,
                            TournamentHQ will continue
                            with your{' '}
                            {isClub
                                ? 'club'
                                : 'competition organiser'}{' '}
                            setup.
                        </p>

                        <a
                            href="/admin"
                            className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-black text-white no-underline transition hover:border-[#8cf566]/40 hover:bg-white/5"
                        >
                            Already verified? Sign in
                            <ArrowRight className="h-4 w-4" />
                        </a>
                    </section>
                </div>
            </main>
        )
    }

    const audienceTitle = isClub
        ? 'Set up your club'
        : 'Set up your competition operation'

    const audienceDescription = isClub
        ? 'Manage seasons, fixtures, results, scorers, officials, media and your public club site from one workspace.'
        : 'Create and operate leagues, tournaments, cups and sporting events from one central workspace.'

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_80%_10%,rgba(140,245,102,0.08),transparent_28%),#061008] px-4 py-5 text-white sm:px-6">
            <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-5xl items-center">
                <div className="grid w-full overflow-hidden rounded-2xl border border-[#8cf566]/20 bg-[#0a160d] shadow-2xl shadow-black/40 lg:grid-cols-[0.78fr_1.22fr]">
                    <section className="relative hidden border-r border-[#8cf566]/10 bg-[#08120b] p-7 lg:flex lg:flex-col lg:justify-between">
                        <div>
                            <a
                                href="https://tournamenthq.co.uk"
                                className="inline-flex items-center text-lg font-black tracking-[-0.04em] text-white no-underline"
                            >
                                Tournament
                                <span className="text-[#8cf566]">
                                    HQ
                                </span>
                            </a>

                            <div className="mt-10">
                                <span className="inline-flex items-center gap-2 rounded-full border border-[#8cf566]/20 bg-[#8cf566]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#8cf566]">
                                    {isClub ? (
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                    ) : (
                                        <Trophy className="h-3.5 w-3.5" />
                                    )}
                                    {isClub
                                        ? 'Club / team'
                                        : 'Competition organiser'}
                                </span>

                                <h2 className="mt-4 max-w-sm !text-2xl !leading-tight font-black tracking-tight">
                                    {audienceTitle}
                                </h2>

                                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
                                    {audienceDescription}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                            <span className="text-[11px] font-black uppercase tracking-[0.13em] text-slate-500">
                                Selected plan
                            </span>
                            <strong className="mt-1 block text-base text-white">
                                {formatPlan(
                                    intent.plan,
                                )}
                            </strong>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                Your plan selection is
                                carried into setup. Billing
                                can be activated when
                                commercial payments go live.
                            </p>
                        </div>
                    </section>

                    <section className="p-5 sm:p-7 lg:p-8">
                        <div className="mx-auto max-w-xl">
                            <a
                                href="https://tournamenthq.co.uk"
                                className="mb-5 inline-flex text-lg font-black tracking-[-0.04em] text-white no-underline lg:hidden"
                            >
                                Tournament
                                <span className="text-[#8cf566]">
                                    HQ
                                </span>
                            </a>

                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8cf566]">
                                    Create account
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-bold text-slate-400">
                                    {isClub
                                        ? 'Club / Team'
                                        : 'Competition Organiser'}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-bold text-slate-400">
                                    {formatPlan(
                                        intent.plan,
                                    )}
                                </span>
                            </div>

                            <h1 className="mt-3 !text-3xl !leading-[1.05] font-black tracking-tight sm:!text-4xl lg:!text-[2.5rem]">
                                {audienceTitle}
                            </h1>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                Create your secure account.
                                Your organisation type and
                                selected plan are already
                                locked to this signup path.
                            </p>

                            <form
                                className="mt-6 grid gap-4"
                                onSubmit={
                                    handleSubmit
                                }
                            >
                                <label className="grid gap-1.5">
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
                                            className="min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] py-2.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#8cf566]/60 focus:ring-2 focus:ring-[#8cf566]/10"
                                        />
                                    </span>
                                </label>

                                <label className="grid gap-1.5">
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
                                            className="min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] py-2.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#8cf566]/60 focus:ring-2 focus:ring-[#8cf566]/10"
                                        />
                                    </span>
                                </label>

                                <label className="grid gap-1.5">
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
                                            className="min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] py-2.5 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#8cf566]/60 focus:ring-2 focus:ring-[#8cf566]/10"
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

                                <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
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

                                <label className="grid gap-1.5">
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
                                        className="min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#8cf566]/60 focus:ring-2 focus:ring-[#8cf566]/10"
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
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#8cf566] px-5 py-2.5 text-sm font-black text-[#061008] transition hover:bg-[#a5ff80] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSubmitting
                                        ? 'Creating account...'
                                        : 'Create account'}
                                    {!isSubmitting && (
                                        <ArrowRight className="h-4 w-4" />
                                    )}
                                </button>
                            </form>

                            <div className="mt-5 border-t border-white/10 pt-4 text-center text-sm text-slate-500">
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
