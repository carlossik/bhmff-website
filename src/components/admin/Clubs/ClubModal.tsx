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
            <div className="adminFormGrid">
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

                <div className="adminFormFullWidth">
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

                <label className="adminFormFullWidth">
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

                <label className="adminFormFullWidth">
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

            <div className="modalActions">
                <button
                    className="btn secondary"
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                >
                    Cancel
                </button>

                <button
                    className="btn primary"
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