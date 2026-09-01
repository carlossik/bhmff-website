import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'

import { AdminLogin } from '../components/AdminLogin'
import { AdminPortal } from '../components/AdminPortal'
import { supabase } from '../lib/supabaseClient'
import {
    getCurrentAdminProfile,
    type AdminProfile,
} from '../services/accessControl'
import {
    OrganisationProvider,
    useOrganisation,
} from '../context/OrganisationContext'
import { OrganisationThemeProvider } from '../context/OrganisationThemeProvider'
import { CompetitionProvider } from '../contexts/CompetitionContext'


function AdminThemeBridge({
    children,
}: {
    children: ReactNode
}) {
    const { currentOrganisation } =
        useOrganisation()

    return (
        <OrganisationThemeProvider
            organisation={currentOrganisation}
        >
            {children}
        </OrganisationThemeProvider>
    )
}

const ONBOARDING_ACCESS_MESSAGES = new Set([
    'Your account does not have an administrator profile.',
    'Your account is not assigned to an active organisation.',
    'Your self-service setup is incomplete.',
])

function shouldContinueOnboarding(
    error: unknown,
): boolean {
    return (
        error instanceof Error &&
        ONBOARDING_ACCESS_MESSAGES.has(
            error.message.trim(),
        )
    )
}

function getMetadataString(
    metadata: Record<string, unknown>,
    key: string,
): string | null {
    const value = metadata[key]

    return typeof value === 'string' &&
        value.trim()
        ? value.trim()
        : null
}

function getOnboardingContinuationPath(
    session: Session,
): string {
    const metadata =
        session.user.user_metadata as
            | Record<string, unknown>
            | null
            | undefined

    const params = new URLSearchParams()

    if (metadata) {
        const organisationType = getMetadataString(
            metadata,
            'signup_organisation_type',
        )

        if (
            organisationType ===
                'competition_organiser' ||
            organisationType === 'club'
        ) {
            params.set('type', organisationType)
        }

        const plan = getMetadataString(
            metadata,
            'signup_plan',
        )

        if (plan) {
            params.set('plan', plan)
        }

        const billing = getMetadataString(
            metadata,
            'signup_billing_interval',
        )

        if (billing) {
            params.set('billing', billing)
        }
    }

    const query = params.toString()

    return query
        ? `/onboarding?${query}`
        : '/onboarding'
}

