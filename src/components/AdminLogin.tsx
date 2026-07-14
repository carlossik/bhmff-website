import {
    FormEvent,
    useState,
} from 'react'
import { login } from '../services/login'
import { CkefaLogo } from './CkefaLogo'

type AdminLoginProps = {
    onLoginSuccess: () => void
}

export function AdminLogin({
                               onLoginSuccess,
                           }: AdminLoginProps) {
    const [email, setEmail] =
        useState('')

    const [password, setPassword] =
        useState('')

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('')

    const [isLoading, setIsLoading] =
        useState(false)

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()
        setErrorMessage('')
        setIsLoading(true)

        try {
            await login(
                email.trim(),
                password
            )

            onLoginSuccess()
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Login failed'
            )
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <section
            id="admin"
            className="adminLoginPage"
        >
            <div className="adminLoginShell">
                <div className="adminLoginIntro">
                    <CkefaLogo className="adminLoginLogo" />

                    <span className="eyebrow">
                        Secure organiser access
                    </span>

                    <h2>
                        Competition Admin Portal
                    </h2>

                    <p>
                        Authorised users receive access
                        based on their operational role,
                        including match-day reporting,
                        competition management or full
                        platform administration.
                    </p>
                </div>

                <div className="adminLoginCard">
                    <h3>Sign in</h3>

                    <p>
                        Use your authorised account to
                        continue.
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        className="adminLoginForm"
                    >
                        <label>
                            Email address

                            <input
                                type="email"
                                value={email}
                                autoComplete="email"
                                onChange={(event) =>
                                    setEmail(
                                        event.target
                                            .value
                                    )
                                }
                                required
                            />
                        </label>

                        <label>
                            Password

                            <input
                                type="password"
                                value={password}
                                autoComplete="current-password"
                                onChange={(event) =>
                                    setPassword(
                                        event.target
                                            .value
                                    )
                                }
                                required
                            />
                        </label>

                        {errorMessage && (
                            <p className="formError">
                                {errorMessage}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="btn primary adminLoginButton"
                            disabled={isLoading}
                        >
                            {isLoading
                                ? 'Signing in...'
                                : 'Sign in'}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    )
}