import {
    FormEvent,
    useEffect,
    useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { CkefaLogo } from '../../components/CkefaLogo'
import { supabase } from '../../lib/supabaseClient'

export function SetPasswordPage() {
    const navigate = useNavigate()

    const [password, setPassword] =
        useState('')

    const [confirmPassword, setConfirmPassword] =
        useState('')

    const [isCheckingLink, setIsCheckingLink] =
        useState(true)

    const [hasValidSession, setHasValidSession] =
        useState(false)

    const [isSaving, setIsSaving] =
        useState(false)

    const [errorMessage, setErrorMessage] =
        useState('')

    const [successMessage, setSuccessMessage] =
        useState('')

    useEffect(() => {
        let isMounted = true

        async function checkInvitationSession() {
            const {
                data: { session },
                error,
            } = await supabase.auth.getSession()

            if (!isMounted) {
                return
            }

            if (error) {
                setErrorMessage(
                    'The invitation link could not be verified.'
                )
            }

            setHasValidSession(Boolean(session))
            setIsCheckingLink(false)
        }

        void checkInvitationSession()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!isMounted) {
                    return
                }

                setHasValidSession(
                    Boolean(session)
                )

                if (session) {
                    setErrorMessage('')
                }

                setIsCheckingLink(false)
            }
        )

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [])

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()
        setErrorMessage('')
        setSuccessMessage('')

        if (!hasValidSession) {
            setErrorMessage(
                'This invitation link is invalid or has expired. Ask an administrator to send a new invitation.'
            )
            return
        }

        if (password.length < 10) {
            setErrorMessage(
                'Your password must contain at least 10 characters.'
            )
            return
        }

        if (!/[A-Z]/.test(password)) {
            setErrorMessage(
                'Your password must include at least one uppercase letter.'
            )
            return
        }

        if (!/[a-z]/.test(password)) {
            setErrorMessage(
                'Your password must include at least one lowercase letter.'
            )
            return
        }

        if (!/\d/.test(password)) {
            setErrorMessage(
                'Your password must include at least one number.'
            )
            return
        }

        if (!/[^A-Za-z0-9]/.test(password)) {
            setErrorMessage(
                'Your password must include at least one special character.'
            )
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
            const { error } =
                await supabase.auth.updateUser({
                    password,
                })

            if (error) {
                throw error
            }

            setSuccessMessage(
                'Your password has been created successfully. Redirecting to the administrator portal...'
            )

            window.setTimeout(() => {
                navigate('/admin', {
                    replace: true,
                })
            }, 1200)
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Unable to create your password.'
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
                        Secure account setup
                    </span>

                    <h2>
                        Create Your Password
                    </h2>

                    <p>
                        Complete your administrator
                        account setup by choosing a
                        secure password.
                    </p>
                </div>

                <div className="adminLoginCard">
                    <h3>Set password</h3>

                    {isCheckingLink ? (
                        <p>
                            Verifying your invitation...
                        </p>
                    ) : !hasValidSession ? (
                        <>
                            <p className="formError">
                                {errorMessage ||
                                    'This invitation link is invalid or has expired.'}
                            </p>

                            <button
                                className="btn secondary adminLoginButton"
                                type="button"
                                onClick={() =>
                                    navigate('/admin')
                                }
                            >
                                Return to Sign In
                            </button>
                        </>
                    ) : (
                        <form
                            className="adminLoginForm"
                            onSubmit={handleSubmit}
                        >
                            <label>
                                New password

                                <input
                                    type="password"
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
                            </label>

                            <label>
                                Confirm password

                                <input
                                    type="password"
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
                            </label>

                            <p className="muted">
                                Use at least 10 characters,
                                including uppercase,
                                lowercase, a number and a
                                special character.
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
                                    ? 'Saving...'
                                    : 'Create Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </section>
    )
}