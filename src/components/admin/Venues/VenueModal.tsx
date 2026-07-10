import { Modal } from '../../common/Modal'
import type { VenueFormValues } from './venueTypes'

type VenueModalProps = {
    mode: 'create' | 'edit'
    values: VenueFormValues
    isSaving: boolean
    onChange: (values: VenueFormValues) => void
    onClose: () => void
    onSave: () => void
}

export function VenueModal({
                               mode,
                               values,
                               isSaving,
                               onChange,
                               onClose,
                               onSave,
                           }: VenueModalProps) {
    function updateField<K extends keyof VenueFormValues>(
        field: K,
        value: VenueFormValues[K]
    ) {
        onChange({
            ...values,
            [field]: value,
        })
    }

    return (
        <Modal
            title={mode === 'edit' ? 'Edit Venue' : 'Add Venue'}
            onClose={onClose}
        >
            <div className="adminFormGrid">
                <label>
                    <span>Venue Name</span>
                    <input
                        value={values.name}
                        onChange={(event) =>
                            updateField('name', event.target.value)
                        }
                        placeholder="Enter venue name"
                        autoFocus
                    />
                </label>

                <label>
                    <span>Postcode</span>
                    <input
                        value={values.postcode}
                        onChange={(event) =>
                            updateField('postcode', event.target.value)
                        }
                        placeholder="Enter postcode"
                    />
                </label>

                <label className="adminFormFullWidth">
                    <span>Address</span>
                    <input
                        value={values.address}
                        onChange={(event) =>
                            updateField('address', event.target.value)
                        }
                        placeholder="Enter venue address"
                    />
                </label>

                <label className="adminFormFullWidth">
                    <span>Notes</span>
                    <textarea
                        value={values.notes}
                        onChange={(event) =>
                            updateField('notes', event.target.value)
                        }
                        placeholder="Parking, pitch access, changing facilities or other notes"
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
                    disabled={isSaving}
                >
                    {isSaving
                        ? 'Saving...'
                        : mode === 'edit'
                            ? 'Update'
                            : 'Save'}
                </button>
            </div>
        </Modal>
    )
}