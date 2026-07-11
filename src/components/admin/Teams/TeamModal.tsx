import { useState } from 'react'
import { Modal } from '../../common/Modal'

type TeamModalProps = {
    mode: 'create' | 'edit'
    teamName: string
    managerName: string
    email: string
    phone: string
    notes: string
    logoUrl: string
    isSaving: boolean

    onTeamNameChange: (value: string) => void
    onManagerNameChange: (value: string) => void
    onEmailChange: (value: string) => void
    onPhoneChange: (value: string) => void
    onNotesChange: (value: string) => void
    onLogoSelected: (file: File | null) => void

    onClose: () => void
    onSave: () => void
}

export function TeamModal({
                              mode,
                              teamName,
                              managerName,
                              email,
                              phone,
                              notes,
                              logoUrl,
                              isSaving,
                              onTeamNameChange,
                              onManagerNameChange,
                              onEmailChange,
                              onPhoneChange,
                              onNotesChange,
                              onLogoSelected,
                              onClose,
                              onSave,
                          }: TeamModalProps) {

    const [preview, setPreview] = useState(logoUrl)

    function handleLogoChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0] ?? null

        onLogoSelected(file)

        if (file) {
            setPreview(URL.createObjectURL(file))
        }
    }

    return (
        <Modal
            title={mode === 'edit'
                ? 'Edit Team'
                : 'Add Team'}
            onClose={onClose}
        >

            <div className="adminFormGrid">

                <label>
                    <span>Team Name</span>
                    <input
                        value={teamName}
                        onChange={(e) =>
                            onTeamNameChange(e.target.value)
                        }
                    />
                </label>

                <label>
                    <span>Manager Name</span>
                    <input
                        value={managerName}
                        onChange={(e) =>
                            onManagerNameChange(e.target.value)
                        }
                    />
                </label>

                <label>
                    <span>Email</span>
                    <input
                        value={email}
                        onChange={(e) =>
                            onEmailChange(e.target.value)
                        }
                    />
                </label>

                <label>
                    <span>Phone</span>
                    <input
                        value={phone}
                        onChange={(e) =>
                            onPhoneChange(e.target.value)
                        }
                    />
                </label>

                <label className="adminFormFullWidth">
                    <span>Team Logo</span>

                    {preview && (
                        <img
                            src={preview}
                            alt=""
                            className="teamLogoPreview"
                        />
                    )}

                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                    />
                </label>

                <label className="adminFormFullWidth">
                    <span>Notes</span>

                    <textarea
                        value={notes}
                        onChange={(e) =>
                            onNotesChange(e.target.value)
                        }
                    />
                </label>

            </div>

            <div className="modalActions">

                <button
                    className="btn secondary"
                    onClick={onClose}
                >
                    Cancel
                </button>

                <button
                    className="btn primary"
                    disabled={isSaving}
                    onClick={onSave}
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