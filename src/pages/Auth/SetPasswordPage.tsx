import {
    FormEvent,
    useEffect,
    useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type {
    Session,
    User,
} from '@supabase/supabase-js'
import { CkefaLogo } from '../../components/CkefaLogo'
import { supabase } from '../../lib/supabaseClient'

const ORGANISATION_STORAGE_KEY =
    'tournamenthq-current-organisation'

type OrganisationDetails = {
    id: string
    name: string
}

type MembershipDetails = {
    organisationId: string
    organisationName: string
    role: string
}

type MembershipRow = {
    organisation_id: string
    role: string
    active: boolean
    created_at: string | null
    organisations:
        | {
        id: string
        name: string
    }
        | {
        id: string
        name: string
    }[]
        | null
}

function formatRole(role: string): string {
    return role
        .split('_')
        .map((word) => {
            if (!word) {
                return word
            }

            return (
                word.charAt(0).toUpperCase() +
                word.slice(1)
            )
        })
        .join(' ')
}

function getOrganisation(
    value: MembershipRow['organisations']
): OrganisationDetails | null {
    if (!value) {
        return null
    }

    if (Array.isArray(value)) {
        return value[0] ?? null
    }

    return value
}

function getOrganisationIdFromUrl(): string | null {
    const searchParams = new URLSearchParams(
        window.location.search
    )

    return (
        searchParams.get('organisationId') ??
        searchParams.get('organizationId')
    )
}

function getInvitationParameters() {
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
        isInvitation:
            searchParams.get('invitation') === 'true',
        authError:
            searchParams.get('error_description') ??
            hashParams.get('error_description') ??
            searchParams.get('error') ??
            hashParams.get('error'),
    }
}

function removeAuthParametersFromAddressBar() {
    const url = new URL(window.location.href)

    url.searchParams.delete('code')
    url.searchParams.delete('error')
    url.searchParams.delete('error_code')
    url.searchParams.delete('error_description')

    url.hash = ''

    window.history.replaceState(
        {},
        document.title,
        `${url.pathname}${url.search}`
    )
}

