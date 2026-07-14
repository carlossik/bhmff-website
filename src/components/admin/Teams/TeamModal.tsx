import {
    useEffect,
    useState,
    type ChangeEvent,
} from 'react'
import { Modal } from '../../common/Modal'
import type {
    TeamParticipationStatus,
    TeamVenueOption,
} from './teamTypes'

type TeamModalProps = {
    mode: 'create' | 'edit'
    teamName: string
    managerName: string
    email: string
    phone: string
    notes: string
    logoUrl: string
    participationStatus: TeamParticipationStatus
    published: boolean
    primaryHomeVenueId: string
    venues: TeamVenueOption[]
    isSaving: boolean

    onTeamNameChange: (value: string) => void
    onManagerNameChange: (value: string) => void
    onEmailChange: (value: string) => void
    onPhoneChange: (value: string) => void
    onNotesChange: (value: string) => void
    onParticipationStatusChange: (
        value: TeamParticipationStatus
    ) => void
    onPublishedChange: (value: boolean) => void
    onPrimaryHomeVenueChange: (value: string) => void
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
                              participationStatus,
                              published,
                              primaryHomeVenueId,
                              venues,
                              isSaving,
                              onTeamNameChange,
                              onManagerNameChange,
                              onEmailChange,
                              onPhoneChange,
                              onNotesChange,
                              onParticipationStatusChange,
                              onPublishedChange,
                              onPrimaryHomeVenueChange,
                              onLogoSelected,
                              onClose,
                              onSave,
                          }: TeamModalProps) {
    const [preview, setPreview] =
        useState(logoUrl)

    useEffect(() => {
        setPreview(logoUrl)
    }, [logoUrl])

    function handleLogoChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file =
            event.target.files?.[0] ?? null

        onLogoSelected(file)

        if (file) {
            setPreview(
                URL.createObjectURL(file)
            )
        }
    }

    return (
        <Modal
            title={
                mode === 'edit'
                    ? 'Edit Team'
                    : 'Add Team'
            }
            onClose={onClose}
        >
            <div className="adminFormGrid">
                <label>
                    <span>Team Name</span>

                    <input
                        value={teamName}
                        onChange={(event) =>
                            onTeamNameChange(
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Manager Name</span>

                    <input
                        value={managerName}
                        onChange={(event) =>
                            onManagerNameChange(
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Email</span>

                    <input
                        type="email"
                        value={email}
                        maxLength={254}
                        autoComplete="email"
                        onChange={(event) =>
                            onEmailChange(
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Phone</span>

                    <input
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        maxLength={25}
                        autoComplete="tel"
                        pattern="[0-9+() -]*"
                        placeholder="e.g. 07951 750370"
                        onChange={(event) => {
                            const value =
                                event.target.value

                            if (
                                /^[0-9+() -]*$/.test(
                                    value
                                )
                            ) {
                                onPhoneChange(value)
                            }
                        }}
                    />
                </label>

                <label>
                    <span>
                        Participation Status
                    </span>

                    <select
                        value={
                            participationStatus
                        }
                        onChange={(event) =>
                            onParticipationStatusChange(
                                event.target
                                    .value as TeamParticipationStatus
                            )
                        }
                    >
                        <option value="interested">
                            Interested
                        </option>

                        <option value="invited">
                            Invited
                        </option>

                        <option value="confirmed">
                            Confirmed
                        </option>

                        <option value="withdrawn">
                            Withdrawn
                        </option>
                    </select>
                </label>

                <label>
                    <span>
                        Primary Home Venue
                    </span>

                    <select
                        value={
                            primaryHomeVenueId
                        }
                        onChange={(event) =>
                            onPrimaryHomeVenueChange(
                                event.target.value
                            )
                        }
                    >
                        <option value="">
                            No home venue assigned
                        </option>

                        {venues.map((venue) => (
                            <option
                                key={venue.id}
                                value={venue.id}
                            >
                                {venue.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="adminCheckboxLabel">
                    <input
                        type="checkbox"
                        checked={published}
                        onChange={(event) =>
                            onPublishedChange(
                                event.target.checked
                            )
                        }
                    />

                    <span>
                        Display on public website
                    </span>
                </label>

                <label className="adminFormFullWidth">
                    <span>Team Logo</span>

                    {preview && (
                        <img
                            src={preview}
                            alt={
                                teamName
                                    ? `${teamName} logo preview`
                                    : 'Team logo preview'
                            }
                            className="teamLogoPreview"
                        />
                    )}

                    <input
                        type="file"
                        accept="image/*"
                        onChange={
                            handleLogoChange
                        }
                    />
                </label>

                <label className="adminFormFullWidth">
                    <span>Notes</span>

                    <textarea
                        value={notes}
                        onChange={(event) =>
                            onNotesChange(
                                event.target.value
                            )
                        }
                        rows={4}
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