import {
    useEffect,
    useState,
} from 'react'
import { Modal } from '../../common/Modal'
import type {
    SponsorFormValues,
} from './sponsorTypes'

type SponsorModalProps = {
    mode: 'create' | 'edit'
    values: SponsorFormValues
    existingLogoUrl: string
    isSaving: boolean
    onChange: (
        values: SponsorFormValues
    ) => void
    onLogoSelected: (
        file: File | null
    ) => void
    onRemoveLogo: () => void
    onClose: () => void
    onSave: () => void
}

export function SponsorModal({
                                 mode,
                                 values,
                                 existingLogoUrl,
                                 isSaving,
                                 onChange,
                                 onLogoSelected,
                                 onRemoveLogo,
                                 onClose,
                                 onSave,
                             }: SponsorModalProps) {
    const [previewUrl, setPreviewUrl] =
        useState(existingLogoUrl)

    useEffect(() => {
        setPreviewUrl(existingLogoUrl)
    }, [existingLogoUrl])

    function updateField<
        K extends keyof SponsorFormValues,
    >(
        field: K,
        value: SponsorFormValues[K]
    ) {
        onChange({
            ...values,
            [field]: value,
        })
    }

    function handleLogoChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const file =
            event.target.files?.[0] ?? null

        onLogoSelected(file)

        if (!file) return

        setPreviewUrl(
            URL.createObjectURL(file)
        )
    }

    function removeLogo() {
        setPreviewUrl('')
        onLogoSelected(null)
        onRemoveLogo()
    }

    return (
        <Modal
            title={
                mode === 'edit'
                    ? 'Edit Sponsor'
                    : 'Add Sponsor'
            }
            onClose={onClose}
        >
            <div className="adminFormGrid">
                <label>
                    <span>Sponsor Name</span>

                    <input
                        value={values.name}
                        onChange={(event) =>
                            updateField(
                                'name',
                                event.target.value
                            )
                        }
                        placeholder="Enter organisation name"
                        autoFocus
                    />
                </label>

                <label>
                    <span>Partnership Type</span>

                    <input
                        value={values.tier}
                        onChange={(event) =>
                            updateField(
                                'tier',
                                event.target.value
                            )
                        }
                        placeholder="e.g. Official Media Partner"
                    />
                </label>

                <label className="adminFormFullWidth">
                    <span>Website</span>

                    <input
                        type="url"
                        value={values.website_url}
                        onChange={(event) =>
                            updateField(
                                'website_url',
                                event.target.value
                            )
                        }
                        placeholder="https://example.com"
                    />
                </label>

                <label className="adminFormFullWidth">
                    <span>Sponsor Logo</span>

                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoChange}
                    />
                </label>

                {previewUrl && (
                    <div className="sponsorLogoEditor adminFormFullWidth">
                        <img
                            src={previewUrl}
                            alt="Sponsor logo preview"
                        />

                        <button
                            className="btn secondary small"
                            type="button"
                            onClick={removeLogo}
                        >
                            Remove Logo
                        </button>
                    </div>
                )}

                <label className="adminFormFullWidth">
                    <span>Description</span>

                    <textarea
                        value={values.description}
                        onChange={(event) =>
                            updateField(
                                'description',
                                event.target.value
                            )
                        }
                        placeholder="Describe the partnership and contribution"
                    />
                </label>

                <label className="adminCheckboxLabel adminFormFullWidth">
                    <input
                        type="checkbox"
                        checked={values.active}
                        onChange={(event) =>
                            updateField(
                                'active',
                                event.target.checked
                            )
                        }
                    />

                    <span>
                        Display this sponsor publicly
                    </span>
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
                    disabled={isSaving}
                >
                    {isSaving
                        ? 'Saving...'
                        : mode === 'edit'
                            ? 'Update Sponsor'
                            : 'Add Sponsor'}
                </button>
            </div>
        </Modal>
    )
}