export function SetPasswordPage() {
    const navigate = useNavigate()

    const [password, setPassword] =
        useState('')

    const [confirmPassword, setConfirmPassword] =
        useState('')

    const [isCheckingLink, setIsCheckingLink] =
        useState(true)

    const [hasValidInvitation, setHasValidInvitation] =
        useState(false)

    const [invitedUser, setInvitedUser] =
        useState<User | null>(null)

    const [membership, setMembership] =
        useState<MembershipDetails | null>(null)

    const [isSaving, setIsSaving] =
        useState(false)

    const [errorMessage, setErrorMessage] =
        useState('')

    const [successMessage, setSuccessMessage] =
        useState('')

    useEffect(() => {
        let isMounted = true

        async function loadMembership(
            user: User,
            requestedOrganisationId: string | null
        ): Promise<MembershipDetails> {
            let query = supabase
                .from('organisation_memberships')
                .select(`
                    organisation_id,
                    role,
                    active,
                    created_at,
                    organisations (
                        id,
                        name
                    )
                `)
                .eq('user_id', user.id)
                .eq('active', true)

            if (requestedOrganisationId) {
                query = query.eq(
                    'organisation_id',
                    requestedOrganisationId
                )
            }

            const {
                data,
                error,
            } = await query.order(
                'created_at',
                {
                    ascending: false,
                }
            )

            if (error) {
                throw new Error(
                    'Your organisation access could not be verified.'
                )
            }

            const memberships =
                (data ?? []) as unknown as MembershipRow[]

            if (memberships.length === 0) {
                throw new Error(
                    requestedOrganisationId
                        ? 'This invitation does not provide access to the selected organisation.'
                        : 'No active TournamentHQ organisation membership was found for this account.'
                )
            }

            /*
             * The organisation ID should normally be supplied
             * in the invitation redirect URL.
             *
             * For older invitation links without it, a brand-new
             * user will normally have only one membership, so that
             * membership is used as a safe fallback.
             */
            if (
                !requestedOrganisationId &&
                memberships.length > 1
            ) {
                throw new Error(
                    'This invitation does not identify which organisation you are joining. Ask the administrator to send a new invitation.'
                )
            }

            const selectedMembership =
                memberships[0]

            const organisation = getOrganisation(
                selectedMembership.organisations
            )

            if (!organisation) {
                throw new Error(
                    'The organisation attached to this invitation could not be loaded.'
                )
            }

            return {
                organisationId:
                selectedMembership.organisation_id,
                organisationName:
                organisation.name,
                role: selectedMembership.role,
            }
        }

        async function establishInvitationSession(): Promise<{
            session: Session
            user: User
        }> {
            const {
                code,
                accessToken,
                refreshToken,
                authError,
                isInvitation,
            } = getInvitationParameters()

            if (authError) {
                throw new Error(
                    decodeURIComponent(authError)
                )
            }

            const hasPkceCode = Boolean(code)

            const hasImplicitTokens = Boolean(
                accessToken && refreshToken
            )

            /*
             * Never accept a session that merely happens to
             * exist in the browser.
             *
             * The page must contain authentication evidence
             * originating from the invitation link.
             */
            if (
                !hasPkceCode &&
                !hasImplicitTokens
            ) {
                if (!isInvitation) {
                    throw new Error(
                        'This invitation link is invalid, has expired or has already been used. Ask an administrator to send a new invitation.'
                    )
                }

                const {
                    data: { session },
                } = await supabase.auth.getSession()

                if (!session) {
                    throw new Error(
                        'This invitation link is invalid, has expired or has already been used. Ask an administrator to send a new invitation.'
                    )
                }

                return {
                    session,
                    user: session.user,
                }
            }

            /*
             * Remove the previous browser user's local session
             * before activating the invited account.
             */
            const { error: signOutError } =
                await supabase.auth.signOut({
                    scope: 'local',
                })

            if (signOutError) {
                console.warn(
                    'Unable to clear the previous local session:',
                    signOutError.message
                )
            }

            let session: Session | null = null

            if (code) {
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
            } else if (
                accessToken &&
                refreshToken
            ) {
                const {
                    data,
                    error,
                } =
                    await supabase.auth.setSession({
                        access_token:
                        accessToken,
                        refresh_token:
                        refreshToken,
                    })

                if (error) {
                    throw error
                }

                session = data.session
            }

            if (!session) {
                throw new Error(
                    'TournamentHQ could not establish the invited account session.'
                )
            }

            /*
             * getUser() validates the access token against the
             * Supabase Auth server instead of relying only on
             * locally stored session data.
             */
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser(
                session.access_token
            )

            if (userError || !user) {
                throw new Error(
                    'The invited account could not be verified.'
                )
            }

            return {
                session,
                user,
            }
        }

        async function initialiseInvitation() {
            setIsCheckingLink(true)
            setErrorMessage('')
            setHasValidInvitation(false)

            const requestedOrganisationId =
                getOrganisationIdFromUrl()

            try {
                /*
                 * Clear the organisation selected by whoever
                 * previously used this browser.
                 */
                window.localStorage.removeItem(
                    ORGANISATION_STORAGE_KEY
                )

                const {
                    user,
                } =
                    await establishInvitationSession()

                const membershipDetails =
                    await loadMembership(
                        user,
                        requestedOrganisationId
                    )

                if (!isMounted) {
                    return
                }

                window.localStorage.setItem(
                    ORGANISATION_STORAGE_KEY,
                    membershipDetails.organisationId
                )

                setInvitedUser(user)
                setMembership(
                    membershipDetails
                )
                setHasValidInvitation(true)

                /*
                 * Remove tokens and codes from the visible URL
                 * once they have been consumed.
                 */
                removeAuthParametersFromAddressBar()
            } catch (error) {
                if (!isMounted) {
                    return
                }

                /*
                 * Do not leave a partially established or
                 * unrelated session active after validation fails.
                 */
                await supabase.auth.signOut({
                    scope: 'local',
                })

                window.localStorage.removeItem(
                    ORGANISATION_STORAGE_KEY
                )

                setInvitedUser(null)
                setMembership(null)
                setHasValidInvitation(false)

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'The invitation could not be verified.'
                )
            } finally {
                if (isMounted) {
                    setIsCheckingLink(false)
                }
            }
        }

        void initialiseInvitation()

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

        if (
            !hasValidInvitation ||
            !invitedUser ||
            !membership
        ) {
            setErrorMessage(
                'This invitation has not been verified. Ask an administrator to send a new invitation.'
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
            /*
             * Verify the currently authenticated user again
             * immediately before changing the password.
             */
            const {
                data: { user: currentUser },
                error: userError,
            } = await supabase.auth.getUser()

            if (
                userError ||
                !currentUser ||
                currentUser.id !== invitedUser.id
            ) {
                throw new Error(
                    'The authenticated account no longer matches this invitation. Open a new invitation link and try again.'
                )
            }

            const {
                data,
                error,
            } =
                await supabase.auth.updateUser({
                    password,
                })

            if (error) {
                throw error
            }

            if (
                !data.user ||
                data.user.id !== invitedUser.id
            ) {
                throw new Error(
                    'TournamentHQ could not confirm which account was updated.'
                )
            }

            /*
             * Store the invited organisation again in case
             * another application component changed storage
             * while the password form was open.
             */
            window.localStorage.setItem(
                ORGANISATION_STORAGE_KEY,
                membership.organisationId
            )

            setSuccessMessage(
                `Your account for ${membership.organisationName} has been activated successfully. Redirecting to TournamentHQ...`
            )

            window.setTimeout(() => {
                window.location.replace('/admin')
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
                        Welcome to TournamentHQ
                    </h2>

                    {membership ? (
                        <p>
                            You have been invited to join{' '}
                            <strong>
                                {
                                    membership.organisationName
                                }
                            </strong>{' '}
                            as a{' '}
                            <strong>
                                {formatRole(
                                    membership.role
                                )}
                            </strong>
                            .
                        </p>
                    ) : (
                        <p>
                            Complete your TournamentHQ
                            account setup by choosing a
                            secure password.
                        </p>
                    )}
                </div>

                <div className="adminLoginCard">
                    <h3>Create your password</h3>

                    {isCheckingLink ? (
                        <p>
                            Verifying your secure
                            invitation...
                        </p>
                    ) : !hasValidInvitation ? (
                        <>
                            <p className="formError">
                                {errorMessage ||
                                    'This invitation link is invalid or has expired.'}
                            </p>

                            <button
                                className="btn secondary adminLoginButton"
                                type="button"
                                onClick={() => {
                                    window.location.replace(
                                        '/admin'
                                    )
                                }}
                            >
                                Return to Sign In
                            </button>
                        </>
                    ) : (
                        <form
                            className="adminLoginForm"
                            onSubmit={handleSubmit}
                        >
                            {invitedUser?.email && (
                                <label>
                                    Email address

                                    <input
                                        type="email"
                                        value={
                                            invitedUser.email
                                        }
                                        readOnly
                                        disabled
                                    />
                                </label>
                            )}

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
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label>
                                Confirm password

                                <input
                                    type="password"
                                    value={
                                        confirmPassword
                                    }
                                    autoComplete="new-password"
                                    required
                                    minLength={10}
                                    onChange={(event) =>
                                        setConfirmPassword(
                                            event.target
                                                .value
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
                                    Boolean(
                                        successMessage
                                    )
                                }
                            >
                                {isSaving
                                    ? 'Activating Account...'
                                    : 'Activate Account'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </section>
    )
}