import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from 'react'
import { ImageUpload } from '../../common/ImageUpload'
import { EnterpriseModal } from '../../common/EnterpriseModal'
import {
    emptyClubForm,
    type ClubFormValues,
} from './clubTypes'

type ClubModalProps = {
    open: boolean
    mode: 'create' | 'edit'
    organisationId: string
    initialValues?: ClubFormValues | null
    isSaving: boolean
    onClose: () => void
    onSave: (values: ClubFormValues) => void
}

const inputClassName =
    'mt-1.5 w-full rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-3.5 py-2.5 text-sm text-[var(--organisation-text)] shadow-sm outline-none transition placeholder:text-[color:var(--organisation-text)]/40 focus:border-[var(--organisation-accent)] focus:ring-4 focus:ring-[var(--organisation-accent)]/10 disabled:cursor-not-allowed disabled:opacity-50'

const labelClassName =
    'block text-sm font-medium text-[color:var(--organisation-text)]/80'

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

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (isSaving || !values.name.trim()) {
            return
        }

        onSave(values)
    }

    return (
        <EnterpriseModal
            title={mode === 'edit' ? 'Edit Club' : 'Add Club'}
            eyebrow="Club administration"
            description="Add the club details and badge used across the competition."
            closeDisabled={isSaving}
            onClose={onClose}
            maxWidthClassName="max-w-5xl"
        >
                <form
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={handleSubmit}
                >
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <label className={labelClassName}>
                                Club Name{' '}
                                <span className="text-red-600">*</span>
                                <input
                                    ref={nameInputRef}
                                    type="text"
                                    value={values.name}
                                    placeholder="e.g. Herongate Football Club"
                                    disabled={isSaving}
                                    className={inputClassName}
                                    autoComplete="organization"
                                    onChange={(event) =>
                                        updateValue(
                                            'name',
                                            event.currentTarget.value
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Short Name
                                <input
                                    type="text"
                                    value={values.shortName}
                                    placeholder="e.g. Herongate"
                                    disabled={isSaving}
                                    className={inputClassName}
                                    onChange={(event) =>
                                        updateValue(
                                            'shortName',
                                            event.currentTarget.value
                                        )
                                    }
                                />
                            </label>

                            <div className="md:col-span-2 rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-4">
                                <ImageUpload
                                    value={values.badgeUrl}
                                    organisationId={organisationId}
                                    folder="clubs"
                                    label="Club Badge"
                                    disabled={isSaving}
                                    onChange={(url) =>
                                        updateValue('badgeUrl', url)
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
                                            event.currentTarget.value
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Secretary Name
                                <input
                                    type="text"
                                    value={values.secretaryName}
                                    disabled={isSaving}
                                    className={inputClassName}
                                    onChange={(event) =>
                                        updateValue(
                                            'secretaryName',
                                            event.currentTarget.value
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
                                            event.currentTarget.value
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
                                            event.currentTarget.value
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
                                            event.currentTarget.value
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
                                            event.currentTarget.value
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
                                            event.currentTarget.value
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
                                            event.currentTarget.value
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
                                            event.currentTarget.value
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
                                            event.currentTarget.value
                                        )
                                    }
                                />
                            </label>

                            <label className={`${labelClassName} md:col-span-2`}>
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
                                            event.currentTarget.value
                                        )
                                    }
                                />
                            </label>

                            <label className={`${labelClassName} md:col-span-2`}>
                                Description
                                <textarea
                                    rows={4}
                                    value={values.description}
                                    disabled={isSaving}
                                    className={`${inputClassName} resize-y`}
                                    onChange={(event) =>
                                        updateValue(
                                            'description',
                                            event.currentTarget.value
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                        <button
                            type="button"
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-5 py-2.5 text-sm font-semibold text-[var(--organisation-text)] shadow-sm transition hover:bg-[color:var(--organisation-accent)]/10 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--organisation-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--organisation-on-accent)] shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
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
        </EnterpriseModal>
    )

}