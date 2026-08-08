import { Modal } from '../../common/Modal'
import { ImageUpload } from '../../common/ImageUpload'
import type { ClubFormValues } from './clubTypes'

type ClubModalProps = {
    open: boolean
    mode: 'create' | 'edit'
    organisationId: string
    values: ClubFormValues
    isSaving: boolean
    onChange: (
        field: keyof ClubFormValues,
        value: string
    ) => void
    onClose: () => void
    onSave: () => void
}

export function ClubModal({
                              open,
                              mode,
                              organisationId,
                              values,
                              isSaving,
                              onChange,
                              onClose,
                              onSave,
                          }: ClubModalProps) {
    if (!open) {
        return null
    }

    return (
        <Modal
            title={
                mode === 'edit'
                    ? 'Edit Club'
                    : 'Add Club'
            }
            onClose={onClose}
        >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-[var(--organisation-text)] [&_input]:rounded-xl [&_input]:border [&_input]:border-[var(--organisation-border)] [&_input]:bg-[var(--organisation-background)] [&_input]:px-4 [&_input]:py-3 [&_input]:text-[var(--organisation-text)] [&_input]:outline-none [&_input]:focus:border-[var(--organisation-accent)] [&_select]:rounded-xl [&_select]:border [&_select]:border-[var(--organisation-border)] [&_select]:bg-[var(--organisation-background)] [&_select]:px-4 [&_select]:py-3 [&_select]:text-[var(--organisation-text)] [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-[var(--organisation-border)] [&_textarea]:bg-[var(--organisation-background)] [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-[var(--organisation-text)]">
                <label>
                    <span>Club Name *</span>

                    <input
                        value={values.name}
                        placeholder="e.g. Teviot Rangers"
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'name',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Short Name</span>

                    <input
                        value={values.shortName}
                        placeholder="e.g. Teviot"
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'shortName',
                                event.target.value
                            )
                        }
                    />
                </label>

                <div className="md:col-span-2">
                    <ImageUpload
                        value={values.badgeUrl}
                        organisationId={organisationId}
                        folder="clubs"
                        label="Club Badge"
                        disabled={isSaving}
                        onChange={(url) =>
                            onChange('badgeUrl', url)
                        }
                    />
                </div>

                <label>
                    <span>Manager Name</span>

                    <input
                        value={values.managerName}
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'managerName',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Secretary Name</span>

                    <input
                        value={values.secretaryName}
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'secretaryName',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Email</span>

                    <input
                        type="email"
                        value={values.email}
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'email',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Phone</span>

                    <input
                        type="tel"
                        value={values.phone}
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'phone',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Website</span>

                    <input
                        type="url"
                        value={values.website}
                        placeholder="https://..."
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'website',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Founded Year</span>

                    <input
                        type="number"
                        min="1800"
                        max="2200"
                        value={values.foundedYear}
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'foundedYear',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Club Colours</span>

                    <input
                        value={values.colours}
                        placeholder="e.g. Red and white"
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'colours',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Facebook URL</span>

                    <input
                        type="url"
                        value={values.facebookUrl}
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'facebookUrl',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Instagram URL</span>

                    <input
                        type="url"
                        value={values.instagramUrl}
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'instagramUrl',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Twitter / X URL</span>

                    <input
                        type="url"
                        value={values.twitterUrl}
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'twitterUrl',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label className="md:col-span-2">
                    <span>Address</span>

                    <textarea
                        rows={3}
                        value={values.address}
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'address',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label className="md:col-span-2">
                    <span>Description</span>

                    <textarea
                        rows={4}
                        value={values.description}
                        disabled={isSaving}
                        onChange={(event) =>
                            onChange(
                                'description',
                                event.target.value
                            )
                        }
                    />
                </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--organisation-border)] pt-5 sm:flex-row sm:justify-end">
                <button
                    className="inline-flex items-center justify-center rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-5 py-3 font-semibold text-[var(--organisation-text)] transition hover:border-[var(--organisation-accent)] disabled:opacity-50"
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                >
                    Cancel
                </button>

                <button
                    className="inline-flex items-center justify-center rounded-xl bg-[var(--organisation-accent)] px-5 py-3 font-bold text-[var(--organisation-on-accent)] transition hover:brightness-110 disabled:opacity-50"
                    type="button"
                    onClick={onSave}
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
        </Modal>
    )
}