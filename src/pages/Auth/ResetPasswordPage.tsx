import {
    FormEvent,
    useEffect,
    useState,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import {
    Eye,
    EyeOff,
} from 'lucide-react'
import { CkefaLogo } from '../../components/CkefaLogo'
import { supabase } from '../../lib/supabaseClient'

const RECOVERY_SESSION_TIMEOUT_MS = 6000
const RECOVERY_SESSION_POLL_MS = 150

function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds)
    })
}

function isAuthSessionMissingError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false
    }

    return (
        error.name === 'AuthSessionMissingError' ||
        error.message === 'Auth session missing!'
    )
}

async function waitForRecoverySession(): Promise<Session | null> {
    const startedAt = Date.now()

    while (
        Date.now() - startedAt <
        RECOVERY_SESSION_TIMEOUT_MS
    ) {
        const {
            data: { session },
            error,
        } = await supabase.auth.getSession()

        if (session) {
            return session
        }

        if (
            error &&
            !isAuthSessionMissingError(error)
        ) {
            throw error
        }

        await sleep(RECOVERY_SESSION_POLL_MS)
    }

    return null
}

function getRecoveryParameters() {
    const searchParams = new URLSearchParams(
        window.location.search
    )

    const hashParams = new URLSearchParams(
        window.location.hash.startsWith('#')
            ? window.location.hash.slice(1)
            : window.location.hash
    )

    return {
        code: searchParams.get('code'),
        accessToken:
            hashParams.get('access_token'),
        refreshToken:
            hashParams.get('refresh_token'),
        isRecovery:
            searchParams.get('recovery') === 'true' ||
            searchParams.get('type') === 'recovery' ||
            hashParams.get('type') === 'recovery',
        authError:
            searchParams.get('error_description') ??
            hashParams.get('error_description') ??
            searchParams.get('error') ??
            hashParams.get('error'),
    }
}

function cleanRecoveryUrl() {
    const url = new URL(window.location.href)

    url.searchParams.delete('code')
    url.searchParams.delete('error')
    url.searchParams.delete('error_code')
    url.searchParams.delete('error_description')
    url.searchParams.delete('type')
    url.hash = ''

    window.history.replaceState(
        {},
        document.title,
        `${url.pathname}${url.search}`
    )
}

function validatePassword(password: string): string | null {
    if (password.length < 10) {
        return 'Your password must contain at least 10 characters.'
    }

    if (!/[A-Z]/.test(password)) {
        return 'Your password must include at least one uppercase letter.'
    }

    if (!/[a-z]/.test(password)) {
        return 'Your password must include at least one lowercase letter.'
    }

    if (!/\d/.test(password)) {
        return 'Your password must include at least one number.'
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
        return 'Your password must include at least one special character.'
    }

    return null
}

