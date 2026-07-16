import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "../../common/Modal";
import { Toast } from "../../common/Toast";
import {
    formatAdminRole,
    type AdminProfile,
    type AdminRole,
} from "../../../services/accessControl";
import { userService } from "./userService";
import "../../../styles/userManagement.css";
import type {
    AdminUser,
    InviteUserFormValues,
    UserAccessFormValues,
} from "./userTypes";

const roleOptions: Array<{
    value: AdminRole;
    label: string;
    description: string;
}> = [
    {
        value: "match_official",
        label: "Match Official",
        description: "Can manage match results and goals.",
    },
    {
        value: "competition_manager",
        label: "Competition Manager",
        description: "Can manage competitions, fixtures and media.",
    },
    {
        value: "super_admin",
        label: "Super Admin",
        description: "Full platform, commercial and user-access control.",
    },
];

const initialInviteForm: InviteUserFormValues = {
    fullName: "",
    email: "",
    role: "match_official",
};

type UserManagementProps = {
    currentProfile: AdminProfile;
};

function formatDate(value: string) {
    return new Date(value).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function UserManagement({ currentProfile }: UserManagementProps) {
    const [users, setUsers] = useState<AdminUser[]>([]);

    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

    const [showInviteModal, setShowInviteModal] = useState(false);

    const [formValues, setFormValues] = useState<UserAccessFormValues>({
        fullName: "",
        role: "match_official",
        active: false,
    });

    const [inviteValues, setInviteValues] =
        useState<InviteUserFormValues>(initialInviteForm);

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [toastMessage, setToastMessage] = useState("");

    const [toastType, setToastType] = useState<"success" | "error" | "info">(
        "success",
    );

    const loadUsers = useCallback(async () => {
        setLoading(true);

        try {
            setUsers(await userService.getUsers());
        } catch (error) {
            setToastType("error");
            setToastMessage(
                error instanceof Error ? error.message : "Failed to load users.",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const stats = useMemo(
        () => [
            {
                label: "Administrators",
                value: users.length,
            },
            {
                label: "Active",
                value: users.filter((user) => user.active).length,
            },
            {
                label: "Competition Managers",
                value: users.filter((user) => user.role === "competition_manager")
                    .length,
            },
            {
                label: "Match Officials",
                value: users.filter((user) => user.role === "match_official").length,
            },
        ],
        [users],
    );

    function openEditUser(user: AdminUser) {
        setEditingUser(user);

        setFormValues({
            fullName: user.full_name ?? "",
            role: user.role,
            active: user.active,
        });
    }

    function closeEditModal() {
        if (saving) {
            return;
        }

        setEditingUser(null);
    }

    function openInviteModal() {
        setInviteValues(initialInviteForm);
        setShowInviteModal(true);
    }

    function closeInviteModal() {
        if (saving) {
            return;
        }

        setShowInviteModal(false);
        setInviteValues(initialInviteForm);
    }

    async function inviteUser() {
        const fullName = inviteValues.fullName.trim();

        const email = inviteValues.email.trim().toLowerCase();

        if (!fullName) {
            setToastType("error");
            setToastMessage("Full name is required.");
            return;
        }

        if (!isValidEmail(email)) {
            setToastType("error");
            setToastMessage("Enter a valid email address.");
            return;
        }

        if (users.some((user) => user.email?.trim().toLowerCase() === email)) {
            setToastType("error");
            setToastMessage(
                "An administrator profile already exists for this email address.",
            );
            return;
        }

        setSaving(true);

        try {
            await userService.inviteUser({
                fullName,
                email,
                role: inviteValues.role,
                redirectUrl: `${window.location.origin}/admin/set-password`,
            });

            closeInviteModal();
            await loadUsers();

            setToastType("success");
            setToastMessage(`Invitation sent to ${email}.`);
        } catch (error) {
            setToastType("error");
            setToastMessage(
                error instanceof Error ? error.message : "Failed to invite the user.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function saveUser() {
        if (!editingUser) {
            return;
        }

        if (editingUser.id === currentProfile.id) {
            setToastType("error");
            setToastMessage(
                "You cannot change your own role or account status from this screen.",
            );
            return;
        }

        setSaving(true);

        try {
            await userService.updateUser(editingUser.id, formValues);

            setEditingUser(null);
            await loadUsers();

            setToastType("success");
            setToastMessage("User access updated successfully.");
        } catch (error) {
            setToastType("error");
            setToastMessage(
                error instanceof Error
                    ? error.message
                    : "Failed to update user access.",
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="userManagementPage">
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() => setToastMessage("")}
            />

            <div className="userManagementHeader">
                <div>
                    <span className="eyebrow">Administration</span>

                    <h2>User Management</h2>

                    <p>
                        Invite administrators, assign operational roles, reset passwords and
                        control platform access.
                    </p>
                </div>

                <button className="btn primary" type="button" onClick={openInviteModal}>
                    + Invite User
                </button>
            </div>

            <div className="userStatsGrid">
                {stats.map((stat) => (
                    <div className="userStatCard" key={stat.label}>
                        <span className="userStatLabel">{stat.label}</span>

                        <strong className="userStatValue">{stat.value}</strong>
                    </div>
                ))}
            </div>

            {loading ? (
                <p className="muted">Loading administrator users...</p>
            ) : users.length ? (
                <div className="userCardGrid">
                    {users.map((user) => {
                        const isCurrentUser = user.id === currentProfile.id;

                        const roleClass =
                            user.role === "super_admin"
                                ? "role-super"
                                : user.role === "competition_manager"
                                    ? "role-manager"
                                    : "role-official";

                        return (
                            <article className="userCard" key={user.id}>
                                <div className="userCardTop">
                                    <div>
                                        <div className="teamAdminBadges">
                      <span className={`roleBadge ${roleClass}`}>
                        {formatAdminRole(user.role)}
                      </span>

                                            <span
                                                className={`statusBadge ${
                                                    user.active ? "status-active" : "status-inactive"
                                                }`}
                                            >
                        {user.active ? "Active" : "Inactive"}
                      </span>

                                            {isCurrentUser && <span className="badge">You</span>}
                                        </div>

                                        <div className="userName">
                                            {user.full_name ?? "Unnamed administrator"}
                                        </div>

                                        <div className="userEmail">
                                            {user.email ?? "Email not available"}
                                        </div>
                                    </div>

                                    <div className="userAccessDetails">
                                        <div>
                                            <span className="teamAdminFieldLabel">Created</span>

                                            <span>{formatDate(user.created_at)}</span>
                                        </div>

                                        <div>
                                            <span className="teamAdminFieldLabel">Last Updated</span>

                                            <span>{formatDate(user.updated_at)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="userCardFooter">
                  <span className="muted">
                    {user.active
                        ? "Access is currently enabled."
                        : "Access is currently disabled."}
                  </span>

                                    <div className="userActions">
                                        <button
                                            className="btn secondary small"
                                            type="button"
                                            disabled={isCurrentUser}
                                            title={
                                                isCurrentUser
                                                    ? "Your own access cannot be changed here."
                                                    : undefined
                                            }
                                            onClick={() => openEditUser(user)}
                                        >
                                            Edit Access
                                        </button>

                                        <button
                                            className="btn secondary small"
                                            type="button"
                                            disabled={!user.email}
                                            onClick={async () => {
                                                try {
                                                    await userService.inviteUser(
                                                        {
                                                            fullName: user.full_name ?? "",
                                                            email: user.email ?? "",
                                                            role: user.role,
                                                            redirectUrl: `${window.location.origin}/admin/set-password`,
                                                        },
                                                        "resend_setup",
                                                    );

                                                    setToastType("success");
                                                    setToastMessage(
                                                        `Password reset email sent to ${user.email}.`,
                                                    );
                                                } catch (error) {
                                                    setToastType("error");
                                                    setToastMessage(
                                                        error instanceof Error
                                                            ? error.message
                                                            : "Unable to send the password reset email.",
                                                    );
                                                }
                                            }}
                                        >
                                            Reset Password
                                        </button>

                                        <button
                                            className={`btn small ${
                                                user.active ? "danger" : "secondary"
                                            }`}
                                            type="button"
                                            disabled={isCurrentUser}
                                            title={
                                                isCurrentUser
                                                    ? "You cannot deactivate your own account."
                                                    : undefined
                                            }
                                            onClick={async () => {
                                                try {
                                                    await userService.updateUser(user.id, {
                                                        fullName: user.full_name ?? "",
                                                        role: user.role,
                                                        active: !user.active,
                                                    });

                                                    await loadUsers();

                                                    setToastType("success");
                                                    setToastMessage(
                                                        user.active
                                                            ? "User deactivated successfully."
                                                            : "User activated successfully.",
                                                    );
                                                } catch (error) {
                                                    setToastType("error");
                                                    setToastMessage(
                                                        error instanceof Error
                                                            ? error.message
                                                            : "Unable to update the user.",
                                                    );
                                                }
                                            }}
                                        >
                                            {user.active ? "Deactivate" : "Activate"}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="teamsEmptyState">
                    <h3>No administrator users</h3>

                    <p>Invite the first administrator from this screen.</p>
                </div>
            )}

            {showInviteModal && (
                <Modal title="Invite User" onClose={closeInviteModal}>
                    <p className="muted">
                        The user will receive a secure invitation and create their own
                        password.
                    </p>

                    <div className="adminFormGrid">
                        <label>
                            <span>Full Name *</span>

                            <input
                                value={inviteValues.fullName}
                                maxLength={150}
                                autoComplete="name"
                                onChange={(event) =>
                                    setInviteValues((current) => ({
                                        ...current,
                                        fullName: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label>
                            <span>Email *</span>

                            <input
                                type="email"
                                value={inviteValues.email}
                                maxLength={254}
                                autoComplete="email"
                                onChange={(event) =>
                                    setInviteValues((current) => ({
                                        ...current,
                                        email: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label className="adminFormFullWidth">
                            <span>Role *</span>

                            <select
                                value={inviteValues.role}
                                onChange={(event) =>
                                    setInviteValues((current) => ({
                                        ...current,
                                        role: event.target.value as AdminRole,
                                    }))
                                }
                            >
                                {roleOptions.map((role) => (
                                    <option key={role.value} value={role.value}>
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="adminFormFullWidth">
                            <span className="teamAdminFieldLabel">Role Description</span>

                            <p className="muted">
                                {
                                    roleOptions.find((role) => role.value === inviteValues.role)
                                        ?.description
                                }
                            </p>
                        </div>
                    </div>

                    <div className="modalActions">
                        <button
                            className="btn secondary"
                            type="button"
                            disabled={saving}
                            onClick={closeInviteModal}
                        >
                            Cancel
                        </button>

                        <button
                            className="btn primary"
                            type="button"
                            disabled={saving}
                            onClick={() => void inviteUser()}
                        >
                            {saving ? "Sending..." : "Send Invitation"}
                        </button>
                    </div>
                </Modal>
            )}

            {editingUser && (
                <Modal title="Edit User Access" onClose={closeEditModal}>
                    <div className="adminFormGrid">
                        <label>
                            <span>Full Name</span>

                            <input
                                value={formValues.fullName}
                                maxLength={150}
                                onChange={(event) =>
                                    setFormValues((current) => ({
                                        ...current,
                                        fullName: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label>
                            <span>Email</span>

                            <input value={editingUser.email ?? ""} disabled />
                        </label>

                        <label>
                            <span>Role</span>

                            <select
                                value={formValues.role}
                                onChange={(event) =>
                                    setFormValues((current) => ({
                                        ...current,
                                        role: event.target.value as AdminRole,
                                    }))
                                }
                            >
                                {roleOptions.map((role) => (
                                    <option key={role.value} value={role.value}>
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="adminCheckboxLabel">
                            <input
                                type="checkbox"
                                checked={formValues.active}
                                onChange={(event) =>
                                    setFormValues((current) => ({
                                        ...current,
                                        active: event.target.checked,
                                    }))
                                }
                            />

                            <span>Account is active</span>
                        </label>

                        <div className="adminFormFullWidth">
                            <span className="teamAdminFieldLabel">Role Description</span>

                            <p className="muted">
                                {
                                    roleOptions.find((role) => role.value === formValues.role)
                                        ?.description
                                }
                            </p>
                        </div>
                    </div>

                    <div className="modalActions">
                        <button
                            className="btn secondary"
                            type="button"
                            disabled={saving}
                            onClick={closeEditModal}
                        >
                            Cancel
                        </button>

                        <button
                            className="btn primary"
                            type="button"
                            disabled={saving}
                            onClick={() => void saveUser()}
                        >
                            {saving ? "Saving..." : "Save Access"}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}