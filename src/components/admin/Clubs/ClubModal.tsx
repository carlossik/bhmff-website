import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from 'react'
import { ImageUpload } from '../../common/ImageUpload'
import { TournamentHQBrand } from '../../common/TournamentHQBrand'
import {
    emptyClubForm,
    type ClubFormValues,
} from './clubTypes'

type ClubModalProps = {
    open: boolean
    mode: 'create' | 'edit'
    organisationId: string
    initialValues: ClubFormValues
    isSaving: boolean
    onClose: () => void
    onSave: (values: ClubFormValues) => void
}

const inputClassName =
    'mt-1.5 w-full rounded-xl border border-lime-700/30 bg-[#0b1408] px-3.5 py-2.5 text-sm text-white shadow-sm outline-none transition placeholder:text-slate-500 focus:border-lime-400 focus:ring-4 focus:ring-lime-400/20 disabled:cursor-not-allowed disabled:bg-[#12210d] disabled:text-slate-500'

const labelClassName =
    'block text-sm font-semibold text-slate-200'

export function ClubModal({
                              open,
                              mode,
                              organisationId,
                              initialValues,
                              isSaving,
                              onClose,
                              onSave,
                          }: ClubModalProps) {
    const [values, setValues] =
        useState<ClubFormValues>({
            ...emptyClubForm,
        })

    const nameInputRef =
        useRef<HTMLInputElement | null>(null)

    const shortNameManuallyEditedRef =
        useRef(false)

    useEffect(() => {
        if (!open) {
            return
        }

        setValues({ ...initialValues })

        shortNameManuallyEditedRef.current =
            mode === 'edit' &&
            initialValues.shortName.trim() !== '' &&
            initialValues.shortName.trim() !==
            initialValues.name.trim()

        const focusTimer = window.setTimeout(() => {
            nameInputRef.current?.focus()
        }, 0)

        const previousOverflow =
            document.body.style.overflow

        document.body.style.overflow = 'hidden'

        return () => {
            window.clearTimeout(focusTimer)
            document.body.style.overflow =
                previousOverflow
        }
    }, [open, mode, initialValues])

    useEffect(() => {
        if (!open) {
            return
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape' && !isSaving) {
                onClose()
            }
        }

        window.addEventListener(
            'keydown',
            handleKeyDown
        )

        return () => {
            window.removeEventListener(
                'keydown',
                handleKeyDown
            )
        }
    }, [open, isSaving, onClose])

    if (!open) {
        return null
    }

    function updateValue(
        field: keyof ClubFormValues,
        value: string
    ) {
        setValues((currentValues) => ({
            ...currentValues,
            [field]: value,
        }))
    }

    function handleClubNameChange(value: string) {
        setValues((currentValues) => ({
            ...currentValues,
            name: value,
            shortName:
                shortNameManuallyEditedRef.current
                    ? currentValues.shortName
                    : value,
        }))
    }

    function handleShortNameChange(value: string) {
        shortNameManuallyEditedRef.current = true

        setValues((currentValues) => ({
            ...currentValues,
            shortName: value,
        }))
    }

    function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        if (isSaving || !values.name.trim()) {
            return
        }

        onSave(values)
    }

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget &&
                    !isSaving
                ) {
                    onClose()
                }
            }}
        >

            <style>
                {`
                        .club-modal-scrollbar {
                            scrollbar-width: thin;
                            scrollbar-color: #84cc16 #071006;
                        }

                        .club-modal-scrollbar::-webkit-scrollbar {
                            width: 10px;
                        }

                        .club-modal-scrollbar::-webkit-scrollbar-track {
                            background: #071006;
                        }

                        .club-modal-scrollbar::-webkit-scrollbar-thumb {
                            background: #65a30d;
                            border: 2px solid #071006;
                            border-radius: 999px;
                        }

                        .club-modal-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: #84cc16;
                        }

                        .club-upload-surface .imageUploadField {
                            display: flex;
                            flex-direction: column;
                            gap: 12px;
                            color: #e2e8f0;
                        }

                        .club-upload-surface .imageUploadLabel {
                            color: #e2e8f0;
                            font-size: 0.875rem;
                            font-weight: 700;
                        }

                        .club-upload-surface .imageUploadPreview {
                            display: flex;
                            flex-wrap: wrap;
                            align-items: center;
                            gap: 16px;
                            border: 1px dashed rgba(132, 204, 22, 0.45);
                            border-radius: 16px;
                            background: #071006;
                            padding: 18px;
                        }

                        .club-upload-surface .imageUploadPreview img {
                            border: 1px solid rgba(132, 204, 22, 0.4) !important;
                            background: #0c160b !important;
                        }

                        .club-upload-surface .imageUploadActions {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 10px;
                        }

                        .club-upload-surface .imageUploadField > button,
                        .club-upload-surface .imageUploadActions button {
                            min-height: 44px;
                            border: 1px solid rgba(132, 204, 22, 0.5);
                            border-radius: 12px;
                            background: #0c160b;
                            padding: 10px 16px;
                            color: #ffffff;
                            font-size: 0.875rem;
                            font-weight: 700;
                            transition: background 150ms ease, border-color 150ms ease;
                        }

                        .club-upload-surface .imageUploadField > button:hover,
                        .club-upload-surface .imageUploadActions button:hover {
                            border-color: #a3e635;
                            background: rgba(132, 204, 22, 0.12);
                        }

                        .club-upload-surface .imageUploadActions .danger,
                        .club-upload-surface .imageUploadActions .btn.danger {
                            border-color: rgba(248, 113, 113, 0.55);
                            color: #fecaca;
                        }

                        .club-upload-surface small,
                        .club-upload-surface .muted {
                            color: #94a3b8;
                        }

                        .club-upload-surface .formError {
                            color: #fca5a5;
                            font-size: 0.875rem;
                        }
                    `}
            </style>

            <div
                className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-lime-700/30 bg-[#0b1408] shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="club-modal-title"
            >
                <div className="flex items-start justify-between border-b border-lime-700/30 bg-[#0b1408] px-5 py-4 sm:px-6">
                    <div>
                        <TournamentHQBrand
                            variant="compact"
                            size="sm"
                            className="max-w-[190px]"
                        />

                        <h2
                            id="club-modal-title"
                            className="mt-3 text-3xl font-bold tracking-tight text-lime-300"
                        >
                            {mode === 'edit'
                                ? 'Edit Club'
                                : 'Add Club'}
                        </h2>

                        <p className="mt-1 text-sm text-emerald-100/75">
                            Add the club details and badge used across the competition.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="ml-4 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl leading-none text-emerald-100 transition hover:bg-[#12210d] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={onClose}
                        disabled={isSaving}
                        aria-label="Close club modal"
                    >
                        ×
                    </button>
                </div>

                <form
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={handleSubmit}
                >
                    <div className="club-modal-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#0b1408] px-5 py-5 sm:px-6">
                        <div className="mb-5 rounded-2xl border border-lime-500/30 bg-[#0b1408]/70 px-4 py-3">
                            <p className="text-sm font-semibold text-lime-300">
                                Intelligent club setup
                            </p>

                            <p className="mt-1 text-xs leading-5 text-emerald-100/75">
                                Team / Short Name follows Club Name automatically until you edit it yourself.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <label className={labelClassName}>
                                Club Name{' '}
                                <span className="text-lime-300">
                                    *
                                </span>

                                <input
                                    ref={nameInputRef}
                                    type="text"
                                    value={values.name}
                                    placeholder="e.g. Herongate Football Club"
                                    disabled={isSaving}
                                    className={inputClassName}
                                    autoComplete="organization"
                                    onChange={(event) =>
                                        handleClubNameChange(
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Team / Short Name

                                <input
                                    type="text"
                                    value={values.shortName}
                                    placeholder="Automatically copied from Club Name"
                                    disabled={isSaving}
                                    className={inputClassName}
                                    onChange={(event) =>
                                        handleShortNameChange(
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <div className="club-upload-surface rounded-2xl border border-lime-700/30 bg-[#0b1408]/70 p-4 md:col-span-2">
                                <ImageUpload
                                    value={values.badgeUrl}
                                    organisationId={
                                        organisationId
                                    }
                                    folder="clubs"
                                    label="Club Badge"
                                    disabled={isSaving}
                                    onChange={(url) =>
                                        updateValue(
                                            'badgeUrl',
                                            url
                                        )
                                    }
                                />
                            </div>

                            <label className={labelClassName}>
                                Manager Name
                                <input
                                    type="text"
                                    value={values.managerName}
                                    disabled={isSaving}
                                    className={inputClassName}
                                    onChange={(event) =>
                                        updateValue(
                                            'managerName',
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Secretary Name
                                <input
                                    type="text"
                                    value={
                                        values.secretaryName
                                    }
                                    disabled={isSaving}
                                    className={inputClassName}
                                    onChange={(event) =>
                                        updateValue(
                                            'secretaryName',
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Email
                                <input
                                    type="email"
                                    value={values.email}
                                    disabled={isSaving}
                                    className={inputClassName}
                                    autoComplete="email"
                                    onChange={(event) =>
                                        updateValue(
                                            'email',
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Phone
                                <input
                                    type="tel"
                                    value={values.phone}
                                    disabled={isSaving}
                                    className={inputClassName}
                                    autoComplete="tel"
                                    onChange={(event) =>
                                        updateValue(
                                            'phone',
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Website
                                <input
                                    type="url"
                                    value={values.website}
                                    placeholder="https://..."
                                    disabled={isSaving}
                                    className={inputClassName}
                                    onChange={(event) =>
                                        updateValue(
                                            'website',
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Founded Year
                                <input
                                    type="number"
                                    min="1800"
                                    max="2200"
                                    value={values.foundedYear}
                                    disabled={isSaving}
                                    className={inputClassName}
                                    onChange={(event) =>
                                        updateValue(
                                            'foundedYear',
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Club Colours
                                <input
                                    type="text"
                                    value={values.colours}
                                    placeholder="e.g. Blue and yellow"
                                    disabled={isSaving}
                                    className={inputClassName}
                                    onChange={(event) =>
                                        updateValue(
                                            'colours',
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Facebook URL
                                <input
                                    type="url"
                                    value={values.facebookUrl}
                                    placeholder="https://facebook.com/..."
                                    disabled={isSaving}
                                    className={inputClassName}
                                    onChange={(event) =>
                                        updateValue(
                                            'facebookUrl',
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Instagram URL
                                <input
                                    type="url"
                                    value={values.instagramUrl}
                                    placeholder="https://instagram.com/..."
                                    disabled={isSaving}
                                    className={inputClassName}
                                    onChange={(event) =>
                                        updateValue(
                                            'instagramUrl',
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Twitter / X URL
                                <input
                                    type="url"
                                    value={values.twitterUrl}
                                    placeholder="https://x.com/..."
                                    disabled={isSaving}
                                    className={inputClassName}
                                    onChange={(event) =>
                                        updateValue(
                                            'twitterUrl',
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label
                                className={`${labelClassName} md:col-span-2`}
                            >
                                Address
                                <textarea
                                    rows={3}
                                    value={values.address}
                                    disabled={isSaving}
                                    className={`${inputClassName} resize-y`}
                                    autoComplete="street-address"
                                    onChange={(event) =>
                                        updateValue(
                                            'address',
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label
                                className={`${labelClassName} md:col-span-2`}
                            >
                                Description
                                <textarea
                                    rows={4}
                                    value={
                                        values.description
                                    }
                                    disabled={isSaving}
                                    className={`${inputClassName} resize-y`}
                                    onChange={(event) =>
                                        updateValue(
                                            'description',
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-lime-700/30 bg-[#0b1408] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                        <button
                            type="button"
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-700 bg-[#12210d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-lime-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-lime-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                            disabled={
                                isSaving ||
                                !values.name.trim()
                            }
                        >
                            {isSaving
                                ? 'Saving...'
                                : mode === 'edit'
                                    ? 'Update Club'
                                    : 'Create Club'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}