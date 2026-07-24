import { useEffect, useState } from 'react'
import type {
    Organisation,
    OrganisationFormData,
} from './organisationTypes'
import { defaultOrganisation } from './organisationTypes'

type OrganisationFormProps = {
    organisation?: Organisation
    saving: boolean
    onSave: (
        organisation: OrganisationFormData
    ) => Promise<void>
    onCancel: () => void
}

function createSlug(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
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

    const [error, setError] =
        useState('')

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
    }, [organisation])

    function updateField<
        K extends keyof OrganisationFormData,
    >(field: K, value: OrganisationFormData[K]) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }))
    }

    async function handleSubmit(
        event: React.FormEvent
    ) {
        event.preventDefault()

        setError('')

        if (!form.name.trim()) {
            setError(
                'Organisation name is required.'
            )
            return
        }

        if (!form.slug.trim()) {
            setError(
                'Organisation slug is required.'
            )
            return
        }

        try {
            await onSave(form)
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to save organisation.'
            )
        }
    }

    return (
        <form
            className="organisationForm"
            onSubmit={handleSubmit}
        >
            <div className="formGrid">
                <div className="formField">
                    <label>
                        Organisation Name
                    </label>

                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => {
                            const name =
                                e.target.value

                            updateField(
                                'name',
                                name
                            )

                            if (
                                !organisation
                            ) {
                                updateField(
                                    'slug',
                                    createSlug(
                                        name
                                    )
                                )
                            }
                        }}
                    />
                </div>

                <div className="formField">
                    <label>Slug</label>

                    <input
                        type="text"
                        value={form.slug}
                        onChange={(e) =>
                            updateField(
                                'slug',
                                createSlug(
                                    e.target
                                        .value
                                )
                            )
                        }
                    />
                </div>

                <div className="formField">
                    <label>
                        Primary Colour
                    </label>

                    <input
                        type="color"
                        value={
                            form.primary_colour
                        }
                        onChange={(e) =>
                            updateField(
                                'primary_colour',
                                e.target
                                    .value
                            )
                        }
                    />
                </div>

                <div className="formField">
                    <label>
                        Secondary Colour
                    </label>

                    <input
                        type="color"
                        value={
                            form.secondary_colour
                        }
                        onChange={(e) =>
                            updateField(
                                'secondary_colour',
                                e.target
                                    .value
                            )
                        }
                    />
                </div>

                <div className="formField formFieldFull">
                    <label>
                        Logo URL
                    </label>

                    <input
                        type="text"
                        value={form.logo_url}
                        onChange={(e) =>
                            updateField(
                                'logo_url',
                                e.target
                                    .value
                            )
                        }
                    />
                </div>

                <div className="formField">
                    <label>Status</label>

                    <select
                        value={form.status}
                        onChange={(e) =>
                            updateField(
                                'status',
                                e.target
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

            {error && (
                <div className="formError">
                    {error}
                </div>
            )}

            <div className="organisationFormActions">
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
    )
}