export function ResetPasswordPage() {
    const [password, setPassword] =
        useState('')

    const [confirmPassword, setConfirmPassword] =
        useState('')

    const [showPassword, setShowPassword] =
        useState(false)

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false)

    const [isCheckingLink, setIsCheckingLink] =
        useState(true)

    const [hasRecoverySession, setHasRecoverySession] =
        useState(false)

    const [isSaving, setIsSaving] =
        useState(false)

    const [errorMessage, setErrorMessage] =
        useState('')

    const [successMessage, setSuccessMessage] =
        useState('')

    useEffect(() => {
        let isMounted = true

        async function establishRecoverySession(): Promise<Session> {
            const {
                code,
                accessToken,
                refreshToken,
                isRecovery,
                authError,
            } = getRecoveryParameters()

            if (authError) {
                throw new Error(
                    decodeURIComponent(authError)
                )
            }

            let session: Session | null = null

            if (code) {
                try {
                    const {
                        data,
                        error,
                    } =
                        await supabase.auth.exchangeCodeForSession(
                            code
                        )

                    if (error) {
                        throw error
                    }

                    session = data.session
                } catch (error) {
                    if (!isAuthSessionMissingError(error)) {
                        throw error
                    }

                    session =
                        await waitForRecoverySession()
                }
            } else if (
                accessToken &&
                refreshToken
            ) {
                try {
                    const {
                        data,
                        error,
                    } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    })

                    if (error) {
                        throw error
                    }

                    session = data.session
                } catch (error) {
                    if (!isAuthSessionMissingError(error)) {
                        throw error
                    }

                    session =
                        await waitForRecoverySession()
                }
            } else if (isRecovery) {
                /*
                 * detectSessionInUrl may establish the recovery
                 * session before this component mounts.
                 */
                session = await waitForRecoverySession()
            } else {
                throw new Error(
                    'This password reset link is invalid or has expired. Request a new reset email and try again.'
                )
            }

            if (!session) {
                throw new Error(
                    'TournamentHQ could not establish a secure password reset session. The link may have expired or already been used.'
                )
            }

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser(
                session.access_token
            )

            if (userError || !user) {
                throw new Error(
                    'TournamentHQ could not verify the account attached to this reset link.'
                )
            }

            return session
        }

        async function initialiseRecovery() {
            setIsCheckingLink(true)
            setHasRecoverySession(false)
            setErrorMessage('')

            try {
                await establishRecoverySession()

                if (!isMounted) {
                    return
                }

                cleanRecoveryUrl()
                setHasRecoverySession(true)
            } catch (error) {
                if (!isMounted) {
                    return
                }

                await supabase.auth.signOut({
                    scope: 'local',
                })

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'The password reset link could not be verified.'
                )
            } finally {
                if (isMounted) {
                    setIsCheckingLink(false)
                }
            }
        }

        void initialiseRecovery()

        return () => {
            isMounted = false
        }
    }, [])

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()
        setErrorMessage('')
        setSuccessMessage('')

        if (!hasRecoverySession) {
            setErrorMessage(
                'This password reset session has not been verified. Request a new reset email and try again.'
            )
            return
        }

        const validationError =
            validatePassword(password)

        if (validationError) {
            setErrorMessage(validationError)
            return
        }

        if (password !== confirmPassword) {
            setErrorMessage(
                'The passwords do not match.'
            )
            return
        }

        setIsSaving(true)

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser()

            if (userError || !user) {
                throw new Error(
                    'Your secure reset session has expired. Request a new password reset email and try again.'
                )
            }

            const { error } =
                await supabase.auth.updateUser({
                    password,
                })

            if (error) {
                throw error
            }

            setSuccessMessage(
                'Your password has been changed successfully. Redirecting you to sign in...'
            )

            await supabase.auth.signOut({
                scope: 'local',
            })

            window.setTimeout(() => {
                window.location.replace('/admin')
            }, 1200)
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'TournamentHQ could not update your password.'
            )
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <section className="adminLoginPage">
            <div className="adminLoginShell">
                <div className="adminLoginIntro">
                    <CkefaLogo className="adminLoginLogo" />

                    <span className="eyebrow">
                        Secure account recovery
                    </span>

                    <h2>
                        Choose a new password
                    </h2>

                    <p>
                        Create a new secure password for your
                        TournamentHQ account. When complete,
                        you will return to the normal sign-in
                        screen.
                    </p>
                </div>

                <div className="adminLoginCard">
                    <h3>Reset password</h3>

                    {isCheckingLink ? (
                        <p>
                            Verifying your secure reset link...
                        </p>
                    ) : !hasRecoverySession ? (
                        <>
                            <p className="formError">
                                {errorMessage ||
                                    'This password reset link is invalid or has expired.'}
                            </p>

                            <a
                                className="btn secondary adminLoginButton"
                                href="/admin/forgot-password"
                            >
                                Request a new reset link
                            </a>
                        </>
                    ) : (
                        <form
                            className="adminLoginForm"
                            onSubmit={handleSubmit}
                        >
                            <label>
                                New password

                                <span className="adminPasswordField">
                                    <input
                                        type={
                                            showPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={password}
                                        autoComplete="new-password"
                                        required
                                        minLength={10}
                                        onChange={(event) =>
                                            setPassword(
                                                event.target.value
                                            )
                                        }
                                    />

                                    <button
                                        type="button"
                                        className="adminPasswordToggle"
                                        onClick={() =>
                                            setShowPassword(
                                                (current) => !current
                                            )
                                        }
                                        aria-label={
                                            showPassword
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                        title={
                                            showPassword
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff size={20} />
                                        ) : (
                                            <Eye size={20} />
                                        )}
                                    </button>
                                </span>
                            </label>

                            <label>
                                Confirm password

                                <span className="adminPasswordField">
                                    <input
                                        type={
                                            showConfirmPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={confirmPassword}
                                        autoComplete="new-password"
                                        required
                                        minLength={10}
                                        onChange={(event) =>
                                            setConfirmPassword(
                                                event.target.value
                                            )
                                        }
                                    />

                                    <button
                                        type="button"
                                        className="adminPasswordToggle"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                (current) => !current
                                            )
                                        }
                                        aria-label={
                                            showConfirmPassword
                                                ? 'Hide confirmation password'
                                                : 'Show confirmation password'
                                        }
                                        title={
                                            showConfirmPassword
                                                ? 'Hide confirmation password'
                                                : 'Show confirmation password'
                                        }
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff size={20} />
                                        ) : (
                                            <Eye size={20} />
                                        )}
                                    </button>
                                </span>
                            </label>

                            <p className="muted">
                                Use at least 10 characters,
                                including uppercase, lowercase,
                                a number and a special character.
                            </p>

                            {errorMessage && (
                                <p className="formError">
                                    {errorMessage}
                                </p>
                            )}

                            {successMessage && (
                                <p className="formSuccess">
                                    {successMessage}
                                </p>
                            )}

                            <button
                                className="btn primary adminLoginButton"
                                type="submit"
                                disabled={
                                    isSaving ||
                                    Boolean(successMessage)
                                }
                            >
                                {isSaving
                                    ? 'Updating password...'
                                    : 'Update password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </section>
    )
}
