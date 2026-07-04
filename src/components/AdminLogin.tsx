import { FormEvent, useState } from 'react'
import { login } from '../services/login'

type AdminLoginProps = {
    onLoginSuccess: () => void
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setErrorMessage('')
        setIsLoading(true)

        try {
            await login(email, password)
            onLoginSuccess()
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Login failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="adminLoginCard">
            <h2>Admin Login</h2>
            <p>Sign in to manage the festival platform.</p>

            <form onSubmit={handleSubmit} className="adminLoginForm">
                <label>
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                </label>

                <label>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                </label>

                {errorMessage && <p className="formError">{errorMessage}</p>}

                <button type="submit" className="btn primary" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>
        </div>
    )
}