import {
    useEffect,
    useState,
    type ChangeEvent,
} from 'react'
import { Modal } from '../../common/Modal'
import type {
    ClubOption,
    TeamParticipationStatus,
    TeamVenueOption,
} from './teamTypes'

type TeamModalProps = {
    mode: 'create' | 'edit'
    clubId: string
    teamName: string
    ageGroup: string
    yearGroup: string
    gender: string
    division: string
    homeKitColour: string
    awayKitColour: string
    notes: string
    logoUrl: string
    participationStatus: TeamParticipationStatus
    published: boolean
    primaryHomeVenueId: string
    clubs: ClubOption[]
    venues: TeamVenueOption[]
    isSaving: boolean

    onClubIdChange: (value: string) => void
    onTeamNameChange: (value: string) => void
    onAgeGroupChange: (value: string) => void
    onYearGroupChange: (value: string) => void
    onGenderChange: (value: string) => void
    onDivisionChange: (value: string) => void
    onHomeKitColourChange: (value: string) => void
    onAwayKitColourChange: (value: string) => void
    onNotesChange: (value: string) => void
    onParticipationStatusChange: (
        value: TeamParticipationStatus
    ) => void
    onPublishedChange: (value: boolean) => void
    onPrimaryHomeVenueChange: (
        value: string
    ) => void
    onLogoSelected: (file: File | null) => void
    onClose: () => void
    onSave: () => void
}

export function TeamModal({
                              mode,
                              clubId,
                              teamName,
                              ageGroup,
                              yearGroup,
                              gender,
                              division,
                              homeKitColour,
                              awayKitColour,
                              notes,
                              logoUrl,
                              participationStatus,
                              published,
                              primaryHomeVenueId,
                              clubs,
                              venues,
                              isSaving,
                              onClubIdChange,
                              onTeamNameChange,
                              onAgeGroupChange,
                              onYearGroupChange,
                              onGenderChange,
                              onDivisionChange,
                              onHomeKitColourChange,
                              onAwayKitColourChange,
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
        } else {
            setPreview(logoUrl)
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
                    <span>Club</span>

                    <select
                        value={clubId}
                        onChange={(event) =>
                            onClubIdChange(
                                event.target.value
                            )
                        }
                    >
                        <option value="">
                            Select a club
                        </option>

                        {clubs.map((club) => (
                            <option
                                key={club.id}
                                value={club.id}
                            >
                                {club.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Team Name</span>

                    <input
                        value={teamName}
                        placeholder="e.g. U15 Reds"
                        onChange={(event) =>
                            onTeamNameChange(
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Age Group</span>

                    <input
                        value={ageGroup}
                        placeholder="e.g. U15"
                        onChange={(event) =>
                            onAgeGroupChange(
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Year Group</span>

                    <input
                        type="number"
                        min="1900"
                        max="2200"
                        value={yearGroup}
                        placeholder="e.g. 2011"
                        onChange={(event) =>
                            onYearGroupChange(
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Gender</span>

                    <select
                        value={gender}
                        onChange={(event) =>
                            onGenderChange(
                                event.target.value
                            )
                        }
                    >
                        <option value="Mixed">
                            Mixed
                        </option>

                        <option value="Male">
                            Male
                        </option>

                        <option value="Female">
                            Female
                        </option>

                        <option value="Other">
                            Other
                        </option>
                    </select>
                </label>

                <label>
                    <span>Division</span>

                    <input
                        value={division}
                        placeholder="e.g. Division A"
                        onChange={(event) =>
                            onDivisionChange(
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>
                        Home Kit Colour
                    </span>

                    <input
                        value={homeKitColour}
                        placeholder="e.g. Red and white"
                        onChange={(event) =>
                            onHomeKitColourChange(
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>
                        Away Kit Colour
                    </span>

                    <input
                        value={awayKitColour}
                        placeholder="e.g. Blue"
                        onChange={(event) =>
                            onAwayKitColourChange(
                                event.target.value
                            )
                        }
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
                        rows={4}
                        onChange={(event) =>
                            onNotesChange(
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