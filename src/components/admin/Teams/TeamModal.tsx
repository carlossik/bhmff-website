import {
    useEffect,
    useState,
    type ChangeEvent,
} from 'react'
import {
    ImagePlus,
    MapPin,
    Plus,
    Save,
    X,
} from 'lucide-react'
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
    onPrimaryHomeVenueChange: (
        value: string
    ) => void
    onCreateNewVenueChange: (
        value: boolean
    ) => void
    onNewVenueDraftChange: (
        value: NewTeamVenueDraft
    ) => void
    onLogoSelected: (
        file: File | null
    ) => void
    onClose: () => void
    onSave: () => void
}

const fieldClassName =
    'mt-2 w-full rounded-xl border border-lime-900/60 bg-[#0c160b] px-4 py-3 text-sm font-medium text-white outline-none transition placeholder:font-normal placeholder:text-slate-600 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/15 disabled:cursor-not-allowed disabled:opacity-60'

const labelClassName =
    'block text-sm font-semibold text-slate-300'

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

    useEffect(() => {
        const previousOverflow =
            document.body.style.overflow

        document.body.style.overflow =
            'hidden'

        function handleKeyDown(
            event: KeyboardEvent
        ) {
            if (
                event.key === 'Escape' &&
                !isSaving
            ) {
                onClose()
            }
        }

        window.addEventListener(
            'keydown',
            handleKeyDown
        )

        return () => {
            document.body.style.overflow =
                previousOverflow

            window.removeEventListener(
                'keydown',
                handleKeyDown
            )
        }
    }, [
        isSaving,
        onClose,
    ])

    function handleLogoChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file =
            event.target.files?.[0] ??
            null

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
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4 font-sans backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget &&
                    !isSaving
                ) {
                    onClose()
                }
            }}
        >
            <section
                aria-labelledby="team-modal-title"
                aria-modal="true"
                className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-lime-900/60 bg-[#0d170c] shadow-2xl shadow-black/70"
                role="dialog"
            >
                <header className="flex shrink-0 items-center justify-between border-b border-lime-900/50 px-6 py-5 sm:px-8">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400">
                            Team administration
                        </p>

                        <h2
                            id="team-modal-title"
                            className="mt-1 text-2xl font-bold tracking-tight text-lime-300 sm:text-3xl"
                        >
                            {mode === 'edit'
                                ? 'Edit Team'
                                : 'Add Team'}
                        </h2>
                    </div>

                    <button
                        aria-label="Close team form"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-lime-800/60 bg-black/20 text-slate-300 transition hover:border-lime-500 hover:bg-lime-400/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <label className={labelClassName}>
                            Club
                            <span className="ml-1 text-red-400">
                                *
                            </span>

                            <select
                                className={fieldClassName}
                                value={clubId}
                                onChange={(event) =>
                                    onClubIdChange(
                                        event.target
                                            .value
                                    )
                                }
                            >
                                <option value="">
                                    Select a club
                                </option>

                                {clubs.map(
                                    (club) => (
                                        <option
                                            key={
                                                club.id
                                            }
                                            value={
                                                club.id
                                            }
                                        >
                                            {
                                                club.name
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </label>

                        <label className={labelClassName}>
                            Team name
                            <span className="ml-1 text-red-400">
                                *
                            </span>

                            <input
                                className={fieldClassName}
                                value={teamName}
                                placeholder="e.g. U15 Reds"
                                onChange={(event) =>
                                    onTeamNameChange(
                                        event.target
                                            .value
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
                                        event.target
                                            .value
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
                                        event.target
                                            .value
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
                                        event.target
                                            .value
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
                                        event.target
                                            .value
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
                                        event.target
                                            .value
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
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label className={labelClassName}>
                            Participation status

                            <select
                                className={fieldClassName}
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

                        <div className="md:col-span-2 rounded-2xl border border-lime-900/50 bg-black/20 p-5 sm:p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-lime-400/10 p-3">
                                        <MapPin className="h-5 w-5 text-lime-400" />
                                    </div>

                                    <div>
                                        <h3 className="text-base font-bold text-white">
                                            Primary home venue
                                            <span className="ml-1 text-red-400">
                                                *
                                            </span>
                                        </h3>

                                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                                            Select an existing pitch or create one here. Each pitch is saved separately so the scheduler can use multiple pitches at the same ground.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-lime-700/60 bg-lime-400/10 px-4 py-2.5 text-sm font-bold text-lime-200 transition hover:bg-lime-400/15"
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
                                        <span className="ml-1 text-red-400">
                                            *
                                        </span>

                                        <input
                                            className={fieldClassName}
                                            value={
                                                newVenueDraft.groundName
                                            }
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
                                            value={
                                                newVenueDraft.pitchName
                                            }
                                            placeholder="e.g. Pitch 1"
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
                                        This will be saved as{' '}
                                        <strong>
                                            {newVenueDraft
                                                    .groundName
                                                    .trim() ||
                                                'Ground name'}
                                            {newVenueDraft
                                                .pitchName
                                                .trim()
                                                ? ` — ${newVenueDraft.pitchName.trim()}`
                                                : ''}
                                        </strong>
                                        .
                                    </div>
                                </div>
                            ) : (
                                <label className={`${labelClassName} mt-5`}>
                                    Existing venue or pitch

                                    <select
                                        className={fieldClassName}
                                        value={
                                            primaryHomeVenueId
                                        }
                                        onChange={(event) =>
                                            onPrimaryHomeVenueChange(
                                                event.target
                                                    .value
                                            )
                                        }
                                    >
                                        <option value="">
                                            Select a home venue
                                        </option>

                                        {venues.map(
                                            (venue) => (
                                                <option
                                                    key={
                                                        venue.id
                                                    }
                                                    value={
                                                        venue.id
                                                    }
                                                >
                                                    {
                                                        venue.name
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>
                            )}
                        </div>

                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-lime-900/50 bg-black/20 p-4 md:col-span-2">
                            <input
                                className="h-4 w-4 accent-lime-400"
                                type="checkbox"
                                checked={published}
                                onChange={(event) =>
                                    onPublishedChange(
                                        event.target
                                            .checked
                                    )
                                }
                            />

                            <div>
                                <span className="text-sm font-bold text-white">
                                    Display on public website
                                </span>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Make this team visible on public competition pages.
                                </p>
                            </div>
                        </label>

                        <div className="rounded-2xl border border-lime-900/50 bg-black/20 p-5 md:col-span-2">
                            <div className="flex items-center gap-3">
                                <ImagePlus className="h-5 w-5 text-lime-400" />

                                <span className="text-sm font-bold text-white">
                                    Team logo
                                </span>
                            </div>

                            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                                {preview && (
                                    <img
                                        src={preview}
                                        alt={
                                            teamName
                                                ? `${teamName} logo preview`
                                                : 'Team logo preview'
                                        }
                                        className="h-20 w-20 rounded-2xl border border-lime-900/50 object-cover"
                                    />
                                )}

                                <input
                                    className={`${fieldClassName} mt-0 file:mr-4 file:rounded-lg file:border-0 file:bg-lime-400 file:px-4 file:py-2 file:text-sm file:font-bold file:text-black hover:file:bg-lime-300`}
                                    type="file"
                                    accept="image/*"
                                    onChange={
                                        handleLogoChange
                                    }
                                />
                            </div>
                        </div>

                        <label className={`${labelClassName} md:col-span-2`}>
                            Notes

                            <textarea
                                className={fieldClassName}
                                value={notes}
                                rows={4}
                                onChange={(event) =>
                                    onNotesChange(
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>
                    </div>
                </div>

                <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-lime-900/50 bg-[#0b140a] px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-900/60 bg-black/20 px-5 py-3 text-sm font-bold text-white transition hover:border-lime-500/70 hover:bg-lime-400/5 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        <X className="h-4 w-4" />
                        Cancel
                    </button>

                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
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
                </footer>
            </section>
        </div>
    )
}