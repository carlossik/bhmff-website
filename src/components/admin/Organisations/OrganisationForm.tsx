import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'

import {
    ArrowLeft,
    Building2,
    Check,
    ImagePlus,
    ChevronDown,
    Palette,
    RotateCcw,
    Save,
    ShieldCheck,
    Trash2,
    UserRound,
} from 'lucide-react'

import { supabase } from '../../../lib/supabaseClient'

import type {
    Organisation,
    OrganisationFormData,
} from './organisationTypes'

import {
    defaultOrganisation,
} from './organisationTypes'

type OrganisationFormProps = {
    organisation?: Organisation
    saving: boolean
    onSave: (
        organisation: OrganisationFormData,
        provisionalId?: string
    ) => Promise<void>
    onCancel: () => void
}

type FormErrors = Partial<
    Record<
        | 'name'
        | 'slug'
        | 'owner_name'
        | 'owner_email'
        | 'primary_colour'
        | 'secondary_colour'
        | 'accent_colour'
        | 'background_colour'
        | 'surface_colour'
        | 'text_colour'
        | 'logo_url'
        | 'submit',
        string
    >
>

type ColourField = {
    field:
        | 'primary_colour'
        | 'secondary_colour'
        | 'accent_colour'
        | 'background_colour'
        | 'surface_colour'
        | 'text_colour'
    label: string
}

type PalettePreset = {
    id: string
    name: string
    description: string
    colours: Pick<
        OrganisationFormData,
        | 'primary_colour'
        | 'secondary_colour'
        | 'accent_colour'
        | 'background_colour'
        | 'surface_colour'
        | 'text_colour'
    >
}

const palettePresets: readonly PalettePreset[] = [
    {
        id: 'tournamenthq',
        name: 'TournamentHQ Green',
        description: 'The established dark TournamentHQ interface.',
        colours: {
            primary_colour: '#0F766E',
            secondary_colour: '#0F172A',
            accent_colour: '#84CC16',
            background_colour: '#071006',
            surface_colour: '#10190F',
            text_colour: '#FFFFFF',
        },
    },
    {
        id: 'clean-white',
        name: 'Clean White',
        description: 'A bright, modern workspace with professional blue actions.',
        colours: {
            primary_colour: '#FFFFFF',
            secondary_colour: '#0F172A',
            accent_colour: '#2563EB',
            background_colour: '#F8FAFC',
            surface_colour: '#FFFFFF',
            text_colour: '#0F172A',
        },
    },
    {
        id: 'professional-blue',
        name: 'Professional Blue',
        description: 'A dependable enterprise palette for leagues and governing bodies.',
        colours: {
            primary_colour: '#1D4ED8',
            secondary_colour: '#0F172A',
            accent_colour: '#38BDF8',
            background_colour: '#08111F',
            surface_colour: '#101C2E',
            text_colour: '#F8FAFC',
        },
    },
    {
        id: 'royal-purple',
        name: 'Royal Purple',
        description: 'A premium palette for tournaments and showcase events.',
        colours: {
            primary_colour: '#6D28D9',
            secondary_colour: '#1E1B4B',
            accent_colour: '#C4B5FD',
            background_colour: '#120C22',
            surface_colour: '#21143B',
            text_colour: '#FAF5FF',
        },
    },
    {
        id: 'modern-teal',
        name: 'Modern Teal',
        description: 'A fresh, contemporary identity with strong accessibility.',
        colours: {
            primary_colour: '#0F766E',
            secondary_colour: '#134E4A',
            accent_colour: '#2DD4BF',
            background_colour: '#071A18',
            surface_colour: '#0E2925',
            text_colour: '#F0FDFA',
        },
    },
    {
        id: 'premium-black',
        name: 'Premium Black',
        description: 'A restrained black-and-gold presentation.',
        colours: {
            primary_colour: '#111827',
            secondary_colour: '#000000',
            accent_colour: '#F59E0B',
            background_colour: '#030712',
            surface_colour: '#111827',
            text_colour: '#F9FAFB',
        },
    },
]

const colourFields: ColourField[] = [
    {
        field: 'primary_colour',
        label: 'Primary',
    },
    {
        field: 'secondary_colour',
        label: 'Secondary',
    },
    {
        field: 'accent_colour',
        label: 'Accent',
    },
    {
        field: 'background_colour',
        label: 'Background',
    },
    {
        field: 'surface_colour',
        label: 'Surface',
    },
    {
        field: 'text_colour',
        label: 'Text',
    },
]

const allowedImageTypes = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
]

const maximumImageSize =
    5 * 1024 * 1024

const inputClassName =
    'mt-2 w-full rounded-xl border border-lime-900/50 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-lime-500/70 focus:ring-2 focus:ring-lime-500/10 disabled:cursor-not-allowed disabled:opacity-60'

const selectClassName =
    'mt-2 w-full rounded-xl border border-lime-900/50 bg-[#10190d] px-4 py-3 text-white outline-none transition focus:border-lime-500/70 focus:ring-2 focus:ring-lime-500/10 disabled:cursor-not-allowed disabled:opacity-60'

const labelClassName =
    'text-sm font-semibold text-slate-300'

function createSlug(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value.trim()
    )
}