export function AdminPage() {
    const [session, setSession] =
        useState<Session | null>(null)

    const [profile, setProfile] =
        useState<AdminProfile | null>(null)

    const [isLoading, setIsLoading] =
        useState(true)

    const [
        accessError,
        setAccessError,
    ] = useState('')

    const navigate = useNavigate()

    const isMountedRef =
        useRef(true)

    const profileRef =
        useRef<AdminProfile | null>(null)

    const loadedUserIdRef =
        useRef<string | null>(null)

    const profileRequestRef =
        useRef<Promise<void> | null>(null)

    useEffect(() => {
        profileRef.current = profile
    }, [profile])

    const loadProfile = useCallback(
        async (
            activeSession: Session,
            showLoadingScreen = false,
        ) => {
            const userId =
                activeSession.user.id

            if (
                loadedUserIdRef.current ===
                    userId &&
                profileRef.current
            ) {
                setSession(activeSession)
                return
            }

            if (profileRequestRef.current) {
                await profileRequestRef.current
                return
            }

            const request = (async () => {
                if (showLoadingScreen) {
                    setIsLoading(true)
                }

                setAccessError('')
                setSession(activeSession)

                try {
                    const adminProfile =
                        await getCurrentAdminProfile()

                    if (
                        !isMountedRef.current
                    ) {
                        return
                    }

                    loadedUserIdRef.current =
                        userId
                    profileRef.current =
                        adminProfile

                    setSession(activeSession)
                    setProfile(adminProfile)
                } catch (error) {
                    if (
                        !isMountedRef.current
                    ) {
                        return
                    }

                    loadedUserIdRef.current =
                        null
                    profileRef.current =
                        null

                    setProfile(null)

                    if (
                        shouldContinueOnboarding(
                            error,
                        )
                    ) {
                        setAccessError('')
                        navigate(
                            getOnboardingContinuationPath(
                                activeSession,
                            ),
                            {
                                replace: true,
                            },
                        )
                        return
                    }

                    setAccessError(
                        error instanceof Error
                            ? error.message
                            : 'Your administrator access could not be verified.',
                    )
                } finally {
                    if (
                        isMountedRef.current
                    ) {
                        setIsLoading(false)
                    }

                    profileRequestRef.current =
                        null
                }
            })()

            profileRequestRef.current =
                request

            await request
        },
        [navigate],
    )

    useEffect(() => {
        isMountedRef.current = true

        void supabase.auth
            .getSession()
            .then(({ data, error }) => {
                if (
                    !isMountedRef.current
                ) {
                    return
                }

                if (
                    error ||
                    !data.session
                ) {
                    loadedUserIdRef.current =
                        null
                    profileRef.current =
                        null

                    setSession(null)
                    setProfile(null)
                    setIsLoading(false)
                    return
                }

                void loadProfile(
                    data.session,
                    true,
                )
            })

        const {
            data: authListener,
        } =
            supabase.auth.onAuthStateChange(
                (
                    event,
                    activeSession,
                ) => {
                    if (
                        !isMountedRef.current
                    ) {
                        return
                    }

                    if (
                        event ===
                            'SIGNED_OUT' ||
                        !activeSession
                    ) {
                        loadedUserIdRef.current =
                            null
                        profileRequestRef.current =
                            null
                        profileRef.current =
                            null

                        setSession(null)
                        setProfile(null)
                        setAccessError('')
                        setIsLoading(false)
                        return
                    }

                    if (
                        event ===
                        'TOKEN_REFRESHED'
                    ) {
                        setSession(
                            activeSession,
                        )
                        return
                    }

                    if (
                        event ===
                            'SIGNED_IN' ||
                        event ===
                            'INITIAL_SESSION' ||
                        event ===
                            'USER_UPDATED'
                    ) {
                        void loadProfile(
                            activeSession,
                            !profileRef.current,
                        )
                    }
                },
            )

        return () => {
            isMountedRef.current = false
            authListener.subscription.unsubscribe()
        }
    }, [loadProfile])

    const handleLogout =
        useCallback(async () => {
            await supabase.auth.signOut()

            loadedUserIdRef.current =
                null
            profileRequestRef.current =
                null
            profileRef.current =
                null

            setSession(null)
            setProfile(null)
            setAccessError('')

            navigate('/admin')
        }, [navigate])

    if (isLoading) {
        return (
            <section className="section adminSection">
                <div className="container">
                    <p className="muted">
                        Verifying administrator
                        access...
                    </p>
                </div>
            </section>
        )
    }

    if (session && accessError) {
        return (
            <section className="adminLoginPage">
                <div className="adminLoginCard">
                    <h2>
                        Access unavailable
                    </h2>

                    <p className="formError">
                        {accessError}
                    </p>

                    <button
                        className="btn primary"
                        type="button"
                        onClick={() =>
                            void handleLogout()
                        }
                    >
                        Return to sign in
                    </button>
                </div>
            </section>
        )
    }

    if (session && profile) {
        return (
            <OrganisationProvider
                profile={profile}
            >
                <AdminThemeBridge>
                    <CompetitionProvider>
                        <AdminPortal
                            profile={profile}
                            onLogout={
                                handleLogout
                            }
                        />
                    </CompetitionProvider>
                </AdminThemeBridge>
            </OrganisationProvider>
        )
    }

    return (
        <AdminLogin
            onLoginSuccess={() => {
                setIsLoading(true)

                void supabase.auth
                    .getSession()
                    .then(
                        ({
                             data,
                             error,
                         }) => {
                            if (
                                error ||
                                !data.session
                            ) {
                                setAccessError(
                                    'Login succeeded, but the session could not be loaded.',
                                )
                                setIsLoading(
                                    false,
                                )
                                return
                            }

                            setSession(
                                data.session,
                            )

                            void loadProfile(
                                data.session,
                                true,
                            )
                        },
                    )
            }}
        />
    )
}
