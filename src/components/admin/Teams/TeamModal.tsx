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

export type TeamModalDraft = {
    clubId: string
    teamName: string
    ageGroup: string
    yearGroup: string
    gender: string
    division: string
    homeKitColour: string
    awayKitColour: string
    notes: string
    participationStatus: TeamParticipationStatus
    published: boolean
    primaryHomeVenueId: string
    createNewVenue: boolean
    newVenueDraft: NewTeamVenueDraft
    selectedLogo: File | null
}

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
    clubSelectionLocked?: boolean
    lockedClubName?: string
    onClose: () => void
    onSave: (draft: TeamModalDraft) => void
}

const fieldClassName =
    'mt-2 w-full rounded-xl border border-[color:var(--thq-accent,#84cc16)]/25 bg-black/10 px-4 py-3 text-sm font-medium text-[var(--thq-text,#ffffff)] outline-none transition placeholder:font-normal placeholder:opacity-45 focus:border-[var(--thq-accent,#84cc16)] focus:ring-2 focus:ring-[var(--thq-accent,#84cc16)]/15 disabled:cursor-not-allowed disabled:opacity-60'

const selectClassName =
    `${fieldClassName} bg-[#0c160b] text-white [color-scheme:dark]`

const optionClassName =
    'bg-[#0d170c] text-white'

