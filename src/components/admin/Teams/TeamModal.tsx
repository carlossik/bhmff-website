import {
    useEffect,
    useState,
    type ChangeEvent,
} from 'react'
import {
    Building2,
    ImagePlus,
    MapPin,
    Plus,
    Save,
    X,
} from 'lucide-react'
import { Modal } from '../../common/Modal'
import type {
    ClubOption,
    NewTeamVenueDraft,
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
    createNewVenue: boolean
    newVenueDraft: NewTeamVenueDraft
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
    onPrimaryHomeVenueChange: (value: string) => void
    onCreateNewVenueChange: (value: boolean) => void
    onNewVenueDraftChange: (
        value: NewTeamVenueDraft
    ) => void
    onLogoSelected: (file: File | null) => void
    onClose: () => void
    onSave: () => void
}

const fieldClassName =
    'mt-2 w-full rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--organisation-accent)] focus:ring-2 focus:ring-[var(--organisation-accent)] disabled:cursor-not-allowed disabled:opacity-60'

const labelClassName =
    'text-sm font-semibold text-slate-300'

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
    createNewVenue,
    newVenueDraft,
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
    onCreateNewVenueChange,
    onNewVenueDraftChange,
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
            return
        }

        setPreview(logoUrl)
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
            <div className="max-h-[75vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <label className={labelClassName}>
                        Club
                        <span className="ml-1 text-red-400">*</span>

                        <select
                            className={fieldClassName}
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

                    <label className={labelClassName}>
                        Team name
                        <span className="ml-1 text-red-400">*</span>

                        <input
                            className={fieldClassName}
                            value={teamName}
                            placeholder="e.g. U15 Reds"
                            onChange={(event) =>
                                onTeamNameChange(
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <label className={labelClassName}>
                        Age group

                        <input
                            className={fieldClassName}
                            value={ageGroup}
                            placeholder="e.g. U15"
                            onChange={(event) =>
                                onAgeGroupChange(
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <label className={labelClassName}>
                        Year group

                        <input
                            className={fieldClassName}
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

                    <label className={labelClassName}>
                        Gender

                        <select
                            className={fieldClassName}
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

                    <label className={labelClassName}>
                        Division

                        <input
                            className={fieldClassName}
                            value={division}
                            placeholder="e.g. Division A"
                            onChange={(event) =>
                                onDivisionChange(
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <label className={labelClassName}>
                        Home kit colour

                        <input
                            className={fieldClassName}
                            value={homeKitColour}
                            placeholder="e.g. Red and white"
                            onChange={(event) =>
                                onHomeKitColourChange(
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <label className={labelClassName}>
                        Away kit colour

                        <input
                            className={fieldClassName}
                            value={awayKitColour}
                            placeholder="e.g. Blue"
                            onChange={(event) =>
                                onAwayKitColourChange(
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <label className={labelClassName}>
                        Participation status

                        <select
                            className={fieldClassName}
                            value={participationStatus}
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

                    <div className="md:col-span-2 rounded-2xl border border-[var(--organisation-border)] bg-black/20 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-[var(--organisation-surface)] p-3">
                                    <MapPin className="h-5 w-5 text-[var(--organisation-accent)]" />
                                </div>

                                <div>
                                    <h4 className="font-semibold text-white">
                                        Primary home venue
                                        <span className="ml-1 text-red-400">*</span>
                                    </h4>

                                    <p className="mt-1 text-sm leading-6 text-slate-400">
                                        Select an existing pitch or create one here. Each pitch is saved separately so the scheduler can use multiple pitches at the same ground simultaneously.
                                    </p>
                                </div>
                            </div>

                            <button
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--organisation-accent)] bg-[var(--organisation-surface)] px-4 py-2 text-sm font-semibold text-[var(--organisation-accent)] transition hover:bg-[var(--organisation-surface)]"
                                type="button"
                                onClick={() =>
                                    onCreateNewVenueChange(
                                        !createNewVenue
                                    )
                                }
                            >
                                {createNewVenue ? (
                                    <>
                                        <X className="h-4 w-4" />
                                        Select existing
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" />
                                        Add new venue
                                    </>
                                )}
                            </button>
                        </div>

                        {createNewVenue ? (
                            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <label className={labelClassName}>
                                    Ground or venue name
                                    <span className="ml-1 text-red-400">*</span>

                                    <input
                                        className={fieldClassName}
                                        value={newVenueDraft.groundName}
                                        placeholder="e.g. Meridian Sports Ground"
                                        onChange={(event) =>
                                            onNewVenueDraftChange({
                                                ...newVenueDraft,
                                                groundName:
                                                    event.target.value,
                                            })
                                        }
                                    />
                                </label>

                                <label className={labelClassName}>
                                    Pitch number or name

                                    <input
                                        className={fieldClassName}
                                        value={newVenueDraft.pitchName}
                                        placeholder="e.g. Pitch 1, Main Pitch"
                                        onChange={(event) =>
                                            onNewVenueDraftChange({
                                                ...newVenueDraft,
                                                pitchName:
                                                    event.target.value,
                                            })
                                        }
                                    />
                                </label>

                                <div className="md:col-span-2 rounded-xl border border-sky-800/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                                    The saved venue will appear as{' '}
                                    <strong>
                                        {newVenueDraft.groundName.trim() ||
                                            'Ground name'}
                                        {newVenueDraft.pitchName.trim()
                                            ? ` — ${newVenueDraft.pitchName.trim()}`
                                            : ''}
                                    </strong>
                                    .
                                </div>
                            </div>
                        ) : (
                            <label className={`${labelClassName} mt-5 block`}>
                                Existing venue or pitch

                                <select
                                    className={fieldClassName}
                                    value={primaryHomeVenueId}
                                    onChange={(event) =>
                                        onPrimaryHomeVenueChange(
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="">
                                        Select a home venue
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
                        )}
                    </div>

                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--organisation-border)] bg-black/20 p-4 md:col-span-2">
                        <input
                            className="h-4 w-4 accent-[var(--organisation-accent)]"
                            type="checkbox"
                            checked={published}
                            onChange={(event) =>
                                onPublishedChange(
                                    event.target.checked
                                )
                            }
                        />

                        <div>
                            <span className="font-semibold text-white">
                                Display on public website
                            </span>

                            <p className="mt-1 text-xs text-slate-500">
                                Make this team visible on public competition pages.
                            </p>
                        </div>
                    </label>

                    <div className="rounded-2xl border border-[var(--organisation-border)] bg-black/20 p-5 md:col-span-2">
                        <div className="flex items-center gap-3">
                            <ImagePlus className="h-5 w-5 text-[var(--organisation-accent)]" />
                            <span className="font-semibold text-white">
                                Team logo
                            </span>
                        </div>

                        {preview && (
                            <img
                                src={preview}
                                alt={
                                    teamName
                                        ? `${teamName} logo preview`
                                        : 'Team logo preview'
                                }
                                className="mt-4 h-24 w-24 rounded-2xl border border-[var(--organisation-border)] object-cover"
                            />
                        )}

                        <input
                            className={`${fieldClassName} file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--organisation-accent)] file:px-4 file:py-2 file:font-semibold file:text-[var(--organisation-on-accent)]`}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                        />
                    </div>

                    <label className={`${labelClassName} md:col-span-2`}>
                        Notes

                        <textarea
                            className={fieldClassName}
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
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--organisation-border)] pt-5 sm:flex-row sm:justify-end">
                <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--organisation-border)] bg-black/20 px-5 py-3 font-semibold text-white transition hover:border-[var(--organisation-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                >
                    <X className="h-4 w-4" />
                    Cancel
                </button>

                <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-5 py-3 font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                    type="button"
                    disabled={isSaving}
                    onClick={onSave}
                >
                    <Save className="h-4 w-4" />
                    {isSaving
                        ? 'Saving...'
                        : mode === 'edit'
                            ? 'Update Team'
                            : 'Save Team'}
                </button>
            </div>
        </Modal>
    )
}
