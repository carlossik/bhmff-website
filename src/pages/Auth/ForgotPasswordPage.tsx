import {
    FormEvent,
    useState,
} from 'react'
import { CkefaLogo } from '../../components/CkefaLogo'
import { supabase } from '../../lib/supabaseClient'

function getInitialEmail(): string {
    if (typeof window === 'undefined') {
        return ''
    }

    return (
        new URLSearchParams(window.location.search)
            .get('email') ?? ''
    )
}

export function ForgotPasswordPage() {
    const [email, setEmail] =
        useState(getInitialEmail)

    const [isSending, setIsSending] =
        useState(false)

    const [errorMessage, setErrorMessage] =
        useState('')

    const [successMessage, setSuccessMessage] =
        useState('')

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()
        setErrorMessage('')
        setSuccessMessage('')
        setIsSending(true)

        try {
            const redirectUrl = new URL(
                '/admin/reset-password',
                window.location.origin
            )

            redirectUrl.searchParams.set(
                'recovery',
                'true'
            )

            const { error } =
                await supabase.auth.resetPasswordForEmail(
                    email.trim(),
                    {
                        redirectTo:
                            redirectUrl.toString(),
                    }
                )

            if (error) {
                throw error
            }

            /*
             * Keep this deliberately generic so the screen does
             * not reveal whether an email address is registered.
             */
            setSuccessMessage(
                'If a TournamentHQ account exists for that email address, a password reset link has been sent. Check your inbox and spam folder.'
            )
        } catch (error) {
            console.error(
                'Unable to request a TournamentHQ password reset:',
                error
            )

            setErrorMessage(
                'TournamentHQ could not send the reset email right now. Please try again shortly.'
            )
        } finally {
            setIsSending(false)
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
                        Reset your password
                    </h2>

                    <p>
                        Enter the email address used for your
                        TournamentHQ account. We will send a
                        secure link that allows you to choose a
                        new password.
                    </p>
                </div>

                <div className="adminLoginCard">
                    <h3>Forgot password?</h3>

                    <p>
                        We will send password-reset instructions
                        to your registered email address.
                    </p>

                    <form
                        className="adminLoginForm"
                        onSubmit={handleSubmit}
                    >
                        <label>
                            Email address

                            <input
                                type="email"
                                value={email}
                                autoComplete="email"
                                required
                                onChange={(event) =>
                                    setEmail(
                                        event.target.value
                                    )
                                }
                            />
                        </label>

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
                            disabled={isSending}
                        >
                            {isSending
                                ? 'Sending reset link...'
                                : 'Send reset link'}
                        </button>

                        <a
                            className="adminAuthLink adminAuthLinkCentered"
                            href="/admin"
                        >
                            Return to Sign In
                        </a>
                    </form>
                </div>
            </div>
        </section>
    )
}
