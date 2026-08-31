import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

import {
    Mail,
    ShieldCheck,
    UserPlus,
    Users,
    X,
} from "lucide-react";

import { ConfirmDialog } from "../../common/ConfirmDialog";
import { Toast } from "../../common/Toast";

import type {
    AdminProfile,
    AdminRole,
    OrganisationType,
} from "../../../services/accessControl";

import { userService } from "./userService";

import type {
    AdminUser,
    InviteUserFormValues,
    UserAccessFormValues,
} from "./userTypes";

type UserManagementProps = {
    currentProfile: AdminProfile;
};

type RoleOption = {
    value: AdminRole;
    label: string;
    description: string;
};

type BrandedModalProps = {
    title: string;
    eyebrow: string;
    children: ReactNode;
    onClose: () => void;
    disabled?: boolean;
};

const competitionRoleOptions: readonly RoleOption[] = [
    {
        value: "super_admin",
        label: "Competition Admin",
        description:
            "Full competition administration, commercial content and user-access control for this organisation.",
    },
    {
        value: "competition_manager",
        label: "Competition Manager",
        description:
            "Can manage competitions, clubs, teams, fixtures, venues, results and competition operations.",
    },
    {
        value: "match_official",
        label: "Match Official",
        description:
            "Can manage match results, goals and permitted match media.",
    },
    {
        value: "content_editor",
        label: "Content Editor",
        description:
            "Can create, edit, preview, publish, unpublish and archive articles for this organisation. Cannot access any other operational modules.",
    },
];

const clubRoleOptions: readonly RoleOption[] = [
    {
        value: "super_admin",
        label: "Club Admin",
        description:
            "Full club administration, club website settings, finance, communications and user-access control.",
    },
    {
        value: "competition_manager",
        label: "Club Operations Manager",
        description:
            "Can manage seasons, teams, fixtures, Match Centre, squad operations, results, statistics, communications and club finance where the club plan allows it.",
    },
    {
        value: "match_official",
        label: "Match Centre Reporter",
        description:
            "Can record matchday results, goals and permitted match media for club fixtures.",
    },
    {
        value: "content_editor",
        label: "Club Content & Media Editor",
        description:
            "Can manage club articles and public website content without access to finance, squads or user administration.",
    },
];

function getRoleOptions(
    organisationType: OrganisationType,
): readonly RoleOption[] {
    return organisationType === "club"
        ? clubRoleOptions
        : competitionRoleOptions;
}

function getDefaultInviteRole(
    organisationType: OrganisationType,
): AdminRole {
    return organisationType === "club"
        ? "competition_manager"
        : "content_editor";
}

const initialInviteForm: InviteUserFormValues = {
    fullName: "",
    email: "",
    role: "content_editor",
};

function BrandedModal({
                          title,
                          eyebrow,
                          children,
                          onClose,
                          disabled = false,
                      }: BrandedModalProps) {
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        function handleKeyDown(
            event: KeyboardEvent,
        ) {
            if (
                event.key === "Escape" &&
                !disabled
            ) {
                onCloseRef.current();
            }
        }

        window.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;

            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [disabled]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget &&
                    !disabled
                ) {
                    onClose();
                }
            }}
        >
            <section
                className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-lime-800/50 bg-[#0b150a] shadow-2xl shadow-black/50"
                role="dialog"
                aria-modal="true"
                aria-labelledby="user-access-modal-title"
            >
                <header className="sticky top-0 z-10 flex items-start justify-between gap-6 border-b border-lime-900/50 bg-[#0b150a]/95 px-6 py-5 backdrop-blur sm:px-8">
                    <div>
                        <img
                            src="/assets/tournamenthq-logo.png"
                            alt="TournamentHQ"
                            className="mb-4 h-auto max-h-10 w-[175px] object-contain"
                        />

                        <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-400">
                            {eyebrow}
                        </p>

                        <h2
                            id="user-access-modal-title"
                            className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl"
                        >
                            {title}
                        </h2>
                    </div>

                    <button
                        type="button"
                        aria-label={`Close ${title}`}
                        disabled={disabled}
                        onClick={onClose}
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-lime-800/60 text-white transition hover:border-lime-400 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <X size={22} />
                    </button>
                </header>

                <div className="px-6 py-6 sm:px-8 sm:py-8">
                    {children}
                </div>
            </section>
        </div>
    );
}