function isValidHexColour(value: string) {
    return /^#[0-9a-fA-F]{6}$/.test(
        value.trim()
    )
}

function hexToRgb(value: string): [number, number, number] | null {
    if (!isValidHexColour(value)) {
        return null
    }

    return [
        Number.parseInt(value.slice(1, 3), 16),
        Number.parseInt(value.slice(3, 5), 16),
        Number.parseInt(value.slice(5, 7), 16),
    ]
}

function getRelativeLuminance(value: string): number {
    const rgb = hexToRgb(value)

    if (!rgb) {
        return 0
    }

    const channels = rgb.map((channel) => {
        const normalised = channel / 255
        return normalised <= 0.03928
            ? normalised / 12.92
            : ((normalised + 0.055) / 1.055) ** 2.4
    })

    return (
        0.2126 * channels[0] +
        0.7152 * channels[1] +
        0.0722 * channels[2]
    )
}

function getContrastRatio(foreground: string, background: string): number {
    const first = getRelativeLuminance(foreground)
    const second = getRelativeLuminance(background)
    const lighter = Math.max(first, second)
    const darker = Math.min(first, second)

    return (lighter + 0.05) / (darker + 0.05)
}

function mapOrganisationToForm(
    organisation: Organisation
): OrganisationFormData {
    return {
        ...defaultOrganisation,
        ...organisation,
        organisation_type:
            organisation.organisation_type ??
            defaultOrganisation.organisation_type,
        logo_url:
            organisation.logo_url ?? '',
        description: organisation.description ?? '',
        sport: organisation.sport ?? '',
        country: organisation.country ?? 'United Kingdom',
        currency: organisation.currency ?? 'GBP',
        founded_year: organisation.founded_year ?? null,
        home_ground: organisation.home_ground ?? '',
        website_url: organisation.website_url ?? '',
        contact_email: organisation.contact_email ?? '',
        facebook_url: organisation.facebook_url ?? '',
        instagram_url: organisation.instagram_url ?? '',
        twitter_url: organisation.twitter_url ?? '',
        youtube_url: organisation.youtube_url ?? '',
        primary_colour:
            organisation.primary_colour ??
            defaultOrganisation.primary_colour,
        secondary_colour:
            organisation.secondary_colour ??
            defaultOrganisation.secondary_colour,
        accent_colour:
            organisation.accent_colour ??
            defaultOrganisation.accent_colour,
        background_colour:
            organisation.background_colour ??
            defaultOrganisation.background_colour,
        surface_colour:
            organisation.surface_colour ??
            defaultOrganisation.surface_colour,
        text_colour:
            organisation.text_colour ??
            defaultOrganisation.text_colour,
        trial_end:
            organisation.trial_end ?? '',
        owner_name:
            organisation.owner_name ?? '',
        owner_email:
            organisation.owner_email ?? '',
        owner_phone:
            organisation.owner_phone ?? '',
        enabled_modules:
            organisation.enabled_modules ??
            defaultOrganisation.enabled_modules,
    }
}

function FieldError({
                        message,
                    }: {
    message?: string
}) {
    if (!message) {
        return null
    }

    return (
        <p className="mt-2 text-xs font-semibold text-red-300">
            {message}
        </p>
    )
}

function SectionHeading({
                            icon: Icon,
                            title,
                            description,
                        }: {
    icon: typeof Building2
    title: string
    description: string
}) {
    return (
        <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-lime-400/10 p-2.5">
                <Icon className="h-5 w-5 text-lime-400" />
            </div>

            <div>
                <h3 className="m-0 text-lg font-bold normal-case text-white">
                    {title}
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                    {description}
                </p>
            </div>
        </div>
    )
}

