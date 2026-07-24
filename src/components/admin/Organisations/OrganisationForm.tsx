import {
    useEffect,
    useState,
    type FormEvent,
} from 'react'

import { Modal } from '../../common/Modal'

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
        organisation: OrganisationFormData
    ) => Promise<void>
    onCancel: () => void
}

type OrganisationFormErrors = {
    name?: string
    slug?: string
    logo_url?: string
    submit?: string
}

function createSlug(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function isValidUrl(value: string) {
    if (!value.trim()) {
        return true
    }

    try {
        const url = new URL(value)

        return (
            url.protocol === 'http:' ||
            url.protocol === 'https:'
        )
    } catch {
        return false
    }
}

export function OrganisationForm({
                                     organisation,
                                     saving,
                                     onSave,
                                     onCancel,
                                 }: OrganisationFormProps) {
    const [form, setForm] =
        useState<OrganisationFormData>(
            defaultOrganisation
        )

    const [errors, setErrors] =
        useState<OrganisationFormErrors>({})

    useEffect(() => {
        if (organisation) {
            setForm({
                name: organisation.name,
                slug: organisation.slug,
                primary_colour:
                    organisation.primary_colour ??
                    '#0f766e',
                secondary_colour:
                    organisation.secondary_colour ??
                    '#0f172a',
                logo_url:
                    organisation.logo_url ?? '',
                status:
                organisation.status,
            })
        } else {
            setForm(defaultOrganisation)
        }

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

    function validateForm() {
        const nextErrors:
            OrganisationFormErrors = {}

        if (!form.name.trim()) {
            nextErrors.name =
                'Organisation name is required.'
        }

        if (!form.slug.trim()) {
            nextErrors.slug =
                'Organisation slug is required.'
        }

        if (
            form.logo_url.trim() &&
            !isValidUrl(form.logo_url)
        ) {
            nextErrors.logo_url =
                'Enter a valid logo URL beginning with http:// or https://.'
        }

        setErrors(nextErrors)

        return (
            Object.keys(nextErrors).length === 0
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
            await onSave({
                ...form,
                name: form.name.trim(),
                slug: createSlug(form.slug),
                logo_url:
                    form.logo_url.trim(),
            })
        } catch (error) {
            setErrors((previous) => ({
                ...previous,
                submit:
                    error instanceof Error
                        ? error.message
                        : 'Unable to save organisation.',
            }))
        }
    }

    return (
        <Modal
            title={
                organisation
                    ? 'Edit Organisation'
                    : 'Add Organisation'
            }
            onClose={onCancel}
        >
            <form
                className="organisationForm"
                onSubmit={handleSubmit}
                noValidate
            >
                <div className="formGrid">
                    <div className="formField">
                        <label
                            htmlFor="organisation-name"
                        >
                            Organisation Name *
                        </label>

                        <input
                            id="organisation-name"
                            type="text"
                            value={form.name}
                            disabled={saving}
                            autoFocus
                            aria-invalid={
                                !!errors.name
                            }
                            aria-describedby={
                                errors.name
                                    ? 'organisation-name-error'
                                    : undefined
                            }
                            onChange={(event) => {
                                const name =
                                    event.target.value

                                updateField(
                                    'name',
                                    name
                                )

                                if (!organisation) {
                                    updateField(
                                        'slug',
                                        createSlug(name)
                                    )
                                }
                            }}
                        />

                        {errors.name && (
                            <span
                                id="organisation-name-error"
                                className="formFieldError"
                            >
                                {errors.name}
                            </span>
                        )}
                    </div>

                    <div className="formField">
                        <label
                            htmlFor="organisation-slug"
                        >
                            Slug *
                        </label>

                        <input
                            id="organisation-slug"
                            type="text"
                            value={form.slug}
                            disabled={saving}
                            aria-invalid={
                                !!errors.slug
                            }
                            aria-describedby={
                                errors.slug
                                    ? 'organisation-slug-error'
                                    : undefined
                            }
                            onChange={(event) =>
                                updateField(
                                    'slug',
                                    createSlug(
                                        event.target.value
                                    )
                                )
                            }
                        />

                        {errors.slug && (
                            <span
                                id="organisation-slug-error"
                                className="formFieldError"
                            >
                                {errors.slug}
                            </span>
                        )}
                    </div>

                    <div className="formField">
                        <label
                            htmlFor="organisation-primary-colour"
                        >
                            Primary Colour
                        </label>

                        <input
                            id="organisation-primary-colour"
                            type="color"
                            value={
                                form.primary_colour
                            }
                            disabled={saving}
                            onChange={(event) =>
                                updateField(
                                    'primary_colour',
                                    event.target.value
                                )
                            }
                        />
                    </div>

                    <div className="formField">
                        <label
                            htmlFor="organisation-secondary-colour"
                        >
                            Secondary Colour
                        </label>

                        <input
                            id="organisation-secondary-colour"
                            type="color"
                            value={
                                form.secondary_colour
                            }
                            disabled={saving}
                            onChange={(event) =>
                                updateField(
                                    'secondary_colour',
                                    event.target.value
                                )
                            }
                        />
                    </div>

                    <div className="formField formFieldFull">
                        <label
                            htmlFor="organisation-logo-url"
                        >
                            Logo URL
                        </label>

                        <input
                            id="organisation-logo-url"
                            type="url"
                            value={form.logo_url}
                            disabled={saving}
                            placeholder="https://..."
                            aria-invalid={
                                !!errors.logo_url
                            }
                            aria-describedby={
                                errors.logo_url
                                    ? 'organisation-logo-error'
                                    : undefined
                            }
                            onChange={(event) =>
                                updateField(
                                    'logo_url',
                                    event.target.value
                                )
                            }
                        />

                        {errors.logo_url && (
                            <span
                                id="organisation-logo-error"
                                className="formFieldError"
                            >
                                {errors.logo_url}
                            </span>
                        )}
                    </div>

                    <div className="formField">
                        <label
                            htmlFor="organisation-status"
                        >
                            Status
                        </label>

                        <select
                            id="organisation-status"
                            value={form.status}
                            disabled={saving}
                            onChange={(event) =>
                                updateField(
                                    'status',
                                    event.target
                                        .value as OrganisationFormData['status']
                                )
                            }
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
                    </div>
                </div>

                {errors.submit && (
                    <div className="formError">
                        {errors.submit}
                    </div>
                )}

                <div className="modalActions">
                    <button
                        type="button"
                        className="btn secondary"
                        onClick={onCancel}
                        disabled={saving}
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        className="btn primary"
                        disabled={saving}
                    >
                        {saving
                            ? 'Saving...'
                            : organisation
                                ? 'Update Organisation'
                                : 'Create Organisation'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}