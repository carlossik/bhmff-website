import {
    useEffect,
    useState,
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
import { OrganisationProvider } from '../context/OrganisationContext'
import { CompetitionProvider } from '../contexts/CompetitionContext'

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
    console.log('LOAD PROFILE START')
    async function loadProfile(
        activeSession: Session
    ) {
        setIsLoading(true)
        setAccessError('')

        try {
            const adminProfile =
                await getCurrentAdminProfile()
            console.log('PROFILE LOADED', adminProfile)
            console.log('SETTING SESSION')
            setSession(activeSession)
            console.log('SETTING PROFILE')
            setProfile(adminProfile)
        } catch (error) {
            console.error('LOAD PROFILE FAILED', error)
            setProfile(null)

            setAccessError(
                error instanceof Error
                    ? error.message
                    : 'Your administrator access could not be verified.'
            )
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        let isMounted = true

        supabase.auth
            .getSession()
            .then(({ data, error }) => {
                if (!isMounted) {
                    return
                }

                if (
                    error ||
                    !data.session
                ) {
                    setSession(null)
                    setProfile(null)
                    setIsLoading(false)
                    return
                }

                void loadProfile(
                    data.session
                )
            })

        const {
            data: authListener,
        } =
            supabase.auth.onAuthStateChange(
                (
                    event,
                    activeSession
                ) => {
                    if (!isMounted) {
                        return
                    }

                    if (
                        event ===
                        'SIGNED_OUT' ||
                        !activeSession
                    ) {
                        setSession(null)
                        setProfile(null)
                        setAccessError('')
                        setIsLoading(false)
                        return
                    }

                    if (
                        event ===
                        'SIGNED_IN' ||
                        event ===
                        'TOKEN_REFRESHED'
                    ) {
                        void loadProfile(
                            activeSession
                        )
                    }
                }
            )

        return () => {
            isMounted = false
            authListener.subscription.unsubscribe()
        }
    }, [])

    async function handleLogout() {
        await supabase.auth.signOut()
        setSession(null)
        setProfile(null)
        setAccessError('')
        navigate('/admin')
    }

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
                <CompetitionProvider>
                    <AdminPortal
                        profile={profile}
                        onLogout={() =>
                            void handleLogout()
                        }
                    />
                </CompetitionProvider>
            </OrganisationProvider>
        )
    }

    return (
        <AdminLogin
            onLoginSuccess={() => {
                setIsLoading(true)

                supabase.auth
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
                                    'Login succeeded, but the session could not be loaded.'
                                )
                                setIsLoading(
                                    false
                                )
                                return
                            }

                            void loadProfile(
                                data.session
                            )
                        }
                    )
            }}
        />
    )
}