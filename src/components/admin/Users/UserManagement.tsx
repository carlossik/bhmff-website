import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { Modal } from '../../common/Modal'
import { Toast } from '../../common/Toast'
import {
    formatAdminRole,
    type AdminProfile,
    type AdminRole,
} from '../../../services/accessControl'
import { userService } from './userService'
import type {
    AdminUser,
    UserAccessFormValues,
} from './userTypes'

const roleOptions: Array<{
    value: AdminRole
    label: string
    description: string
}> = [
    {
        value: 'match_official',
        label: 'Match Official',
        description:
            'Can manage match results and goals.',
    },
    {
        value: 'competition_manager',
        label: 'Competition Manager',
        description:
            'Can manage the competition, fixtures and media.',
    },
    {
        value: 'super_admin',
        label: 'Super Admin',
        description:
            'Full platform, commercial and user-access control.',
    },
]

type UserManagementProps = {
    currentProfile: AdminProfile
}

function formatDate(value: string) {
    return new Date(value).toLocaleString(
        'en-GB',
        {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }
    )
}

export function UserManagement({
                                   currentProfile,
                               }: UserManagementProps) {
    const [users, setUsers] =
        useState<AdminUser[]>([])

    const [editingUser, setEditingUser] =
        useState<AdminUser | null>(null)

    const [formValues, setFormValues] =
        useState<UserAccessFormValues>({
            fullName: '',
            role: 'match_official',
            active: false,
        })

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [toastMessage, setToastMessage] =
        useState('')

    const [toastType, setToastType] =
        useState<
            'success' | 'error' | 'info'
        >('success')

    const loadUsers =
        useCallback(async () => {
            setLoading(true)

            try {
                setUsers(
                    await userService.getUsers()
                )
            } catch (error) {
                setToastType('error')
                setToastMessage(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load users.'
                )
            } finally {
                setLoading(false)
            }
        }, [])

    useEffect(() => {
        void loadUsers()
    }, [loadUsers])

    const stats = useMemo(
        () => [
            {
                label: 'Administrators',
                value: users.length,
            },
            {
                label: 'Active',
                value: users.filter(
                    (user) => user.active
                ).length,
            },
            {
                label: 'Competition Managers',
                value: users.filter(
                    (user) =>
                        user.role ===
                        'competition_manager'
                ).length,
            },
            {
                label: 'Match Officials',
                value: users.filter(
                    (user) =>
                        user.role ===
                        'match_official'
                ).length,
            },
        ],
        [users]
    )

    function openEditUser(
        user: AdminUser
    ) {
        setEditingUser(user)

        setFormValues({
            fullName:
                user.full_name ?? '',
            role: user.role,
            active: user.active,
        })
    }

    function closeModal() {
        if (saving) {
            return
        }

        setEditingUser(null)
    }

    async function saveUser() {
        if (!editingUser) {
            return
        }

        if (
            editingUser.id ===
            currentProfile.id
        ) {
            setToastType('error')
            setToastMessage(
                'You cannot change your own role or account status from this screen.'
            )
            return
        }

        setSaving(true)

        try {
            await userService.updateUser(
                editingUser.id,
                formValues
            )

            setEditingUser(null)
            await loadUsers()

            setToastType('success')
            setToastMessage(
                'User access updated successfully.'
            )
        } catch (error) {
            setToastType('error')
            setToastMessage(
                error instanceof Error
                    ? error.message
                    : 'Failed to update user access.'
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <div>
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() =>
                    setToastMessage('')
                }
            />

            <div className="adminWorkspaceHeader">
                <div>
                    <h3>User Access</h3>

                    <p className="muted">
                        Review administrator accounts,
                        assign operational roles and
                        activate or deactivate access.
                    </p>
                </div>
            </div>

            <div className="statGrid adminStats">
                {stats.map((stat) => (
                    <div key={stat.label}>
                        <strong>
                            {stat.value}
                        </strong>

                        <span>
                            {stat.label}
                        </span>
                    </div>
                ))}
            </div>

            {loading ? (
                <p className="muted">
                    Loading administrator users...
                </p>
            ) : users.length ? (
                <div className="enquiriesGrid">
                    {users.map((user) => {
                        const isCurrentUser =
                            user.id ===
                            currentProfile.id

                        return (
                            <article
                                className="enquiryCard"
                                key={user.id}
                            >
                                <div className="enquiryCardHeader">
                                    <div>
                                        <div className="teamAdminBadges">
                                            <span className="teamVisibilityBadge teamVisibilityPublished">
                                                {formatAdminRole(
                                                    user.role
                                                )}
                                            </span>

                                            <span
                                                className={
                                                    user.active
                                                        ? 'teamVisibilityBadge teamVisibilityPublished'
                                                        : 'teamVisibilityBadge teamVisibilityHidden'
                                                }
                                            >
                                                {user.active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>

                                            {isCurrentUser && (
                                                <span className="badge">
                                                    You
                                                </span>
                                            )}
                                        </div>

                                        <h4>
                                            {user.full_name ??
                                                'Unnamed administrator'}
                                        </h4>
                                    </div>

                                    <span className="muted enquiryDate">
                                        Created{' '}
                                        {formatDate(
                                            user.created_at
                                        )}
                                    </span>
                                </div>

                                <div className="enquirySummaryGrid">
                                    <div>
                                        <span className="teamAdminFieldLabel">
                                            Email
                                        </span>

                                        <span>
                                            {user.email ??
                                                'Not available'}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="teamAdminFieldLabel">
                                            Role
                                        </span>

                                        <strong>
                                            {formatAdminRole(
                                                user.role
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span className="teamAdminFieldLabel">
                                            Status
                                        </span>

                                        <span>
                                            {user.active
                                                ? 'Access enabled'
                                                : 'Access disabled'}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="teamAdminFieldLabel">
                                            Last Updated
                                        </span>

                                        <span>
                                            {formatDate(
                                                user.updated_at
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="teamAdminCardActions">
                                    <button
                                        className="btn secondary small"
                                        type="button"
                                        disabled={
                                            isCurrentUser
                                        }
                                        title={
                                            isCurrentUser
                                                ? 'Your own access cannot be changed here.'
                                                : undefined
                                        }
                                        onClick={() =>
                                            openEditUser(
                                                user
                                            )
                                        }
                                    >
                                        Edit Access
                                    </button>
                                </div>
                            </article>
                        )
                    })}
                </div>
            ) : (
                <div className="teamsEmptyState">
                    <h3>
                        No administrator users
                    </h3>

                    <p>
                        Administrator profiles will
                        appear here after users are
                        created in Supabase Auth.
                    </p>
                </div>
            )}

            {editingUser && (
                <Modal
                    title="Edit User Access"
                    onClose={closeModal}
                >
                    <div className="adminFormGrid">
                        <label>
                            <span>Full Name</span>

                            <input
                                value={
                                    formValues.fullName
                                }
                                maxLength={150}
                                onChange={(event) =>
                                    setFormValues(
                                        (current) => ({
                                            ...current,
                                            fullName:
                                            event
                                                .target
                                                .value,
                                        })
                                    )
                                }
                            />
                        </label>

                        <label>
                            <span>Email</span>

                            <input
                                value={
                                    editingUser.email ??
                                    ''
                                }
                                disabled
                            />
                        </label>

                        <label>
                            <span>Role</span>

                            <select
                                value={
                                    formValues.role
                                }
                                onChange={(event) =>
                                    setFormValues(
                                        (current) => ({
                                            ...current,
                                            role: event
                                                .target
                                                .value as AdminRole,
                                        })
                                    )
                                }
                            >
                                {roleOptions.map(
                                    (role) => (
                                        <option
                                            key={
                                                role.value
                                            }
                                            value={
                                                role.value
                                            }
                                        >
                                            {
                                                role.label
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </label>

                        <label className="adminCheckboxLabel">
                            <input
                                type="checkbox"
                                checked={
                                    formValues.active
                                }
                                onChange={(event) =>
                                    setFormValues(
                                        (current) => ({
                                            ...current,
                                            active:
                                            event
                                                .target
                                                .checked,
                                        })
                                    )
                                }
                            />

                            <span>
                                Account is active
                            </span>
                        </label>

                        <div className="adminFormFullWidth">
                            <span className="teamAdminFieldLabel">
                                Role Description
                            </span>

                            <p className="muted">
                                {
                                    roleOptions.find(
                                        (role) =>
                                            role.value ===
                                            formValues.role
                                    )?.description
                                }
                            </p>
                        </div>
                    </div>

                    <div className="modalActions">
                        <button
                            className="btn secondary"
                            type="button"
                            disabled={saving}
                            onClick={closeModal}
                        >
                            Cancel
                        </button>

                        <button
                            className="btn primary"
                            type="button"
                            disabled={saving}
                            onClick={() =>
                                void saveUser()
                            }
                        >
                            {saving
                                ? 'Saving...'
                                : 'Save Access'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    )
}