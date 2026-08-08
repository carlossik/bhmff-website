import React, {
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    Lock,
    X,
} from 'lucide-react';
import { TournamentHQBrand } from '../common/TournamentHQBrand';
import {
    MarketplaceVisibility,
    Official,
    OfficialRole,
    OfficialStatus,
    VerificationStatus,
} from '../../types/officialTypes';
import {
    Sport,
    SportOfficialRole,
} from '../../types/sportTypes';
import { sportsService } from '../../services/sportsService';

interface Props {
    open: boolean;
    official: Official | null;
    saving: boolean;
    onClose: () => void;
    onSave: (
        data: Partial<Official>
    ) => void | Promise<void>;
    competitionSportId?: string | null;
    competitionSportName?: string | null;
}

interface OfficialFormState {
    sport_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    city: string;
    county: string;
    postcode: string;
    nationality: string;
    biography: string;
    role: OfficialRole | '';
    status: OfficialStatus;
    verification_status: VerificationStatus;
    marketplace_visibility: MarketplaceVisibility;
}

const createEmptyForm = (
    inheritedSportId = ''
): OfficialFormState => ({
    sport_id: inheritedSportId,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    county: '',
    postcode: '',
    nationality: '',
    biography: '',
    role: '',
    status: 'active',
    verification_status: 'pending',
    marketplace_visibility: 'organisation_only',
});

const inputClass =
    'block w-full rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-3.5 py-3 text-sm text-white shadow-inner shadow-black/20 outline-none transition placeholder:text-slate-500 focus:border-[var(--organisation-accent)] focus:ring-2 focus:ring-[var(--organisation-accent)] disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-black/30 disabled:text-slate-500';

const labelClass =
    'mb-2 block text-sm font-semibold text-slate-200';