export function OrganisationForm({
                                     organisation,
                                     saving,
                                     onSave,
                                     onCancel,
                                 }: OrganisationFormProps) {
    const logoInputRef =
        useRef<HTMLInputElement | null>(null)

    const [form, setForm] =
        useState<OrganisationFormData>(
            defaultOrganisation
        )

    const [errors, setErrors] =
        useState<FormErrors>({})

    const [uploadingLogo, setUploadingLogo] =
        useState(false)

    const [showAdvancedColours, setShowAdvancedColours] =
        useState(false)

    const provisionalId = useMemo(
        () =>
            organisation?.id ??
            crypto.randomUUID(),
        [organisation?.id]
    )

    useEffect(() => {
        setForm(
            organisation
                ? mapOrganisationToForm(
                    organisation
                )
                : {
                    ...defaultOrganisation,
                    enabled_modules: [
                        ...defaultOrganisation.enabled_modules,
                    ],
                }
        )

        setErrors({})
    }, [organisation])

    function updateField<
        K extends keyof OrganisationFormData,
    >(
        field: K,
        value: OrganisationFormData[K]
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }))

        setErrors((previous) => ({
            ...previous,
            [field]: undefined,
            submit: undefined,
        }))
    }

    async function handleLogoChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file =
            event.target.files?.[0]

        if (!file) {
            return
        }

        setErrors((previous) => ({
            ...previous,
            logo_url: undefined,
        }))

        if (
            !allowedImageTypes.includes(
                file.type
            )
        ) {
            setErrors((previous) => ({
                ...previous,
                logo_url:
                    'Select a PNG, JPG, WebP or SVG image.',
            }))

            event.target.value = ''
            return
        }

        if (
            file.size >
            maximumImageSize
        ) {
            setErrors((previous) => ({
                ...previous,
                logo_url:
                    'The logo must be smaller than 5 MB.',
            }))

            event.target.value = ''
            return
        }

        setUploadingLogo(true)

        try {
            const extension =
                file.name
                    .split('.')
                    .pop()
                    ?.toLowerCase() ||
                'png'

            const filePath = [
                organisation?.id ??
                provisionalId,
                'organisation-branding',
                `${crypto.randomUUID()}.${extension}`,
            ].join('/')

            const {
                error: uploadError,
            } = await supabase.storage
                .from(
                    'organisation-assets'
                )
                .upload(filePath, file, {
                    cacheControl: '3600',
                    contentType:
                    file.type,
                    upsert: false,
                })

            if (uploadError) {
                throw uploadError
            }

            const {
                data: publicUrlData,
            } = supabase.storage
                .from(
                    'organisation-assets'
                )
                .getPublicUrl(filePath)

            if (
                !publicUrlData.publicUrl
            ) {
                throw new Error(
                    'Supabase did not return a logo URL.'
                )
            }

            updateField(
                'logo_url',
                publicUrlData.publicUrl
            )
        } catch (error) {
            setErrors((previous) => ({
                ...previous,
                logo_url:
                    error instanceof Error
                        ? error.message
                        : 'The logo could not be uploaded.',
            }))
        } finally {
            setUploadingLogo(false)
            event.target.value = ''
        }
    }

    function validateForm() {
        const nextErrors: FormErrors =
            {}

        if (!form.name.trim()) {
            nextErrors.name =
                'Enter the organisation name.'
        }

        if (!form.slug.trim()) {
            nextErrors.slug =
                'Enter the organisation slug.'
        } else if (
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
                form.slug.trim()
            )
        ) {
            nextErrors.slug =
                'Use lowercase letters, numbers and hyphens only.'
        }

        if (!form.owner_name.trim()) {
            nextErrors.owner_name =
                'Enter the administrator name.'
        }

        if (!form.owner_email.trim()) {
            nextErrors.owner_email =
                'Enter the administrator email.'
        } else if (
            !isValidEmail(
                form.owner_email
            )
        ) {
            nextErrors.owner_email =
                'Enter a valid email address.'
        }

        colourFields.forEach(
            ({ field }) => {
                if (
                    !isValidHexColour(
                        form[field]
                    )
                ) {
                    nextErrors[field] =
                        'Use a six-digit hex colour.'
                }
            }
        )

        setErrors(nextErrors)

        return (
            Object.keys(nextErrors)
                .length === 0
        )
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        if (!validateForm()) {
            return
        }

        try {
            await onSave(
                {
                    ...form,
                    name:
                        form.name.trim(),
                    slug: createSlug(
                        form.slug
                    ),
                    logo_url:
                        form.logo_url.trim(),
                    owner_name:
                        form.owner_name.trim(),
                    owner_email:
                        form.owner_email
                            .trim()
                            .toLowerCase(),
                    owner_phone:
                        form.owner_phone.trim(),
                    enabled_modules: [
                        ...form.enabled_modules,
                    ],
                },
                organisation
                    ? undefined
                    : provisionalId
            )
        } catch (error) {
            setErrors({
                submit:
                    error instanceof Error
                        ? error.message
                        : 'Unable to save organisation.',
            })
        }
    }

    function toggleModule(
        module: string
    ) {
        const enabled =
            form.enabled_modules.includes(
                module
            )

        updateField(
            'enabled_modules',
            enabled
                ? form.enabled_modules.filter(
                    (item) =>
                        item !== module
                )
                : [
                    ...form.enabled_modules,
                    module,
                ]
        )
    }

    function applyPalettePreset(
        preset: PalettePreset,
    ) {
        setForm((previous) => ({
            ...previous,
            ...preset.colours,
        }))

        setErrors((previous) => ({
            ...previous,
            primary_colour: undefined,
            secondary_colour: undefined,
            accent_colour: undefined,
            background_colour: undefined,
            surface_colour: undefined,
            text_colour: undefined,
            submit: undefined,
        }))
    }

    const textContrast = getContrastRatio(
        form.text_colour,
        form.background_colour,
    )

    const surfaceContrast = getContrastRatio(
        form.text_colour,
        form.surface_colour,
    )

    const paletteIsReadable =
        textContrast >= 4.5 &&
        surfaceContrast >= 4.5

    const controlsDisabled =
        saving || uploadingLogo

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6"
            noValidate
        >
            <section className="overflow-hidden rounded-3xl border border-lime-900/50 bg-gradient-to-br from-[#1b2a15] via-[#14200f] to-[#0d140a] p-6 lg:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-lime-400/10 p-3">
                            <Building2 className="h-9 w-9 text-lime-400" />
                        </div>

                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-400">
                                Organisation administration
                            </p>

                            <h2 className="mt-2 text-3xl font-bold normal-case text-white">
                                {organisation
                                    ? 'Edit organisation'
                                    : 'Add organisation'}
                            </h2>

                            <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                                Complete the organisation, administrator,
                                subscription and branding details in one place.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={
                            controlsDisabled
                        }
                        onClick={onCancel}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-900/60 bg-black/20 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-lime-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to organisations
                    </button>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-12">
                <section className="rounded-3xl border border-lime-900/50 bg-[#10190f] p-6 xl:col-span-7">
                    <SectionHeading
                        icon={Building2}
                        title="Organisation details"
                        description="Workspace identity, status and public-site availability."
                    />

                    <div className="grid gap-5 md:grid-cols-2">
                        <label>
                            <span className={labelClassName}>
                                Organisation name
                                <span className="ml-1 text-red-400">
                                    *
                                </span>
                            </span>

                            <input
                                type="text"
                                value={form.name}
                                disabled={
                                    controlsDisabled
                                }
                                onChange={(event) => {
                                    const value =
                                        event.target.value

                                    updateField(
                                        'name',
                                        value
                                    )

                                    if (!organisation) {
                                        updateField(
                                            'slug',
                                            createSlug(
                                                value
                                            )
                                        )
                                    }
                                }}
                                className={inputClassName}
                            />

                            <FieldError
                                message={
                                    errors.name
                                }
                            />
                        </label>

                        <label>
                            <span className={labelClassName}>
                                Organisation slug
                                <span className="ml-1 text-red-400">
                                    *
                                </span>
                            </span>

                            <input
                                type="text"
                                value={form.slug}
                                disabled={
                                    controlsDisabled
                                }
                                onChange={(event) =>
                                    updateField(
                                        'slug',
                                        createSlug(
                                            event.target.value
                                        )
                                    )
                                }
                                className={inputClassName}
                            />

                            <FieldError
                                message={
                                    errors.slug
                                }
                            />
                        </label>

                        <label>
                            <span className={labelClassName}>
                                Organisation status
                            </span>

                            <select
                                value={form.status}
                                disabled={
                                    controlsDisabled
                                }
                                onChange={(event) =>
                                    updateField(
                                        'status',
                                        event.target.value as OrganisationFormData['status']
                                    )
                                }
                                className={selectClassName}
                            >
                                <option value="active">
                                    Active
                                </option>

                                <option value="inactive">
                                    Inactive
                                </option>

                                <option value="suspended">
                                    Suspended
                                </option>
                            </select>
                        </label>

                        <label>
                            <span className={labelClassName}>
                                Organisation type
                            </span>

                            <select
                                value={form.organisation_type}
                                disabled={controlsDisabled}
                                onChange={(event) =>
                                    updateField(
                                        'organisation_type',
                                        event.target.value as OrganisationFormData['organisation_type']
                                    )
                                }
                                className={selectClassName}
                            >
                                <option value="competition_organiser">
                                    Competition organiser
                                </option>
                                <option value="club">
                                    Club / team
                                </option>
                            </select>

                            <span className="mt-2 block text-xs leading-5 text-slate-400">
                                {form.organisation_type === 'club'
                                    ? 'Manage your own seasons, fixtures, results, squad, officials, statistics and media without running a league.'
                                    : 'Manage leagues, tournaments, competitions, participating clubs, fixtures, results and competition operations.'}
                            </span>
                        </label>

                        <label className="flex min-h-[76px] items-center gap-3 rounded-xl border border-lime-900/50 bg-black/20 px-4 py-3">
                            <input
                                type="checkbox"
                                checked={
                                    form.public_site_enabled
                                }
                                disabled={
                                    controlsDisabled
                                }
                                onChange={(event) =>
                                    updateField(
                                        'public_site_enabled',
                                        event.target.checked
                                    )
                                }
                                className="h-5 w-5 rounded border-lime-900 bg-[#10190d] text-lime-500 focus:ring-lime-500"
                            />

                            <span>
                                <span className="block text-sm font-semibold text-white">
                                    Enable public site
                                </span>

                                <span className="mt-1 block text-xs leading-5 text-slate-400">
                                    {form.organisation_type === 'club'
                                        ? 'Publish club fixtures, results, statistics, news and media publicly.'
                                        : 'Publish competitions, fixtures and results publicly.'}
                                </span>
                            </span>
                        </label>
                    </div>
                </section>

                <section className="rounded-3xl border border-lime-900/50 bg-[#10190f] p-6 xl:col-span-5">
                    <SectionHeading
                        icon={UserRound}
                        title="Administrator"
                        description="Primary owner and customer contact."
                    />

                    <div className="grid gap-5">
                        <label>
                            <span className={labelClassName}>
                                Administrator name
                                <span className="ml-1 text-red-400">
                                    *
                                </span>
                            </span>

                            <input
                                type="text"
                                value={
                                    form.owner_name
                                }
                                disabled={
                                    controlsDisabled
                                }
                                onChange={(event) =>
                                    updateField(
                                        'owner_name',
                                        event.target.value
                                    )
                                }
                                className={inputClassName}
                            />

                            <FieldError
                                message={
                                    errors.owner_name
                                }
                            />
                        </label>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <label>
                                <span className={labelClassName}>
                                    Email
                                    <span className="ml-1 text-red-400">
                                        *
                                    </span>
                                </span>

                                <input
                                    type="email"
                                    value={
                                        form.owner_email
                                    }
                                    disabled={
                                        controlsDisabled
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            'owner_email',
                                            event.target.value
                                        )
                                    }
                                    className={inputClassName}
                                />

                                <FieldError
                                    message={
                                        errors.owner_email
                                    }
                                />
                            </label>

                            <label>
                                <span className={labelClassName}>
                                    Phone
                                </span>

                                <input
                                    type="tel"
                                    value={
                                        form.owner_phone
                                    }
                                    disabled={
                                        controlsDisabled
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            'owner_phone',
                                            event.target.value
                                        )
                                    }
                                    className={inputClassName}
                                />
                            </label>
                        </div>
                    </div>
                </section>

                {form.organisation_type === 'club' && (
                    <section className="rounded-3xl border border-lime-900/50 bg-[#10190f] p-6 xl:col-span-12">
                        <SectionHeading
                            icon={Building2}
                            title="Club profile"
                            description="Public club identity and contact information used across the club website and match-day experience."
                        />

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <label className="md:col-span-2 xl:col-span-3">
                                <span className={labelClassName}>About the club</span>
                                <textarea
                                    value={form.description}
                                    disabled={controlsDisabled}
                                    onChange={(event) => updateField('description', event.target.value)}
                                    rows={4}
                                    placeholder="Tell players, parents, supporters and visitors about the club."
                                    className={inputClassName}
                                />
                            </label>

                            <label>
                                <span className={labelClassName}>Sport</span>
                                <select
                                    value={form.sport}
                                    disabled={controlsDisabled}
                                    onChange={(event) => updateField('sport', event.target.value)}
                                    className={selectClassName}
                                >
                                    <option value="">Select sport</option>
                                    <option value="football">Football</option>
                                    <option value="basketball">Basketball</option>
                                    <option value="rugby">Rugby</option>
                                    <option value="cricket">Cricket</option>
                                    <option value="netball">Netball</option>
                                    <option value="hockey">Hockey</option>
                                    <option value="volleyball">Volleyball</option>
                                    <option value="other">Other</option>
                                </select>
                            </label>

                            <label>
                                <span className={labelClassName}>Country</span>
                                <input
                                    type="text"
                                    value={form.country}
                                    disabled={controlsDisabled}
                                    onChange={(event) => updateField('country', event.target.value)}
                                    className={inputClassName}
                                />
                            </label>

                            <label>
                                <span className={labelClassName}>Currency</span>
                                <select
                                    value={form.currency}
                                    disabled={controlsDisabled}
                                    onChange={(event) => updateField('currency', event.target.value)}
                                    className={selectClassName}
                                >
                                    <option value="GBP">GBP (£)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GHS">GHS (GH₵)</option>
                                    <option value="NGN">NGN (₦)</option>
                                    <option value="CAD">CAD (C$)</option>
                                    <option value="AUD">AUD (A$)</option>
                                </select>
                            </label>

                            <label>
                                <span className={labelClassName}>Founded</span>
                                <input
                                    type="number"
                                    min={1800}
                                    max={new Date().getFullYear()}
                                    value={form.founded_year ?? ''}
                                    disabled={controlsDisabled}
                                    onChange={(event) =>
                                        updateField(
                                            'founded_year',
                                            event.target.value ? Number(event.target.value) : null
                                        )
                                    }
                                    className={inputClassName}
                                />
                            </label>

                            <label className="md:col-span-2">
                                <span className={labelClassName}>Home ground</span>
                                <input
                                    type="text"
                                    value={form.home_ground}
                                    disabled={controlsDisabled}
                                    onChange={(event) => updateField('home_ground', event.target.value)}
                                    placeholder="e.g. Meridian Sports Ground"
                                    className={inputClassName}
                                />
                            </label>

                            <label>
                                <span className={labelClassName}>Club website</span>
                                <input type="url" value={form.website_url} disabled={controlsDisabled}
                                    onChange={(event) => updateField('website_url', event.target.value)}
                                    placeholder="https://..." className={inputClassName} />
                            </label>

                            <label>
                                <span className={labelClassName}>Public contact email</span>
                                <input type="email" value={form.contact_email} disabled={controlsDisabled}
                                    onChange={(event) => updateField('contact_email', event.target.value)}
                                    placeholder="club@example.com" className={inputClassName} />
                            </label>

                            <label>
                                <span className={labelClassName}>Facebook</span>
                                <input type="url" value={form.facebook_url} disabled={controlsDisabled}
                                    onChange={(event) => updateField('facebook_url', event.target.value)}
                                    placeholder="https://facebook.com/..." className={inputClassName} />
                            </label>

                            <label>
                                <span className={labelClassName}>Instagram</span>
                                <input type="url" value={form.instagram_url} disabled={controlsDisabled}
                                    onChange={(event) => updateField('instagram_url', event.target.value)}
                                    placeholder="https://instagram.com/..." className={inputClassName} />
                            </label>

                            <label>
                                <span className={labelClassName}>X / Twitter</span>
                                <input type="url" value={form.twitter_url} disabled={controlsDisabled}
                                    onChange={(event) => updateField('twitter_url', event.target.value)}
                                    placeholder="https://x.com/..." className={inputClassName} />
                            </label>

                            <label>
                                <span className={labelClassName}>YouTube</span>
                                <input type="url" value={form.youtube_url} disabled={controlsDisabled}
                                    onChange={(event) => updateField('youtube_url', event.target.value)}
                                    placeholder="https://youtube.com/..." className={inputClassName} />
                            </label>
                        </div>
                    </section>
                )}

                <section className="rounded-3xl border border-lime-900/50 bg-[#10190f] p-6 xl:col-span-4">
                    <SectionHeading
                        icon={ImagePlus}
                        title={form.organisation_type === 'club' ? 'Club logo' : 'Organisation logo'}
                        description={form.organisation_type === 'club' ? 'Upload the club crest or brand mark used on the public website.' : 'Upload the customer brand mark.'}
                    />

                    <div className="flex items-center gap-4">
                        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-lime-900/50 bg-black/20 p-3">
                            {form.logo_url ? (
                                <img
                                    src={
                                        form.logo_url
                                    }
                                    alt=""
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <Building2 className="h-10 w-10 text-lime-400/60" />
                            )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-3">
                            <button
                                type="button"
                                disabled={
                                    controlsDisabled
                                }
                                onClick={() =>
                                    logoInputRef.current?.click()
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-3 text-sm font-black text-[#071006] transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <ImagePlus className="h-4 w-4" />

                                {uploadingLogo
                                    ? 'Uploading...'
                                    : form.logo_url
                                        ? 'Replace logo'
                                        : 'Upload logo'}
                            </button>

                            {form.logo_url && (
                                <button
                                    type="button"
                                    disabled={
                                        controlsDisabled
                                    }
                                    onClick={() =>
                                        updateField(
                                            'logo_url',
                                            ''
                                        )
                                    }
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-800/50 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Remove logo
                                </button>
                            )}
                        </div>
                    </div>

                    <input
                        ref={logoInputRef}
                        type="file"
                        hidden
                        accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                        disabled={
                            controlsDisabled
                        }
                        onChange={
                            handleLogoChange
                        }
                    />

                    <FieldError
                        message={
                            errors.logo_url
                        }
                    />
                </section>

                <section className="rounded-3xl border border-lime-900/50 bg-[#10190f] p-6 xl:col-span-4">
                    <SectionHeading
                        icon={ShieldCheck}
                        title="Subscription"
                        description="Plan, state and account limits."
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label>
                            <span className={labelClassName}>
                                Plan
                            </span>

                            <select
                                value={
                                    form.subscription_plan
                                }
                                disabled={
                                    controlsDisabled
                                }
                                onChange={(event) =>
                                    updateField(
                                        'subscription_plan',
                                        event.target.value as OrganisationFormData['subscription_plan']
                                    )
                                }
                                className={selectClassName}
                            >
                                <option value="starter">
                                    Starter
                                </option>

                                <option value="professional">
                                    Professional
                                </option>

                                <option value="enterprise">
                                    Enterprise
                                </option>
                            </select>
                        </label>

                        <label>
                            <span className={labelClassName}>
                                Status
                            </span>

                            <select
                                value={
                                    form.subscription_status
                                }
                                disabled={
                                    controlsDisabled
                                }
                                onChange={(event) =>
                                    updateField(
                                        'subscription_status',
                                        event.target.value as OrganisationFormData['subscription_status']
                                    )
                                }
                                className={selectClassName}
                            >
                                <option value="trial">
                                    Trial
                                </option>

                                <option value="active">
                                    Active
                                </option>

                                <option value="past_due">
                                    Past due
                                </option>

                                <option value="cancelled">
                                    Cancelled
                                </option>
                            </select>
                        </label>

                        <label>
                            <span className={labelClassName}>
                                Maximum users
                            </span>

                            <input
                                type="number"
                                min={1}
                                value={
                                    form.max_users
                                }
                                disabled={
                                    controlsDisabled
                                }
                                onChange={(event) =>
                                    updateField(
                                        'max_users',
                                        Number(
                                            event.target.value
                                        )
                                    )
                                }
                                className={inputClassName}
                            />
                        </label>

                        <label>
                            <span className={labelClassName}>
                                Maximum competitions
                            </span>

                            <input
                                type="number"
                                min={1}
                                value={
                                    form.max_competitions
                                }
                                disabled={
                                    controlsDisabled
                                }
                                onChange={(event) =>
                                    updateField(
                                        'max_competitions',
                                        Number(
                                            event.target.value
                                        )
                                    )
                                }
                                className={inputClassName}
                            />
                        </label>
                    </div>
                </section>

                <section className="rounded-3xl border border-lime-900/50 bg-[#10190f] p-6 xl:col-span-4">
                    <SectionHeading
                        icon={Check}
                        title="Enabled modules"
                        description="Choose the features available to this organisation."
                    />

                    <div className="grid grid-cols-2 gap-2">
                        {defaultOrganisation.enabled_modules.map(
                            (module) => {
                                const enabled =
                                    form.enabled_modules.includes(
                                        module
                                    )

                                return (
                                    <button
                                        key={module}
                                        type="button"
                                        disabled={
                                            controlsDisabled
                                        }
                                        onClick={() =>
                                            toggleModule(
                                                module
                                            )
                                        }
                                        className={[
                                            'flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition',
                                            enabled
                                                ? 'border-lime-700/50 bg-lime-500/10 text-lime-200'
                                                : 'border-lime-900/40 bg-black/20 text-slate-400 hover:border-lime-700/50',
                                        ].join(' ')}
                                    >
                                        <span className="truncate">
                                            {module}
                                        </span>

                                        <span
                                            className={[
                                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                                                enabled
                                                    ? 'border-lime-400 bg-lime-400 text-[#071006]'
                                                    : 'border-slate-600 text-transparent',
                                            ].join(' ')}
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </span>
                                    </button>
                                )
                            }
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-lime-900/50 bg-[#10190f] p-6 xl:col-span-12">
                    <SectionHeading
                        icon={Palette}
                        title="Brand palette"
                        description="Choose a professionally balanced palette, preview it immediately and customise individual colours only when required."
                    />

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                        <div className="space-y-5">
                            <div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <h4 className="m-0 text-base font-bold text-white">
                                            Recommended palettes
                                        </h4>

                                        <p className="mt-1 text-sm leading-6 text-slate-400">
                                            Select a complete palette rather than trying to coordinate six colours independently.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={controlsDisabled}
                                        onClick={() =>
                                            applyPalettePreset(
                                                palettePresets[0],
                                            )
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-900/60 bg-black/20 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-lime-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        Reset default
                                    </button>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {palettePresets.map((preset) => {
                                        const selected =
                                            colourFields.every(
                                                ({ field }) =>
                                                    form[field].toUpperCase() ===
                                                    preset.colours[field].toUpperCase(),
                                            )

                                        return (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                disabled={controlsDisabled}
                                                onClick={() =>
                                                    applyPalettePreset(
                                                        preset,
                                                    )
                                                }
                                                className={[
                                                    'rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60',
                                                    selected
                                                        ? 'border-lime-400 bg-lime-500/10 ring-2 ring-lime-400/20'
                                                        : 'border-lime-900/40 bg-black/20 hover:border-lime-700/60',
                                                ].join(' ')}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    {colourFields.map(
                                                        ({ field }) => (
                                                            <span
                                                                key={field}
                                                                aria-hidden="true"
                                                                className="h-7 flex-1 rounded-md border border-white/10"
                                                                style={{
                                                                    backgroundColor:
                                                                        preset.colours[field],
                                                                }}
                                                            />
                                                        ),
                                                    )}
                                                </div>

                                                <div className="mt-3 flex items-center justify-between gap-3">
                                                    <strong className="text-sm text-white">
                                                        {preset.name}
                                                    </strong>

                                                    {selected && (
                                                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-lime-400 text-[#071006]">
                                                            <Check className="h-4 w-4" />
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="mt-2 text-xs leading-5 text-slate-400">
                                                    {preset.description}
                                                </p>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-lime-900/40 bg-black/20">
                                <button
                                    type="button"
                                    disabled={controlsDisabled}
                                    onClick={() =>
                                        setShowAdvancedColours(
                                            (current) => !current,
                                        )
                                    }
                                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                                    aria-expanded={showAdvancedColours}
                                >
                                    <span>
                                        <span className="block text-sm font-bold text-white">
                                            Advanced colour controls
                                        </span>

                                        <span className="mt-1 block text-xs leading-5 text-slate-400">
                                            Fine-tune individual colours using a picker or a six-digit hex value.
                                        </span>
                                    </span>

                                    <ChevronDown
                                        className={[
                                            'h-5 w-5 shrink-0 text-lime-400 transition-transform',
                                            showAdvancedColours
                                                ? 'rotate-180'
                                                : '',
                                        ].join(' ')}
                                    />
                                </button>

                                {showAdvancedColours && (
                                    <div className="grid gap-4 border-t border-lime-900/40 p-5 sm:grid-cols-2 lg:grid-cols-3">
                                        {colourFields.map(
                                            ({ field, label }) => (
                                                <label
                                                    key={field}
                                                    className="rounded-2xl border border-lime-900/40 bg-[#10190d] p-4"
                                                >
                                                    <span className={labelClassName}>
                                                        {label}
                                                    </span>

                                                    <div className="mt-3 flex items-center gap-3">
                                                        <input
                                                            type="color"
                                                            value={form[field]}
                                                            disabled={controlsDisabled}
                                                            onChange={(event) =>
                                                                updateField(
                                                                    field,
                                                                    event.target.value.toUpperCase(),
                                                                )
                                                            }
                                                            className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-lime-900/50 bg-[#10190d] p-1"
                                                        />

                                                        <input
                                                            type="text"
                                                            value={form[field]}
                                                            disabled={controlsDisabled}
                                                            onChange={(event) =>
                                                                updateField(
                                                                    field,
                                                                    event.target.value.toUpperCase(),
                                                                )
                                                            }
                                                            className="min-w-0 flex-1 rounded-lg border border-lime-900/50 bg-black/20 px-3 py-2 font-mono text-xs uppercase text-white outline-none focus:border-lime-500/70"
                                                        />
                                                    </div>

                                                    <FieldError
                                                        message={errors[field]}
                                                    />
                                                </label>
                                            ),
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <aside className="space-y-4">
                            <div className="rounded-2xl border border-lime-900/40 bg-black/20 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-lime-400">
                                            Live preview
                                        </p>

                                        <h4 className="mt-1 text-base font-bold text-white">
                                            Organisation portal
                                        </h4>
                                    </div>

                                    <span
                                        className={[
                                            'rounded-full border px-3 py-1 text-xs font-bold',
                                            paletteIsReadable
                                                ? 'border-lime-700/50 bg-lime-500/10 text-lime-300'
                                                : 'border-amber-700/50 bg-amber-500/10 text-amber-200',
                                        ].join(' ')}
                                    >
                                        {paletteIsReadable
                                            ? 'Readable'
                                            : 'Low contrast'}
                                    </span>
                                </div>

                                <div
                                    className="mt-4 overflow-hidden rounded-2xl border shadow-xl"
                                    style={{
                                        backgroundColor:
                                        form.background_colour,
                                        borderColor:
                                        form.accent_colour,
                                        color:
                                        form.text_colour,
                                    }}
                                >
                                    <div
                                        className="flex items-center justify-between border-b px-4 py-3"
                                        style={{
                                            backgroundColor:
                                            form.surface_colour,
                                            borderColor:
                                            form.accent_colour,
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="h-9 w-9 rounded-xl"
                                                style={{
                                                    backgroundColor:
                                                    form.primary_colour,
                                                }}
                                            />

                                            <div>
                                                <strong className="block text-sm">
                                                    {form.name ||
                                                        'Your club'}
                                                </strong>

                                                <span className="text-xs opacity-70">
                                                    {form.organisation_type === 'club' ? 'Club Administration' : 'Competition Administration'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            className="rounded-lg px-3 py-2 text-xs font-black"
                                            style={{
                                                backgroundColor:
                                                form.accent_colour,
                                                color:
                                                    getContrastRatio(
                                                        '#071006',
                                                        form.accent_colour,
                                                    ) >= 4.5
                                                        ? '#071006'
                                                        : '#FFFFFF',
                                            }}
                                        >
                                            View site
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-[94px_1fr] gap-3 p-3">
                                        <div
                                            className="space-y-2 rounded-xl p-2"
                                            style={{
                                                backgroundColor:
                                                form.surface_colour,
                                            }}
                                        >
                                            {form.organisation_type === 'club' ? ['Dashboard', 'Squad', 'Fixtures'] : ['Dashboard', 'Teams', 'Fixtures'].map(
                                                (item, index) => (
                                                    <div
                                                        key={item}
                                                        className="rounded-lg px-2 py-2 text-[10px] font-bold"
                                                        style={{
                                                            backgroundColor:
                                                                index === 0
                                                                    ? form.accent_colour
                                                                    : 'transparent',
                                                            color:
                                                                index === 0
                                                                    ? getContrastRatio(
                                                                        '#071006',
                                                                        form.accent_colour,
                                                                    ) >= 4.5
                                                                        ? '#071006'
                                                                        : '#FFFFFF'
                                                                    : form.text_colour,
                                                            opacity:
                                                                index === 0
                                                                    ? 1
                                                                    : 0.72,
                                                        }}
                                                    >
                                                        {item}
                                                    </div>
                                                ),
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <div
                                                className="h-11 rounded-xl"
                                                style={{
                                                    backgroundColor:
                                                    form.surface_colour,
                                                }}
                                            />

                                            <div className="grid grid-cols-2 gap-3">
                                                {[1, 2].map((item) => (
                                                    <div
                                                        key={item}
                                                        className="h-20 rounded-xl border"
                                                        style={{
                                                            backgroundColor:
                                                            form.surface_colour,
                                                            borderColor:
                                                            form.primary_colour,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                className={[
                                    'rounded-2xl border px-4 py-3 text-sm leading-6',
                                    paletteIsReadable
                                        ? 'border-lime-800/50 bg-lime-500/10 text-lime-200'
                                        : 'border-amber-700/50 bg-amber-500/10 text-amber-100',
                                ].join(' ')}
                            >
                                {paletteIsReadable
                                    ? 'The selected text, background and surface colours meet the recommended contrast threshold.'
                                    : 'Increase the contrast between the text colour and the background or surface colour before saving.'}
                            </div>
                        </aside>
                    </div>
                </section>
            </div>

            {errors.submit && (
                <div
                    role="alert"
                    className="rounded-2xl border border-red-800/50 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-200"
                >
                    {errors.submit}
                </div>
            )}

            <section className="flex flex-col gap-4 rounded-3xl border border-lime-800/50 bg-gradient-to-r from-[#15250f] to-[#0d170b] p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="m-0 text-lg font-bold normal-case text-white">
                        {organisation
                            ? 'Save organisation changes'
                            : 'Create this organisation'}
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                        All details above will be validated before saving.
                    </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <button
                        type="button"
                        disabled={
                            controlsDisabled
                        }
                        onClick={onCancel}
                        className="inline-flex min-h-12 items-center justify-center rounded-xl border border-lime-900/60 bg-black/20 px-6 py-3 text-sm font-bold text-slate-200 transition hover:border-lime-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={
                            controlsDisabled
                        }
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-lime-400 px-7 py-3 text-sm font-black text-[#071006] transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save className="h-5 w-5" />

                        {saving
                            ? organisation
                                ? 'Updating organisation...'
                                : 'Creating organisation...'
                            : organisation
                                ? 'Update organisation'
                                : 'Create organisation'}
                    </button>
                </div>
            </section>
        </form>
    )
}