const labelClassName =
    'block text-sm font-semibold text-[var(--thq-text,#ffffff)]/80'

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
                              clubSelectionLocked = false,
                              lockedClubName = '',
                              onClose,
                              onSave,
                          }: TeamModalProps) {
    /*
     * Keep the editable form draft inside the modal.
     *
     * Previously every keystroke updated TeamsManager. In the admin shell that
     * caused the modal subtree to be rebuilt and the browser lost input focus,
     * so users could only type one character before having to click the field
     * again. The draft now stays local for the lifetime of the open modal and
     * is submitted to the manager only when Save is pressed.
     */
    const [draft, setDraft] =
        useState<TeamModalDraft>(() => ({
            clubId,
            teamName,
            ageGroup,
            yearGroup,
            gender,
            division,
            homeKitColour,
            awayKitColour,
            notes,
            participationStatus,
            published,
            primaryHomeVenueId,
            createNewVenue,
            newVenueDraft: {
                ...newVenueDraft,
            },
            selectedLogo: null,
        }))

    const [preview, setPreview] =
        useState(logoUrl)

    useEffect(() => {
        const previousOverflow =
            document.body.style.overflow

        document.body.style.overflow = 'hidden'

        const handleKeyDown = (
            event: KeyboardEvent
        ) => {
            if (
                event.key === 'Escape' &&
                !isSaving
            ) {
                onClose()
            }
        }

        document.addEventListener(
            'keydown',
            handleKeyDown
        )

        return () => {
            document.body.style.overflow =
                previousOverflow
            document.removeEventListener(
                'keydown',
                handleKeyDown
            )
        }
    }, [isSaving, onClose])

    useEffect(() => {
        return () => {
            if (
                preview &&
                preview.startsWith('blob:')
            ) {
                URL.revokeObjectURL(preview)
            }
        }
    }, [preview])

    function updateDraft<
        Key extends keyof TeamModalDraft,
    >(
        key: Key,
        value: TeamModalDraft[Key]
    ) {
        setDraft((current) => ({
            ...current,
            [key]: value,
        }))
    }

    function handleLogoChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file =
            event.currentTarget.files?.[0] ??
            null

        updateDraft('selectedLogo', file)

        if (!file) {
            setPreview(logoUrl)
            return
        }

        setPreview(URL.createObjectURL(file))
    }

    function toggleVenueMode() {
        setDraft((current) => ({
            ...current,
            createNewVenue:
                !current.createNewVenue,
            primaryHomeVenueId:
                current.createNewVenue
                    ? current.primaryHomeVenueId
                    : '',
            newVenueDraft:
                current.createNewVenue
                    ? {
                        groundName: '',
                        pitchName: '',
                    }
                    : current.newVenueDraft,
        }))
    }

    return (
        <div
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/80 p-4 font-sans backdrop-blur-sm"
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
                className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-lime-900/60 bg-[#0d170c] shadow-2xl shadow-black/70"
                role="dialog"
            >
                <header className="shrink-0 border-b border-lime-900/50 bg-[#0d170c] px-6 py-5 sm:px-8">
                    <div className="flex items-start justify-between gap-5">
                        <div className="min-w-0">
                            <img
                                src="/assets/tournamenthq-logo.png"
                                alt="TournamentHQ"
                                className="h-9 w-auto object-contain"
                            />

                            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-lime-400">
                                Team administration
                            </p>

                            <h2
                                id="team-modal-title"
                                className="mt-1 !text-[34px] font-black !leading-[1.05] tracking-tight text-lime-300 sm:!text-[40px]"
                            >
                                {mode === 'edit'
                                    ? 'Edit Team'
                                    : 'Add Team'}
                            </h2>

                            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
                                {clubSelectionLocked
                                    ? 'Create or update a team for this club, set its home venue and control its public status.'
                                    : 'Create or update a team, assign its club and home venue, and control its public competition status.'}
                            </p>
                        </div>

                        <button
                            aria-label="Close team form"
                            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-lime-700/60 bg-black/20 text-slate-200 transition hover:border-lime-400 hover:bg-lime-400/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            type="button"
                            disabled={isSaving}
                            onClick={onClose}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        {clubSelectionLocked ? (
                            <div className="rounded-2xl border border-lime-700/30 bg-lime-400/5 px-4 py-3 md:col-span-2">
                                <span className="text-xs font-bold uppercase tracking-[0.14em] text-lime-400">
                                    Club
                                </span>
                                <p className="mt-1 text-sm font-bold text-white">
                                    {lockedClubName ||
                                        'Current club'}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-400">
                                    This team is automatically linked to your club. You do not need to select it again.
                                </p>
                            </div>
                        ) : (
                            <label className={labelClassName}>
                                Club
                                <span className="ml-1 text-red-400">
                                    *
                                </span>
                                <select
                                    className={selectClassName}
                                    style={{ colorScheme: 'dark' }}
                                    value={draft.clubId}
                                    disabled={isSaving}
                                    onChange={(event) =>
                                        updateDraft(
                                            'clubId',
                                            event.currentTarget.value
                                        )
                                    }
                                >
                                    <option className={optionClassName} value="">
                                        Select a club
                                    </option>
                                    {clubs.map((club) => (
                                        <option
                                            className={optionClassName}
                                            key={club.id}
                                            value={club.id}
                                        >
                                            {club.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        <label className={labelClassName}>
                            Team name
                            <span className="ml-1 text-red-400">
                                *
                            </span>
                            <input
                                autoFocus
                                className={fieldClassName}
                                value={draft.teamName}
                                placeholder="e.g. U15 Reds"
                                disabled={isSaving}
                                onChange={(event) =>
                                    updateDraft(
                                        'teamName',
                                        event.currentTarget.value
                                    )
                                }
                            />
                        </label>

                        <label className={labelClassName}>
                            Age group
                            <input
                                className={fieldClassName}
                                value={draft.ageGroup}
                                placeholder="e.g. U15"
                                disabled={isSaving}
                                onChange={(event) =>
                                    updateDraft(
                                        'ageGroup',
                                        event.currentTarget.value
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
                                value={draft.yearGroup}
                                placeholder="e.g. 2011"
                                disabled={isSaving}
                                onChange={(event) =>
                                    updateDraft(
                                        'yearGroup',
                                        event.currentTarget.value
                                    )
                                }
                            />
                        </label>

                        <label className={labelClassName}>
                            Gender
                            <select
                                className={selectClassName}
                                style={{ colorScheme: 'dark' }}
                                value={draft.gender}
                                disabled={isSaving}
                                onChange={(event) =>
                                    updateDraft(
                                        'gender',
                                        event.currentTarget.value
                                    )
                                }
                            >
                                <option className={optionClassName} value="Mixed">Mixed</option>
                                <option className={optionClassName} value="Male">Male</option>
                                <option className={optionClassName} value="Female">Female</option>
                                <option className={optionClassName} value="Other">Other</option>
                            </select>
                        </label>

                        <label className={labelClassName}>
                            Division
                            <input
                                className={fieldClassName}
                                value={draft.division}
                                placeholder="e.g. Division A"
                                disabled={isSaving}
                                onChange={(event) =>
                                    updateDraft(
                                        'division',
                                        event.currentTarget.value
                                    )
                                }
                            />
                        </label>

                        <label className={labelClassName}>
                            Home kit colour
                            <input
                                className={fieldClassName}
                                value={draft.homeKitColour}
                                placeholder="e.g. Red and white"
                                disabled={isSaving}
                                onChange={(event) =>
                                    updateDraft(
                                        'homeKitColour',
                                        event.currentTarget.value
                                    )
                                }
                            />
                        </label>

                        <label className={labelClassName}>
                            Away kit colour
                            <input
                                className={fieldClassName}
                                value={draft.awayKitColour}
                                placeholder="e.g. Blue"
                                disabled={isSaving}
                                onChange={(event) =>
                                    updateDraft(
                                        'awayKitColour',
                                        event.currentTarget.value
                                    )
                                }
                            />
                        </label>

                        <label className={labelClassName}>
                            Participation status
                            <select
                                className={selectClassName}
                                style={{ colorScheme: 'dark' }}
                                value={draft.participationStatus}
                                disabled={isSaving}
                                onChange={(event) =>
                                    updateDraft(
                                        'participationStatus',
                                        event.currentTarget.value as TeamParticipationStatus
                                    )
                                }
                            >
                                <option className={optionClassName} value="interested">Interested</option>
                                <option className={optionClassName} value="invited">Invited</option>
                                <option className={optionClassName} value="confirmed">Confirmed</option>
                                <option className={optionClassName} value="withdrawn">Withdrawn</option>
                            </select>
                        </label>

                        <div className="rounded-2xl border border-lime-800/40 bg-black/5 p-5 md:col-span-2 sm:p-6">
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
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-lime-500/40 bg-lime-400/10 px-4 py-2.5 text-sm font-bold text-lime-300 transition hover:bg-lime-400/15"
                                    type="button"
                                    disabled={isSaving}
                                    onClick={toggleVenueMode}
                                >
                                    {draft.createNewVenue ? (
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

                            {draft.createNewVenue ? (
                                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <label className={labelClassName}>
                                        Ground or venue name
                                        <span className="ml-1 text-red-400">
                                            *
                                        </span>
                                        <input
                                            className={fieldClassName}
                                            value={draft.newVenueDraft.groundName}
                                            placeholder="e.g. Meridian Sports Ground"
                                            disabled={isSaving}
                                            onChange={(event) =>
                                                updateDraft(
                                                    'newVenueDraft',
                                                    {
                                                        ...draft.newVenueDraft,
                                                        groundName:
                                                        event.currentTarget.value,
                                                    }
                                                )
                                            }
                                        />
                                    </label>

                                    <label className={labelClassName}>
                                        Pitch number or name
                                        <input
                                            className={fieldClassName}
                                            value={draft.newVenueDraft.pitchName}
                                            placeholder="e.g. Pitch 1"
                                            disabled={isSaving}
                                            onChange={(event) =>
                                                updateDraft(
                                                    'newVenueDraft',
                                                    {
                                                        ...draft.newVenueDraft,
                                                        pitchName:
                                                        event.currentTarget.value,
                                                    }
                                                )
                                            }
                                        />
                                    </label>

                                    <div className="rounded-xl border border-sky-800/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100 md:col-span-2">
                                        This will be saved as{' '}
                                        <strong>
                                            {draft.newVenueDraft.groundName.trim() ||
                                                'Ground name'}
                                            {draft.newVenueDraft.pitchName.trim()
                                                ? ` — ${draft.newVenueDraft.pitchName.trim()}`
                                                : ''}
                                        </strong>
                                        .
                                    </div>
                                </div>
                            ) : (
                                <label className={`${labelClassName} mt-5`}>
                                    Existing venue or pitch
                                    <select
                                        className={selectClassName}
                                        style={{ colorScheme: 'dark' }}
                                        value={draft.primaryHomeVenueId}
                                        disabled={isSaving}
                                        onChange={(event) =>
                                            updateDraft(
                                                'primaryHomeVenueId',
                                                event.currentTarget.value
                                            )
                                        }
                                    >
                                        <option className={optionClassName} value="">
                                            Select a home venue
                                        </option>
                                        {venues.map((venue) => (
                                            <option
                                                className={optionClassName}
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

                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-lime-800/40 bg-black/5 p-4 md:col-span-2">
                            <input
                                className="h-4 w-4 accent-lime-400"
                                type="checkbox"
                                checked={draft.published}
                                disabled={isSaving}
                                onChange={(event) =>
                                    updateDraft(
                                        'published',
                                        event.currentTarget.checked
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

                        <div className="rounded-2xl border border-lime-800/40 bg-black/5 p-5 md:col-span-2">
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
                                            draft.teamName
                                                ? `${draft.teamName} logo preview`
                                                : 'Team logo preview'
                                        }
                                        className="h-20 w-20 rounded-2xl border border-lime-900/50 object-cover"
                                    />
                                )}

                                <input
                                    className={`${fieldClassName} mt-0 file:mr-4 file:rounded-lg file:border-0 file:bg-lime-400 file:px-4 file:py-2 file:text-sm file:font-bold file:text-black hover:file:bg-lime-300`}
                                    type="file"
                                    accept="image/*"
                                    disabled={isSaving}
                                    onChange={handleLogoChange}
                                />
                            </div>
                        </div>

                        <label className={`${labelClassName} md:col-span-2`}>
                            Notes
                            <textarea
                                className={fieldClassName}
                                value={draft.notes}
                                rows={4}
                                disabled={isSaving}
                                onChange={(event) =>
                                    updateDraft(
                                        'notes',
                                        event.currentTarget.value
                                    )
                                }
                            />
                        </label>
                    </div>
                </div>

                <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-lime-900/50 bg-[#0d170c] px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-700/50 bg-black/10 px-5 py-3 text-sm font-bold text-white transition hover:border-lime-400/70 hover:bg-lime-400/5 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        <X className="h-4 w-4" />
                        Cancel
                    </button>

                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-500 px-5 py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                        type="button"
                        disabled={isSaving}
                        onClick={() => onSave(draft)}
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