const OfficialModal: React.FC<Props> = ({
                                            open,
                                            official,
                                            saving,
                                            onClose,
                                            onSave,
                                            competitionSportId = null,
                                            competitionSportName = null,
                                        }) => {
    const [form, setForm] = useState<OfficialFormState>(
        createEmptyForm(competitionSportId ?? '')
    );

    const [sports, setSports] = useState<Sport[]>([]);
    const [roles, setRoles] = useState<SportOfficialRole[]>([]);
    const [loadingSports, setLoadingSports] = useState(false);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const sportIsInherited = Boolean(competitionSportId);

    const selectedSport = useMemo(
        () =>
            sports.find(
                sport => sport.id === form.sport_id
            ) ?? null,
        [sports, form.sport_id]
    );

    useEffect(() => {
        if (!open) return;

        let cancelled = false;

        const loadSports = async (): Promise<void> => {
            setLoadingSports(true);
            setLoadError(null);

            try {
                const activeSports =
                    await sportsService.getActiveSports();

                if (!cancelled) {
                    setSports(activeSports);
                }
            } catch (error) {
                if (!cancelled) {
                    setLoadError(
                        error instanceof Error
                            ? error.message
                            : 'Unable to load sports.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingSports(false);
                }
            }
        };

        void loadSports();

        return () => {
            cancelled = true;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const inheritedSportId =
            competitionSportId ?? '';

        if (!official) {
            setForm(
                createEmptyForm(inheritedSportId)
            );
            return;
        }

        setForm({
            sport_id:
                inheritedSportId ||
                official.sport_id ||
                '',
            first_name:
                official.first_name ?? '',
            last_name:
                official.last_name ?? '',
            email:
                official.email ?? '',
            phone:
                official.phone ?? '',
            city:
                official.city ?? '',
            county:
                official.county ?? '',
            postcode:
                official.postcode ?? '',
            nationality:
                official.nationality ?? '',
            biography:
                official.biography ?? '',
            role:
                official.role ?? '',
            status:
            official.status,
            verification_status:
            official.verification_status,
            marketplace_visibility:
            official.marketplace_visibility,
        });
    }, [
        open,
        official,
        competitionSportId,
    ]);

    useEffect(() => {
        if (!open || !form.sport_id) {
            setRoles([]);
            return;
        }

        let cancelled = false;

        const loadRoles = async (): Promise<void> => {
            setLoadingRoles(true);
            setLoadError(null);

            try {
                const sportRoles =
                    await sportsService.getRolesForSport(
                        form.sport_id
                    );

                if (cancelled) return;

                setRoles(sportRoles);

                setForm(previous => {
                    const currentRoleStillValid =
                        sportRoles.some(
                            role =>
                                role.role ===
                                previous.role
                        );

                    if (
                        currentRoleStillValid ||
                        sportRoles.length === 0
                    ) {
                        return previous;
                    }

                    return {
                        ...previous,
                        role:
                            sportRoles[0]
                                .role as OfficialRole,
                    };
                });
            } catch (error) {
                if (!cancelled) {
                    setRoles([]);
                    setLoadError(
                        error instanceof Error
                            ? error.message
                            : 'Unable to load official roles.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingRoles(false);
                }
            }
        };

        void loadRoles();

        return () => {
            cancelled = true;
        };
    }, [open, form.sport_id]);

    useEffect(() => {
        if (!open) return;

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        const handleKeyDown = (
            event: KeyboardEvent
        ): void => {
            if (
                event.key === 'Escape' &&
                !saving
            ) {
                onClose();
            }
        };

        document.addEventListener(
            'keydown',
            handleKeyDown
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;

            document.removeEventListener(
                'keydown',
                handleKeyDown
            );
        };
    }, [open, saving, onClose]);

    if (!open) return null;

    const updateField = <
        K extends keyof OfficialFormState
    >(
        field: K,
        value: OfficialFormState[K]
    ): void => {
        setForm(previous => ({
            ...previous,
            [field]: value,
        }));
    };

    const handleSportChange = (
        sportId: string
    ): void => {
        setForm(previous => ({
            ...previous,
            sport_id: sportId,
            role: '',
        }));
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ): Promise<void> => {
        event.preventDefault();

        const firstName =
            form.first_name.trim();
        const lastName =
            form.last_name.trim();

        if (
            !firstName ||
            !lastName ||
            !form.sport_id ||
            !form.role
        ) {
            return;
        }

        await onSave({
            ...form,
            sport_id: form.sport_id,
            role: form.role as OfficialRole,
            first_name: firstName,
            last_name: lastName,
            full_name:
                `${firstName} ${lastName}`,
            email:
                form.email.trim(),
            phone:
                form.phone.trim() || null,
            city:
                form.city.trim() || null,
            county:
                form.county.trim() || null,
            postcode:
                form.postcode.trim() || null,
            nationality:
                form.nationality.trim() || null,
            biography:
                form.biography.trim() || null,
        });
    };

    const inheritedSportLabel =
        competitionSportName ||
        selectedSport?.name ||
        'Competition sport';

    const formIsValid =
        Boolean(form.first_name.trim()) &&
        Boolean(form.last_name.trim()) &&
        Boolean(form.sport_id) &&
        Boolean(form.role) &&
        !loadingRoles;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="official-modal-title"
            onMouseDown={event => {
                if (
                    event.target ===
                    event.currentTarget &&
                    !saving
                ) {
                    onClose();
                }
            }}
        >
            <form
                onSubmit={event =>
                    void handleSubmit(event)
                }
                className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] text-white shadow-2xl shadow-black/60"
                style={{ maxHeight: '90vh' }}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--organisation-accent)]">
                            Sports Officials
                        </p>

                        <h2
                            id="official-modal-title"
                            className="mt-1 text-3xl font-black tracking-tight text-white"
                        >
                            {official
                                ? 'Edit Official'
                                : 'Add Official'}
                        </h2>

                        <p className="mt-2 text-sm text-slate-400">
                            Add the official&apos;s sport,
                            role and essential profile
                            details.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-xl border border-[var(--organisation-border)] bg-black/20 p-2.5 text-slate-400 transition hover:border-[var(--organisation-accent)] hover:bg-[var(--organisation-surface)] hover:text-white disabled:opacity-50"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div
                    className="overflow-y-auto bg-[var(--organisation-surface)] px-6 py-6"
                    style={{ minHeight: 0 }}
                >
                    {loadError && (
                        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                            <AlertCircle
                                size={18}
                                className="mt-0.5 shrink-0"
                            />
                            <span>{loadError}</span>
                        </div>
                    )}

                    <div className="mb-6 rounded-2xl border border-[var(--organisation-accent)] bg-[var(--organisation-surface)] p-4 shadow-inner shadow-black/20">
                        <div className="mb-4">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--organisation-accent)]">
                                Competition Context
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                                The selected competition controls the
                                sport and available official roles.
                            </p>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label className={labelClass}>
                                    Sport
                                </label>

                                {sportIsInherited ? (
                                    <div className="flex min-h-[46px] items-center justify-between rounded-xl border border-[var(--organisation-accent)] bg-[var(--organisation-background)] px-3.5 py-3 text-sm text-white shadow-inner shadow-black/20">
                                        <div className="flex items-center gap-2.5">
                                            <CheckCircle2
                                                size={18}
                                                className="text-[var(--organisation-accent)]"
                                            />

                                            <span className="font-semibold">
                                                {inheritedSportLabel}
                                            </span>
                                        </div>

                                        <Lock
                                            size={16}
                                            className="text-slate-500"
                                        />
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={form.sport_id}
                                        disabled={loadingSports}
                                        onChange={event =>
                                            handleSportChange(
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    >
                                        <option value="">
                                            {loadingSports
                                                ? 'Loading sports...'
                                                : 'Select a sport'}
                                        </option>

                                        {sports.map(sport => (
                                            <option
                                                key={sport.id}
                                                value={sport.id}
                                            >
                                                {sport.name}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {sportIsInherited && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        Inherited from the selected competition.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Official Role
                                </label>

                                <div className="relative">
                                    <select
                                        required
                                        value={form.role}
                                        disabled={
                                            !form.sport_id ||
                                            loadingRoles
                                        }
                                        onChange={event =>
                                            updateField(
                                                'role',
                                                event.target
                                                    .value as OfficialRole
                                            )
                                        }
                                        className={inputClass}
                                    >
                                        <option value="">
                                            {!form.sport_id
                                                ? 'Select a sport first'
                                                : loadingRoles
                                                    ? 'Loading roles...'
                                                    : roles.length === 0
                                                        ? 'No active roles configured'
                                                        : 'Select a role'}
                                        </option>

                                        {roles.map(role => (
                                            <option
                                                key={role.id}
                                                value={role.role}
                                            >
                                                {role.display_name}
                                            </option>
                                        ))}
                                    </select>

                                    {loadingRoles && (
                                        <Loader2
                                            size={17}
                                            className="pointer-events-none absolute right-9 top-3.5 animate-spin text-[var(--organisation-accent)]"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <label className={labelClass}>First Name</label>
                            <input type="text" required autoFocus value={form.first_name} onChange={event => updateField('first_name', event.target.value)} className={inputClass} />
                        </div>

                        <div>
                            <label className={labelClass}>Last Name</label>
                            <input type="text" required value={form.last_name} onChange={event => updateField('last_name', event.target.value)} className={inputClass} />
                        </div>

                        <div>
                            <label className={labelClass}>Email</label>
                            <input type="email" value={form.email} onChange={event => updateField('email', event.target.value)} className={inputClass} />
                        </div>

                        <div>
                            <label className={labelClass}>Phone</label>
                            <input type="tel" value={form.phone} onChange={event => updateField('phone', event.target.value)} className={inputClass} />
                        </div>

                        <div>
                            <label className={labelClass}>City</label>
                            <input type="text" value={form.city} onChange={event => updateField('city', event.target.value)} className={inputClass} />
                        </div>

                        <div>
                            <label className={labelClass}>County</label>
                            <input type="text" value={form.county} onChange={event => updateField('county', event.target.value)} className={inputClass} />
                        </div>

                        <div>
                            <label className={labelClass}>Postcode</label>
                            <input type="text" value={form.postcode} onChange={event => updateField('postcode', event.target.value)} className={inputClass} />
                        </div>

                        <div>
                            <label className={labelClass}>Nationality</label>
                            <input type="text" value={form.nationality} onChange={event => updateField('nationality', event.target.value)} className={inputClass} />
                        </div>

                        <div>
                            <label className={labelClass}>Status</label>
                            <select value={form.status} onChange={event => updateField('status', event.target.value as OfficialStatus)} className={inputClass}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="pending">Pending</option>
                                <option value="suspended">Suspended</option>
                                <option value="retired">Retired</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Verification</label>
                            <select value={form.verification_status} onChange={event => updateField('verification_status', event.target.value as VerificationStatus)} className={inputClass}>
                                <option value="not_verified">Not Verified</option>
                                <option value="pending">Pending</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Marketplace Visibility</label>
                            <select value={form.marketplace_visibility} onChange={event => updateField('marketplace_visibility', event.target.value as MarketplaceVisibility)} className={inputClass}>
                                <option value="private">Private</option>
                                <option value="organisation_only">Organisation Only</option>
                                <option value="public">Public</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className={labelClass}>Biography</label>
                            <textarea rows={3} value={form.biography} onChange={event => updateField('biography', event.target.value)} placeholder="Short professional biography" className={inputClass} />
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 justify-end gap-3 border-t border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-xl border border-slate-700 bg-black/20 px-5 py-2.5 font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-[var(--organisation-surface)]/5 disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={saving || !formIsValid}
                        className="rounded-xl bg-[var(--organisation-accent)] px-6 py-2.5 font-bold text-[var(--organisation-on-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {saving ? 'Saving...' : 'Save Official'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default OfficialModal;