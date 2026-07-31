import React, {
    useCallback,
    useEffect,
    useState,
} from 'react';
import {
    AlertCircle,
    Award,
    Briefcase,
    Clock,
    Globe,
    Save,
} from 'lucide-react';

import {
    officialService,
    UpsertMarketplaceProfileInput,
} from '../../services/officialService';
import {
    Official,
    OfficialMarketplaceProfile,
    OfficialRole,
} from '../../types/officialTypes';

interface Props {
    official: Official;
}

type MarketplaceField =
    | 'headline'
    | 'summary'
    | 'years_experience'
    | 'available_for_hire'
    | 'accepts_last_minute'
    | 'hourly_rate'
    | 'match_rate'
    | 'preferred_sports'
    | 'preferred_roles'
    | 'languages';

const ROLE_OPTIONS: Array<{
    value: OfficialRole;
    label: string;
}> = [
    {
        value: 'referee',
        label: 'Referee',
    },
    {
        value: 'assistant_referee',
        label: 'Assistant Referee',
    },
    {
        value: 'fourth_official',
        label: 'Fourth Official',
    },
    {
        value: 'match_commissioner',
        label: 'Match Commissioner',
    },
    {
        value: 'assessor',
        label: 'Assessor',
    },
    {
        value: 'observer',
        label: 'Observer',
    },
    {
        value: 'timekeeper',
        label: 'Timekeeper',
    },
    {
        value: 'scorekeeper',
        label: 'Scorekeeper',
    },
    {
        value: 'umpire',
        label: 'Umpire',
    },
    {
        value: 'line_judge',
        label: 'Line Judge',
    },
    {
        value: 'table_official',
        label: 'Table Official',
    },
    {
        value: 'marshal',
        label: 'Marshal',
    },
    {
        value: 'technical_delegate',
        label: 'Technical Delegate',
    },
    {
        value: 'venue_official',
        label: 'Venue Official',
    },
    {
        value: 'medical_official',
        label: 'Medical Official',
    },
    {
        value: 'other',
        label: 'Other',
    },
];

const toNullableText = (
    value: string
): string | null => {
    const trimmedValue = value.trim();

    return trimmedValue.length > 0
        ? trimmedValue
        : null;
};

const toOptionalNumber = (
    value: string
): number | null => {
    if (value.trim() === '') {
        return null;
    }

    const parsedValue = Number(value);

    return Number.isFinite(parsedValue)
        ? Math.max(0, parsedValue)
        : null;
};

const createDefaultProfile = (
    official: Official
): OfficialMarketplaceProfile => {
    const now = new Date().toISOString();

    return {
        official_id: official.id,
        headline: null,
        summary: official.biography ?? null,
        years_experience: null,
        available_for_hire: false,
        accepts_last_minute: false,
        hourly_rate: null,
        match_rate: null,
        preferred_sports: official.sport_id
            ? [official.sport_id]
            : [],
        preferred_roles: [official.role],
        languages: [],
        created_at: now,
        updated_at: now,
    };
};