function formatDate(value: string) {
    return new Date(
        value,
    ).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value.trim(),
    );
}

function getUserDisplayName(
    user: AdminUser,
) {
    return (
        user.full_name?.trim() ||
        user.email?.trim() ||
        "this user"
    );
}

function getRoleBadgeClass(
    role: AdminRole,
) {
    switch (role) {
        case "super_admin":
            return "border-fuchsia-700/50 bg-fuchsia-500/10 text-fuchsia-300";
        case "competition_manager":
            return "border-sky-700/50 bg-sky-500/10 text-sky-300";
        case "content_editor":
            return "border-amber-700/50 bg-amber-500/10 text-amber-300";
        case "match_official":
            return "border-emerald-700/50 bg-emerald-500/10 text-emerald-300";
    }
}

export function UserManagement({
                                   currentProfile,
                               }: UserManagementProps) {
    const organisationId =
        currentProfile.currentOrganisation.id;

    const organisationName =
        currentProfile.currentOrganisation.name;

    const organisationType =
        currentProfile.currentOrganisation
            .organisation_type;

    const isClubOrganisation =
        organisationType === "club";

    const [users, setUsers] =
        useState<AdminUser[]>([]);

    const [
        editingUser,
        setEditingUser,
    ] =
        useState<AdminUser | null>(null);

    const [
        userPendingDelete,
        setUserPendingDelete,
    ] =
        useState<AdminUser | null>(null);

    const [
        showInviteModal,
        setShowInviteModal,
    ] =
        useState(false);

    const [
        formValues,
        setFormValues,
    ] =
        useState<UserAccessFormValues>({
            fullName: "",
            role: "content_editor",
            active: false,
        });

    const [
        inviteValues,
        setInviteValues,
    ] =
        useState<InviteUserFormValues>(
            initialInviteForm,
        );

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [deleting, setDeleting] =
        useState(false);

    const [
        toastMessage,
        setToastMessage,
    ] =
        useState("");

    const [
        toastType,
        setToastType,
    ] =
        useState<
            "success" | "error" | "info"
        >("success");

    const loadUsers =
        useCallback(async () => {
            setLoading(true);

            try {
                const data =
                    await userService.getUsers(
                        organisationId,
                    );

                setUsers(data);
            } catch (error) {
                setUsers([]);
                setToastType("error");
                setToastMessage(
                    error instanceof Error
                        ? error.message
                        : "Failed to load users.",
                );
            } finally {
                setLoading(false);
            }
        }, [organisationId]);

    useEffect(() => {
        setEditingUser(null);
        setUserPendingDelete(null);
        setShowInviteModal(false);
        setInviteValues({
            ...initialInviteForm,
            role: getDefaultInviteRole(
                organisationType,
            ),
        });

        void loadUsers();
    }, [loadUsers, organisationType]);

    const roleOptions = useMemo(
        () => getRoleOptions(organisationType),
        [organisationType],
    );

    const roleLabelByValue = useMemo(
        () =>
            new Map(
                roleOptions.map((role) => [
                    role.value,
                    role.label,
                ]),
            ),
        [roleOptions],
    );

    const accessContextLabel =
        isClubOrganisation
            ? "club"
            : "competition";

    const inviteButtonLabel =
        isClubOrganisation
            ? "Invite Club User"
            : "Invite Competition User";

    const stats = useMemo(
        () => [
            {
                label: "Administrators",
                value: users.length,
                icon: Users,
            },
            {
                label: "Active",
                value: users.filter(
                    (user) => user.active,
                ).length,
                icon: ShieldCheck,
            },
            {
                label: "Content Editors",
                value: users.filter(
                    (user) =>
                        user.role ===
                        "content_editor",
                ).length,
                icon: Mail,
            },
        ],
        [users],
    );

    const selectedInviteRole =
        roleOptions.find(
            (role) =>
                role.value ===
                inviteValues.role,
        ) ?? roleOptions[0];

    const selectedEditRole =
        roleOptions.find(
            (role) =>
                role.value ===
                formValues.role,
        ) ?? roleOptions[0];

    const openInviteModal =
        useCallback(() => {
            setInviteValues({
                ...initialInviteForm,
                role: getDefaultInviteRole(
                    organisationType,
                ),
            });
            setShowInviteModal(true);
        }, [organisationType]);

    const closeInviteModal =
        useCallback(() => {
            if (saving) {
                return;
            }

            setShowInviteModal(false);
            setInviteValues({
                ...initialInviteForm,
                role: getDefaultInviteRole(
                    organisationType,
                ),
            });
        }, [saving, organisationType]);

    const closeEditModal =
        useCallback(() => {
            if (saving) {
                return;
            }

            setEditingUser(null);
        }, [saving]);

    function openEditUser(
        user: AdminUser,
    ) {
        setEditingUser(user);
        setFormValues({
            fullName:
                user.full_name ?? "",
            role: user.role,
            active: user.active,
        });
    }

    function requestUserRemoval(
        user: AdminUser,
    ) {
        if (
            user.user_id ===
            currentProfile.id
        ) {
            setToastType("error");
            setToastMessage(
                "You cannot remove your own account.",
            );
            return;
        }

        setUserPendingDelete(user);
    }

    async function inviteUser() {
        const fullName =
            inviteValues.fullName.trim();

        const email =
            inviteValues.email
                .trim()
                .toLowerCase();

        if (!fullName) {
            setToastType("error");
            setToastMessage(
                "Full name is required.",
            );
            return;
        }

        if (!isValidEmail(email)) {
            setToastType("error");
            setToastMessage(
                "Enter a valid email address.",
            );
            return;
        }

        if (
            users.some(
                (user) =>
                    user.email
                        ?.trim()
                        .toLowerCase() ===
                    email,
            )
        ) {
            setToastType("error");
            setToastMessage(
                `This user already has access to ${organisationName}.`,
            );
            return;
        }

        setSaving(true);

        try {
            const adminBaseUrl =
                (
                    import.meta.env.VITE_ADMIN_URL as
                        | string
                        | undefined
                )?.replace(/\/$/, "") ??
                window.location.origin;

            await userService.inviteUser({
                organisationId,
                fullName,
                email,
                role: inviteValues.role,
                redirectUrl: `${adminBaseUrl}/admin/set-password?invitation=true&organisationId=${encodeURIComponent(
                    organisationId,
                )}`,
            });


            setShowInviteModal(false);
            setInviteValues({
                ...initialInviteForm,
                role: getDefaultInviteRole(
                    organisationType,
                ),
            });

            await loadUsers();

            setToastType("success");
            setToastMessage(
                `Invitation sent to ${email} for ${organisationName}.`,
            );
        } catch (error) {
            setToastType("error");
            setToastMessage(
                error instanceof Error
                    ? error.message
                    : "Failed to invite the user.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function saveUser() {
        if (!editingUser) {
            return;
        }

        if (
            editingUser.user_id ===
            currentProfile.id
        ) {
            setToastType("error");
            setToastMessage(
                "You cannot change your own role or access status from this screen.",
            );
            return;
        }

        setSaving(true);

        try {
            await userService.updateUser(
                editingUser.membership_id,
                editingUser.user_id,
                organisationId,
                formValues,
            );

            setEditingUser(null);
            await loadUsers();

            setToastType("success");
            setToastMessage(
                "Organisation access updated successfully.",
            );
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

    async function toggleUserAccess(
        user: AdminUser,
    ) {
        if (
            user.user_id ===
            currentProfile.id
        ) {
            setToastType("error");
            setToastMessage(
                "You cannot deactivate your own organisation access.",
            );
            return;
        }

        try {
            await userService.updateUser(
                user.membership_id,
                user.user_id,
                organisationId,
                {
                    fullName:
                        user.full_name ?? "",
                    role: user.role,
                    active: !user.active,
                },
            );

            await loadUsers();

            setToastType("success");
            setToastMessage(
                user.active
                    ? "User access deactivated successfully."
                    : "User access activated successfully.",
            );
        } catch (error) {
            setToastType("error");
            setToastMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to update the user.",
            );
        }
    }

    async function resendSetupEmail(
        user: AdminUser,
    ) {
        if (!user.email) {
            return;
        }

        try {
            const adminBaseUrl =
                (
                    import.meta.env.VITE_ADMIN_URL as
                        | string
                        | undefined
                )?.replace(/\/$/, "") ??
                window.location.origin;

            await userService.inviteUser(
                {
                    organisationId,
                    fullName:
                        user.full_name ?? "",
                    email: user.email,
                    role: user.role,
                    redirectUrl:
                        `${adminBaseUrl}/admin/set-password?invitation=true&organisationId=${encodeURIComponent(
                            organisationId,
                        )}`,
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
    }

    async function confirmUserRemoval() {
        if (
            !userPendingDelete ||
            deleting
        ) {
            return;
        }

        setDeleting(true);

        try {
            const result =
                await userService.removeUser(
                    organisationId,
                    userPendingDelete.user_id,
                );

            setUserPendingDelete(null);
            await loadUsers();

            setToastType("success");
            setToastMessage(
                result.message,
            );
        } catch (error) {
            setToastType("error");
            setToastMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to remove the user.",
            );
        } finally {
            setDeleting(false);
        }
    }

    const inputClassName =
        "mt-2 w-full rounded-xl border border-lime-900/70 bg-[#071006] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 disabled:cursor-not-allowed disabled:opacity-60";

    return (
        <div className="space-y-6">
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() =>
                    setToastMessage("")
                }
            />

            <section className="flex flex-col gap-5 rounded-3xl border border-lime-900/50 bg-[#0b150a] p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-400">
                        Administration
                    </p>

                    <h2 className="mt-2 text-3xl font-black text-white">
                        User Access
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                        Manage {accessContextLabel}-specific access for{" "}
                        <strong className="text-white">
                            {organisationName}
                        </strong>
                        .
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openInviteModal}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3 font-black text-black transition hover:bg-lime-300"
                >
                    <UserPlus size={18} />
                    {inviteButtonLabel}
                </button>
            </section>

            <div className="grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => {
                    const Icon = stat.icon;

                    return (
                        <article
                            key={stat.label}
                            className="rounded-2xl border border-lime-900/50 bg-[#10190f] p-5"
                        >
                            <Icon
                                size={22}
                                className="text-lime-400"
                            />

                            <p className="mt-4 text-sm font-semibold text-slate-400">
                                {stat.label}
                            </p>

                            <strong className="mt-1 block text-3xl font-black text-white">
                                {stat.value}
                            </strong>
                        </article>
                    );
                })}
            </div>

            {loading ? (
                <div className="rounded-2xl border border-lime-900/50 bg-[#10190f] px-6 py-12 text-center text-slate-400">
                    Loading users for {organisationName}...
                </div>
            ) : users.length ? (
                <div className="grid gap-4 xl:grid-cols-2">
                    {users.map((user) => {
                        const isCurrentUser =
                            user.user_id ===
                            currentProfile.id;

                        const isSuperAdmin =
                            user.role ===
                            "super_admin";

                        return (
                            <article
                                key={user.membership_id}
                                className="rounded-2xl border border-lime-900/50 bg-[#10190f] p-5"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <div className="flex flex-wrap gap-2">
                                            <span
                                                className={`rounded-full border px-3 py-1 text-xs font-black ${getRoleBadgeClass(
                                                    user.role,
                                                )}`}
                                            >
                                                {roleLabelByValue.get(
                                                    user.role,
                                                ) ?? user.role}
                                            </span>

                                            <span
                                                className={`rounded-full border px-3 py-1 text-xs font-black ${
                                                    user.active
                                                        ? "border-emerald-700/50 bg-emerald-500/10 text-emerald-300"
                                                        : "border-slate-700 bg-slate-500/10 text-slate-400"
                                                }`}
                                            >
                                                {user.active
                                                    ? "Active"
                                                    : "Inactive"}
                                            </span>

                                            {isCurrentUser && (
                                                <span className="rounded-full border border-lime-700/50 bg-lime-500/10 px-3 py-1 text-xs font-black text-lime-300">
                                                    You
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="mt-4 text-xl font-black text-white">
                                            {user.full_name ??
                                                "Unnamed administrator"}
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-400">
                                            {user.email ??
                                                "Email not available"}
                                        </p>
                                    </div>

                                    <div className="text-right text-xs text-slate-500">
                                        <p>
                                            Created{" "}
                                            {formatDate(
                                                user.created_at,
                                            )}
                                        </p>
                                        <p className="mt-1">
                                            Updated{" "}
                                            {formatDate(
                                                user.updated_at,
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {!isCurrentUser && (
                                    <div className="mt-5 flex flex-wrap gap-2 border-t border-lime-900/40 pt-4">
                                        {!isSuperAdmin && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openEditUser(
                                                        user,
                                                    )
                                                }
                                                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-white transition hover:border-lime-500 hover:text-lime-300"
                                            >
                                                Edit Access
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            disabled={!user.email}
                                            onClick={() =>
                                                void resendSetupEmail(
                                                    user,
                                                )
                                            }
                                            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-white transition hover:border-lime-500 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Reset Password
                                        </button>

                                        {!isSuperAdmin && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void toggleUserAccess(
                                                            user,
                                                        )
                                                    }
                                                    className="rounded-xl border border-amber-700/50 px-4 py-2 text-sm font-bold text-amber-300 transition hover:bg-amber-500/10"
                                                >
                                                    {user.active
                                                        ? "Deactivate"
                                                        : "Activate"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        requestUserRemoval(
                                                            user,
                                                        )
                                                    }
                                                    className="rounded-xl border border-red-800/60 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/10"
                                                >
                                                    Remove User
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-lime-800/60 bg-[#10190f] px-6 py-12 text-center">
                    <h3 className="text-xl font-black text-white">
                        No users assigned
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                        Invite the first user to {organisationName}.
                    </p>
                </div>
            )}

            {showInviteModal && (
                <BrandedModal
                    title={`${inviteButtonLabel} to ${organisationName}`}
                    eyebrow="TournamentHQ User Access"
                    disabled={saving}
                    onClose={closeInviteModal}
                >
                    <p className="text-sm leading-6 text-slate-400">
                        The user will receive {accessContextLabel}-specific access to{" "}
                        <strong className="text-white">
                            {organisationName}
                        </strong>
                        .
                    </p>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <label className="block text-sm font-bold text-lime-200">
                            Full Name *
                            <input
                                value={inviteValues.fullName}
                                maxLength={150}
                                autoComplete="name"
                                autoFocus
                                disabled={saving}
                                onChange={(event) =>
                                    setInviteValues(
                                        (current) => ({
                                            ...current,
                                            fullName:
                                            event.target.value,
                                        }),
                                    )
                                }
                                className={inputClassName}
                            />
                        </label>

                        <label className="block text-sm font-bold text-lime-200">
                            Email *
                            <input
                                type="email"
                                value={inviteValues.email}
                                maxLength={254}
                                autoComplete="email"
                                disabled={saving}
                                onChange={(event) =>
                                    setInviteValues(
                                        (current) => ({
                                            ...current,
                                            email:
                                            event.target.value,
                                        }),
                                    )
                                }
                                className={inputClassName}
                            />
                        </label>

                        <label className="block text-sm font-bold text-lime-200 sm:col-span-2">
                            Organisation
                            <input
                                value={organisationName}
                                disabled
                                className={inputClassName}
                            />
                        </label>

                        <label className="block text-sm font-bold text-lime-200 sm:col-span-2">
                            Role *
                            <select
                                value={inviteValues.role}
                                disabled={saving}
                                onChange={(event) =>
                                    setInviteValues(
                                        (current) => ({
                                            ...current,
                                            role: event.target
                                                .value as AdminRole,
                                        }),
                                    )
                                }
                                className={inputClassName}
                            >
                                {roleOptions.map(
                                    (role) => (
                                        <option
                                            key={role.value}
                                            value={role.value}
                                        >
                                            {role.label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                    </div>

                    <div className="mt-5 rounded-2xl border border-lime-900/50 bg-black/20 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-400">
                            Role Description
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-300">
                            {selectedInviteRole.description}
                        </p>
                    </div>

                    <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-lime-900/50 pt-6">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={closeInviteModal}
                            className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-white transition hover:border-lime-500 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                                void inviteUser()
                            }
                            className="rounded-xl bg-lime-400 px-5 py-3 font-black text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving
                                ? "Sending..."
                                : "Send Invitation"}
                        </button>
                    </div>
                </BrandedModal>
            )}

            {editingUser && (
                <BrandedModal
                    title={`Edit Access for ${organisationName}`}
                    eyebrow="TournamentHQ User Access"
                    disabled={saving}
                    onClose={closeEditModal}
                >
                    <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block text-sm font-bold text-lime-200">
                            Full Name
                            <input
                                value={formValues.fullName}
                                maxLength={150}
                                disabled={saving}
                                onChange={(event) =>
                                    setFormValues(
                                        (current) => ({
                                            ...current,
                                            fullName:
                                            event.target.value,
                                        }),
                                    )
                                }
                                className={inputClassName}
                            />
                        </label>

                        <label className="block text-sm font-bold text-lime-200">
                            Email
                            <input
                                value={editingUser.email ?? ""}
                                disabled
                                className={inputClassName}
                            />
                        </label>

                        <label className="block text-sm font-bold text-lime-200">
                            Role
                            <select
                                value={formValues.role}
                                disabled={saving}
                                onChange={(event) =>
                                    setFormValues(
                                        (current) => ({
                                            ...current,
                                            role: event.target
                                                .value as AdminRole,
                                        }),
                                    )
                                }
                                className={inputClassName}
                            >
                                {roleOptions.map(
                                    (role) => (
                                        <option
                                            key={role.value}
                                            value={role.value}
                                        >
                                            {role.label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>

                        <label className="flex items-center gap-3 rounded-xl border border-lime-900/60 bg-[#071006] px-4 py-3 text-sm font-bold text-white">
                            <input
                                type="checkbox"
                                checked={formValues.active}
                                disabled={saving}
                                onChange={(event) =>
                                    setFormValues(
                                        (current) => ({
                                            ...current,
                                            active:
                                            event.target.checked,
                                        }),
                                    )
                                }
                                className="h-4 w-4 accent-lime-400"
                            />
                            Organisation access is active
                        </label>
                    </div>

                    <div className="mt-5 rounded-2xl border border-lime-900/50 bg-black/20 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-400">
                            Role Description
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-300">
                            {selectedEditRole.description}
                        </p>
                    </div>

                    <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-lime-900/50 pt-6">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={closeEditModal}
                            className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-white transition hover:border-lime-500 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                                void saveUser()
                            }
                            className="rounded-xl bg-lime-400 px-5 py-3 font-black text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving
                                ? "Saving..."
                                : "Save Access"}
                        </button>
                    </div>
                </BrandedModal>
            )}

            {userPendingDelete && (
                <ConfirmDialog
                    title={`Delete ${getUserDisplayName(
                        userPendingDelete,
                    )}?`}
                    message={`${getUserDisplayName(
                        userPendingDelete,
                    )} will be removed from ${organisationName}. If this is their only organisation, their TournamentHQ account, login access and profile will also be permanently deleted. This action cannot be undone.`}
                    confirmText={
                        deleting
                            ? "Deleting..."
                            : "Delete User"
                    }
                    cancelText="Cancel"
                    onCancel={() => {
                        if (!deleting) {
                            setUserPendingDelete(
                                null,
                            );
                        }
                    }}
                    onConfirm={() =>
                        void confirmUserRemoval()
                    }
                />
            )}
        </div>
    );
}