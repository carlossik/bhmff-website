import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'

import {
    Building2,
    Check,
    ImagePlus,
    Trash2,
    UserRound,
} from 'lucide-react'

import { Modal } from '../../common/Modal'
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

function mapOrganisationToForm(
    organisation: Organisation
): OrganisationFormData {
    return {
        ...defaultOrganisation,
        ...organisation,
        logo_url:
            organisation.logo_url ?? '',
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
        <p className="mt-1.5 text-xs font-semibold text-red-300">
            {message}
        </p>
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

    const controlsDisabled =
        saving || uploadingLogo

    return (
        <Modal
            title={
                organisation
                    ? 'Organisation Settings'
                    : 'Add Organisation'
            }
            onClose={onCancel}
        >
            <form
                onSubmit={handleSubmit}
                className="mx-auto w-full max-w-[1320px] font-sans"
                noValidate
            >
                <div className="rounded-3xl border border-emerald-400/20 bg-[#0b170c] p-5 shadow-2xl sm:p-6">
                    <div className="mb-5 flex items-center justify-between gap-4 border-b border-emerald-300/15 pb-4">
                        <div>
                            <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
                                TournamentHQ setup
                            </p>

                            <h3 className="m-0 mt-1 text-xl font-bold normal-case text-white">
                                Complete organisation details
                            </h3>
                        </div>

                        <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 sm:flex">
                            <Building2 className="h-4 w-4" />
                            Single-page setup
                        </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-12">
                        <section className="rounded-2xl border border-emerald-300/15 bg-[#112214] p-4 xl:col-span-7">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                                    <Building2 className="h-5 w-5" />
                                </div>

                                <div>
                                    <h4 className="m-0 text-sm font-bold text-white">
                                        Organisation
                                    </h4>

                                    <p className="m-0 mt-0.5 text-xs text-slate-400">
                                        Identity and public-site settings
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-200">
                                        Organisation name
                                        <span className="ml-1 text-red-400">
                                            *
                                        </span>
                                    </span>

                                    <input
                                        type="text"
                                        value={form.name}
                                        disabled={controlsDisabled}
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
                                        className="mt-1.5 w-full rounded-lg border border-emerald-300/15 bg-[#081109] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15"
                                    />

                                    <FieldError
                                        message={
                                            errors.name
                                        }
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-200">
                                        Organisation slug
                                        <span className="ml-1 text-red-400">
                                            *
                                        </span>
                                    </span>

                                    <input
                                        type="text"
                                        value={form.slug}
                                        disabled={controlsDisabled}
                                        onChange={(event) =>
                                            updateField(
                                                'slug',
                                                createSlug(
                                                    event.target.value
                                                )
                                            )
                                        }
                                        className="mt-1.5 w-full rounded-lg border border-emerald-300/15 bg-[#081109] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15"
                                    />

                                    <FieldError
                                        message={
                                            errors.slug
                                        }
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-200">
                                        Status
                                    </span>

                                    <select
                                        value={form.status}
                                        disabled={controlsDisabled}
                                        onChange={(event) =>
                                            updateField(
                                                'status',
                                                event.target.value as OrganisationFormData['status']
                                            )
                                        }
                                        className="mt-1.5 w-full rounded-lg border border-emerald-300/15 bg-[#081109] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
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

                                <label className="flex min-h-[64px] items-center gap-3 rounded-lg border border-emerald-300/15 bg-[#081109] px-3 py-2.5">
                                    <input
                                        type="checkbox"
                                        checked={
                                            form.public_site_enabled
                                        }
                                        disabled={controlsDisabled}
                                        onChange={(event) =>
                                            updateField(
                                                'public_site_enabled',
                                                event.target.checked
                                            )
                                        }
                                        className="h-4 w-4 rounded border-emerald-300/30 bg-transparent text-emerald-500 focus:ring-emerald-500"
                                    />

                                    <span>
                                        <span className="block text-xs font-semibold text-white">
                                            Enable public site
                                        </span>

                                        <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">
                                            Publish fixtures and results publicly.
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-emerald-300/15 bg-[#112214] p-4 xl:col-span-5">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                                    <UserRound className="h-5 w-5" />
                                </div>

                                <div>
                                    <h4 className="m-0 text-sm font-bold text-white">
                                        Administrator
                                    </h4>

                                    <p className="m-0 mt-0.5 text-xs text-slate-400">
                                        Primary customer contact
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-200">
                                        Name
                                        <span className="ml-1 text-red-400">
                                            *
                                        </span>
                                    </span>

                                    <input
                                        type="text"
                                        value={form.owner_name}
                                        disabled={controlsDisabled}
                                        onChange={(event) =>
                                            updateField(
                                                'owner_name',
                                                event.target.value
                                            )
                                        }
                                        className="mt-1.5 w-full rounded-lg border border-emerald-300/15 bg-[#081109] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15"
                                    />

                                    <FieldError
                                        message={
                                            errors.owner_name
                                        }
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-200">
                                        Email
                                        <span className="ml-1 text-red-400">
                                            *
                                        </span>
                                    </span>

                                    <input
                                        type="email"
                                        value={form.owner_email}
                                        disabled={controlsDisabled}
                                        onChange={(event) =>
                                            updateField(
                                                'owner_email',
                                                event.target.value
                                            )
                                        }
                                        className="mt-1.5 w-full rounded-lg border border-emerald-300/15 bg-[#081109] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15"
                                    />

                                    <FieldError
                                        message={
                                            errors.owner_email
                                        }
                                    />
                                </label>

                                <label className="block sm:col-span-2 xl:col-span-1">
                                    <span className="text-xs font-semibold text-slate-200">
                                        Phone
                                    </span>

                                    <input
                                        type="tel"
                                        value={form.owner_phone}
                                        disabled={controlsDisabled}
                                        onChange={(event) =>
                                            updateField(
                                                'owner_phone',
                                                event.target.value
                                            )
                                        }
                                        className="mt-1.5 w-full rounded-lg border border-emerald-300/15 bg-[#081109] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15"
                                    />
                                </label>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-emerald-300/15 bg-[#112214] p-4 xl:col-span-4">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                                    <ImagePlus className="h-5 w-5" />
                                </div>

                                <div>
                                    <h4 className="m-0 text-sm font-bold text-white">
                                        Logo
                                    </h4>

                                    <p className="m-0 mt-0.5 text-xs text-slate-400">
                                        PNG, JPG, WebP or SVG
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-emerald-300/20 bg-[#081109] p-2">
                                    {form.logo_url ? (
                                        <img
                                            src={form.logo_url}
                                            alt=""
                                            className="h-full w-full object-contain"
                                        />
                                    ) : (
                                        <Building2 className="h-9 w-9 text-emerald-300/60" />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1 space-y-2">
                                    <button
                                        type="button"
                                        disabled={controlsDisabled}
                                        onClick={() =>
                                            logoInputRef.current?.click()
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60"
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
                                            disabled={controlsDisabled}
                                            onClick={() =>
                                                updateField(
                                                    'logo_url',
                                                    ''
                                                )
                                            }
                                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/15 disabled:opacity-60"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>

                            <input
                                ref={logoInputRef}
                                type="file"
                                hidden
                                accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                                disabled={controlsDisabled}
                                onChange={handleLogoChange}
                            />

                            <FieldError
                                message={
                                    errors.logo_url
                                }
                            />
                        </section>

                        <section className="rounded-2xl border border-emerald-300/15 bg-[#112214] p-4 xl:col-span-4">
                            <div className="mb-4">
                                <h4 className="m-0 text-sm font-bold text-white">
                                    Subscription
                                </h4>

                                <p className="m-0 mt-0.5 text-xs text-slate-400">
                                    Plan and usage limits
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-200">
                                        Plan
                                    </span>

                                    <select
                                        value={
                                            form.subscription_plan
                                        }
                                        disabled={controlsDisabled}
                                        onChange={(event) =>
                                            updateField(
                                                'subscription_plan',
                                                event.target.value as OrganisationFormData['subscription_plan']
                                            )
                                        }
                                        className="mt-1.5 w-full rounded-lg border border-emerald-300/15 bg-[#081109] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
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

                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-200">
                                        Status
                                    </span>

                                    <select
                                        value={
                                            form.subscription_status
                                        }
                                        disabled={controlsDisabled}
                                        onChange={(event) =>
                                            updateField(
                                                'subscription_status',
                                                event.target.value as OrganisationFormData['subscription_status']
                                            )
                                        }
                                        className="mt-1.5 w-full rounded-lg border border-emerald-300/15 bg-[#081109] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
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

                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-200">
                                        Max users
                                    </span>

                                    <input
                                        type="number"
                                        min={1}
                                        value={form.max_users}
                                        disabled={controlsDisabled}
                                        onChange={(event) =>
                                            updateField(
                                                'max_users',
                                                Number(
                                                    event.target.value
                                                )
                                            )
                                        }
                                        className="mt-1.5 w-full rounded-lg border border-emerald-300/15 bg-[#081109] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-200">
                                        Max competitions
                                    </span>

                                    <input
                                        type="number"
                                        min={1}
                                        value={
                                            form.max_competitions
                                        }
                                        disabled={controlsDisabled}
                                        onChange={(event) =>
                                            updateField(
                                                'max_competitions',
                                                Number(
                                                    event.target.value
                                                )
                                            )
                                        }
                                        className="mt-1.5 w-full rounded-lg border border-emerald-300/15 bg-[#081109] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
                                    />
                                </label>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-emerald-300/15 bg-[#112214] p-4 xl:col-span-4">
                            <div className="mb-4">
                                <h4 className="m-0 text-sm font-bold text-white">
                                    Enabled modules
                                </h4>

                                <p className="m-0 mt-0.5 text-xs text-slate-400">
                                    Select available features
                                </p>
                            </div>

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
                                                    'flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition',
                                                    enabled
                                                        ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-100'
                                                        : 'border-emerald-300/10 bg-[#081109] text-slate-400 hover:border-emerald-300/25',
                                                ].join(
                                                    ' '
                                                )}
                                            >
                                                <span className="truncate">
                                                    {module}
                                                </span>

                                                <span
                                                    className={[
                                                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                                                        enabled
                                                            ? 'border-emerald-400 bg-emerald-500 text-white'
                                                            : 'border-slate-600 text-transparent',
                                                    ].join(
                                                        ' '
                                                    )}
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                </span>
                                            </button>
                                        )
                                    }
                                )}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-emerald-300/15 bg-[#112214] p-4 xl:col-span-12">
                            <div className="mb-3">
                                <h4 className="m-0 text-sm font-bold text-white">
                                    Brand colours
                                </h4>

                                <p className="m-0 mt-0.5 text-xs text-slate-400">
                                    Colours applied to the organisation experience
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                                {colourFields.map(
                                    ({
                                        field,
                                        label,
                                    }) => (
                                        <label
                                            key={field}
                                            className="block rounded-xl border border-emerald-300/12 bg-[#081109] p-3"
                                        >
                                            <span className="text-[11px] font-semibold text-slate-300">
                                                {label}
                                            </span>

                                            <div className="mt-2 flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={
                                                        form[field]
                                                    }
                                                    disabled={
                                                        controlsDisabled
                                                    }
                                                    onChange={(event) =>
                                                        updateField(
                                                            field,
                                                            event.target.value
                                                        )
                                                    }
                                                    className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-emerald-300/20 bg-transparent p-1"
                                                />

                                                <input
                                                    type="text"
                                                    value={
                                                        form[field]
                                                    }
                                                    disabled={
                                                        controlsDisabled
                                                    }
                                                    onChange={(event) =>
                                                        updateField(
                                                            field,
                                                            event.target.value
                                                        )
                                                    }
                                                    className="min-w-0 flex-1 rounded-md border border-emerald-300/12 bg-[#0e1a10] px-2 py-2 font-mono text-[11px] uppercase text-white outline-none focus:border-emerald-400"
                                                />
                                            </div>

                                            <FieldError
                                                message={
                                                    errors[field]
                                                }
                                            />
                                        </label>
                                    )
                                )}
                            </div>
                        </section>
                    </div>

                    {errors.submit && (
                        <div
                            role="alert"
                            className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200"
                        >
                            {errors.submit}
                        </div>
                    )}

                    <footer className="mt-5 flex items-center justify-end gap-3 border-t border-emerald-300/15 pt-4">
                        <button
                            type="button"
                            disabled={
                                controlsDisabled
                            }
                            onClick={onCancel}
                            className="min-h-11 rounded-xl border border-emerald-300/20 bg-transparent px-5 py-2.5 text-sm font-bold text-slate-200 transition hover:border-emerald-300/40 hover:bg-emerald-300/5 disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={
                                controlsDisabled
                            }
                            className="min-h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-6 py-2.5 text-sm font-black text-[#071107] shadow-lg shadow-emerald-950/30 transition hover:from-emerald-400 hover:to-lime-300 disabled:opacity-60"
                        >
                            {saving
                                ? organisation
                                    ? 'Updating...'
                                    : 'Creating...'
                                : organisation
                                  ? 'Update organisation'
                                  : 'Create organisation'}
                        </button>
                    </footer>
                </div>
            </form>
        </Modal>
    )
}