const MarketplaceTab: React.FC<Props> = ({
                                             official,
                                         }) => {
    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [successMessage, setSuccessMessage] =
        useState<string | null>(null);

    const [profile, setProfile] =
        useState<OfficialMarketplaceProfile | null>(
            null
        );

    const loadProfile =
        useCallback(async (): Promise<void> => {
            try {
                setLoading(true);
                setError(null);

                const data =
                    await officialService.getMarketplaceProfile(
                        official.id
                    );

                setProfile(
                    data ??
                    createDefaultProfile(
                        official
                    )
                );
            } catch (loadError) {
                console.error(
                    'Failed to load marketplace profile:',
                    loadError
                );

                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : 'Unable to load marketplace profile.'
                );
            } finally {
                setLoading(false);
            }
        }, [official]);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);
    const updateProfile = <
        K extends MarketplaceField
    >(
        field: K,
        value: OfficialMarketplaceProfile[K]
    ): void => {
        setProfile(currentProfile => {
            if (!currentProfile) {
                return currentProfile;
            }

            return {
                ...currentProfile,
                [field]: value,
            };
        });

        setSuccessMessage(null);
    };

    const togglePreferredRole = (
        role: OfficialRole
    ): void => {
        if (!profile) {
            return;
        }

        const isSelected =
            profile.preferred_roles.includes(role);

        updateProfile(
            'preferred_roles',
            isSelected
                ? profile.preferred_roles.filter(
                    selectedRole =>
                        selectedRole !== role
                )
                : [
                    ...profile.preferred_roles,
                    role,
                ]
        );
    };

    const updateLanguages = (
        value: string
    ): void => {
        const languages = value
            .split(',')
            .map(language => language.trim())
            .filter(Boolean);

        updateProfile(
            'languages',
            Array.from(new Set(languages))
        );
    };

    const updatePreferredSports = (
        value: string
    ): void => {
        const sportIds = value
            .split(',')
            .map(sportId => sportId.trim())
            .filter(Boolean);

        updateProfile(
            'preferred_sports',
            Array.from(new Set(sportIds))
        );
    };

    const saveProfile =
        async (): Promise<void> => {
            if (!profile) {
                return;
            }

            try {
                setSaving(true);
                setError(null);
                setSuccessMessage(null);

                const payload:
                    UpsertMarketplaceProfileInput =
                    {
                        official_id:
                        profile.official_id,
                        headline:
                        profile.headline,
                        summary:
                        profile.summary,
                        years_experience:
                        profile.years_experience,
                        available_for_hire:
                        profile.available_for_hire,
                        accepts_last_minute:
                        profile.accepts_last_minute,
                        hourly_rate:
                        profile.hourly_rate,
                        match_rate:
                        profile.match_rate,
                        preferred_sports:
                        profile.preferred_sports,
                        preferred_roles:
                        profile.preferred_roles,
                        languages:
                        profile.languages,
                    };

                const savedProfile =
                    await officialService.upsertMarketplaceProfile(
                        payload
                    );

                setProfile(savedProfile);

                setSuccessMessage(
                    'Marketplace profile saved successfully.'
                );
            } catch (saveError) {
                console.error(
                    'Failed to save marketplace profile:',
                    saveError
                );

                setError(
                    saveError instanceof Error
                        ? saveError.message
                        : 'Unable to save marketplace profile.'
                );
            } finally {
                setSaving(false);
            }
        };

    if (loading || !profile) {
        return (
            <div className="rounded-xl bg-white p-12 text-center text-slate-500">
                Loading marketplace profile...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                    <AlertCircle size={18} />

                    <span>{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
                    {successMessage}
                </div>
            )}

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                        <Globe size={22} />
                        Marketplace Profile
                    </h2>

                    <p className="text-sm text-slate-500">
                        Configure how this official
                        will appear in the TournamentHQ
                        Officials Marketplace.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        void saveProfile()
                    }
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-lime-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-lime-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Save size={18} />

                    {saving
                        ? 'Saving...'
                        : 'Save Profile'}
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Briefcase size={18} />
                        Hire Status
                    </div>

                    <div className="mt-2 text-xl font-bold text-slate-900">
                        {profile.available_for_hire
                            ? 'Available'
                            : 'Unavailable'}
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Clock size={18} />
                        Last-Minute Work
                    </div>

                    <div className="mt-2 text-xl font-bold text-slate-900">
                        {profile.accepts_last_minute
                            ? 'Accepted'
                            : 'Not Accepted'}
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Award size={18} />
                        Preferred Roles
                    </div>

                    <div className="mt-2 text-xl font-bold text-slate-900">
                        {
                            profile.preferred_roles
                                .length
                        }
                    </div>
                </div>
            </div>

            <div className="space-y-5 rounded-xl border bg-white p-6">
                <div>
                    <label className="mb-2 block font-medium text-slate-800">
                        Professional Headline
                    </label>

                    <input
                        type="text"
                        value={profile.headline ?? ''}
                        onChange={event =>
                            updateProfile(
                                'headline',
                                toNullableText(
                                    event.target.value
                                )
                            )
                        }
                        placeholder="Experienced tournament referee"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium text-slate-800">
                        Marketplace Summary
                    </label>

                    <textarea
                        rows={6}
                        value={profile.summary ?? ''}
                        onChange={event =>
                            updateProfile(
                                'summary',
                                toNullableText(
                                    event.target.value
                                )
                            )
                        }
                        placeholder="Describe the official's experience, strengths and availability."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                    />
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                    <div>
                        <label className="mb-2 block font-medium text-slate-800">
                            Years of Experience
                        </label>

                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                                profile.years_experience ??
                                ''
                            }
                            onChange={event =>
                                updateProfile(
                                    'years_experience',
                                    toOptionalNumber(
                                        event.target.value
                                    )
                                )
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block font-medium text-slate-800">
                            Hourly Rate (£)
                        </label>

                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                                profile.hourly_rate ?? ''
                            }
                            onChange={event =>
                                updateProfile(
                                    'hourly_rate',
                                    toOptionalNumber(
                                        event.target.value
                                    )
                                )
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block font-medium text-slate-800">
                            Match Rate (£)
                        </label>

                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                                profile.match_rate ?? ''
                            }
                            onChange={event =>
                                updateProfile(
                                    'match_rate',
                                    toOptionalNumber(
                                        event.target.value
                                    )
                                )
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                        />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                        <input
                            type="checkbox"
                            checked={
                                profile.available_for_hire
                            }
                            onChange={event =>
                                updateProfile(
                                    'available_for_hire',
                                    event.target.checked
                                )
                            }
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-lime-600 focus:ring-lime-500"
                        />

                        <span>
                            <span className="block font-semibold text-slate-900">
                                Available for Hire
                            </span>

                            <span className="mt-1 block text-sm text-slate-500">
                                Allow organisers to consider this official for marketplace work.
                            </span>
                        </span>
                    </label>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                        <input
                            type="checkbox"
                            checked={
                                profile.accepts_last_minute
                            }
                            onChange={event =>
                                updateProfile(
                                    'accepts_last_minute',
                                    event.target.checked
                                )
                            }
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-lime-600 focus:ring-lime-500"
                        />

                        <span>
                            <span className="block font-semibold text-slate-900">
                                Accepts Last-Minute Assignments
                            </span>

                            <span className="mt-1 block text-sm text-slate-500">
                                Mark this official as open to urgent fixture requests.
                            </span>
                        </span>
                    </label>
                </div>

                <div>
                    <label className="mb-2 block font-medium text-slate-800">
                        Preferred Roles
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {ROLE_OPTIONS.map(option => {
                            const selected =
                                profile.preferred_roles.includes(
                                    option.value
                                );

                            return (
                                <label
                                    key={option.value}
                                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                                        selected
                                            ? 'border-lime-500 bg-lime-50'
                                            : 'border-slate-200 bg-white'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() =>
                                            togglePreferredRole(
                                                option.value
                                            )
                                        }
                                        className="h-4 w-4 rounded border-slate-300 text-lime-600 focus:ring-lime-500"
                                    />

                                    <span className="text-sm font-medium text-slate-800">
                                        {option.label}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block font-medium text-slate-800">
                            Preferred Sport IDs
                        </label>

                        <input
                            type="text"
                            value={profile.preferred_sports.join(
                                ', '
                            )}
                            onChange={event =>
                                updatePreferredSports(
                                    event.target.value
                                )
                            }
                            placeholder="Comma-separated sport IDs"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                        />

                        <p className="mt-1 text-xs text-slate-500">
                            Temporary ID input until the sports selector is connected.
                        </p>
                    </div>

                    <div>
                        <label className="mb-2 block font-medium text-slate-800">
                            Languages
                        </label>

                        <input
                            type="text"
                            value={profile.languages.join(
                                ', '
                            )}
                            onChange={event =>
                                updateLanguages(
                                    event.target.value
                                )
                            }
                            placeholder="English, French, Spanish"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                        />

                        <p className="mt-1 text-xs text-slate-500">
                            Enter languages separated by commas.
                        </p>
                    </div>
                </div>
                <div className="rounded-xl border border-lime-200 bg-gradient-to-r from-lime-50 to-white p-5">
                    <div className="flex items-start gap-3">
                        <Globe className="mt-0.5 text-lime-600" />

                        <div>
                            <div className="font-semibold text-slate-900">
                                Marketplace Ready
                            </div>

                            <div className="mt-1 text-sm text-slate-600">
                                This profile is compatible with the future
                                TournamentHQ Officials Marketplace. As new
                                marketplace capabilities are introduced,
                                organisers will be able to search for officials
                                by sport, preferred role, experience,
                                availability, language and pricing.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end border-t pt-6">
                    <button
                        type="button"
                        onClick={() => void saveProfile()}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-lg bg-lime-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-lime-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save size={18} />

                        {saving
                            ? 'Saving...'
                            : 'Save Marketplace Profile'}
                    </button>
                </div>

            </div>

        </div>
    );
};

export default MarketplaceTab;