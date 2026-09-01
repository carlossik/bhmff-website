import {
    useEffect,
    useState,
    type FormEvent,
} from 'react'

import {
    CheckCircle2,
    ChevronDown,
    Loader2,
    Save,
    Settings2,
    Trophy,
} from 'lucide-react'

import {
    competitionService,
} from '../../services/competitionService'
import {
    supabase,
} from '../../lib/supabaseClient'
import type {
    Competition,
    CompetitionFormat,
    CompetitionStatus,
    CreateCompetitionInput,
} from '../../types/competitionTypes'
import type {
    Sport,
} from '../../types/sportTypes'
import {
    SetupWizardHeader,
} from '../../pages/onboarding/SetupWizardHeader'
import {
    SetupWizardNavigation,
} from '../../pages/onboarding/SetupWizardNavigation'

type CompetitionStepProps = {
    organisationId: string | null
    competitionId: string | null
    onBack: () => void
    onCreated: (competition: Competition) => void
    onFinish: () => void
}

type CompetitionDraft = {
    sportId: string
    name: string
    slug: string
    season: string
    format: CompetitionFormat
    description: string
    startDate: string
    endDate: string
    status: CompetitionStatus
    published: boolean
}

const formats: Array<{
    value: CompetitionFormat
    label: string
}> = [
    { value: 'LEAGUE', label: 'League' },
    {
        value: 'ROUND_ROBIN',
        label: 'Round Robin',
    },
    {
        value: 'GROUP_AND_KNOCKOUT',
        label: 'Group and Knockout',
    },
    { value: 'KNOCKOUT', label: 'Knockout' },
    {
        value: 'SINGLE_MATCH',
        label: 'Single Match',
    },
    { value: 'FRIENDLY', label: 'Friendly' },
    { value: 'CUSTOM', label: 'Custom' },
]

const statuses: Array<{
    value: CompetitionStatus
    label: string
}> = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ACTIVE', label: 'Active' },
]

const initialDraft: CompetitionDraft = {
    sportId: '',
    name: '',
    slug: '',
    season: '',
    format: 'GROUP_AND_KNOCKOUT',
    description: '',
    startDate: '',
    endDate: '',
    status: 'DRAFT',
    published: false,
}

const fieldClassName =
    'mt-2 w-full rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-4 py-3 text-sm text-[var(--organisation-text)] outline-none transition placeholder:text-[var(--organisation-muted)] focus:border-[var(--organisation-accent)]'

function createSlug(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[\'’]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        const message = error.message.trim()

        if (
            message
                .toLowerCase()
                .includes('duplicate')
        ) {
            return 'A competition with this slug already exists. Open Advanced setup and choose a different URL slug.'
        }

        return message
    }

    return 'Unable to create the competition.'
}

function getDefaultSportId(
    sports: Sport[],
): string {
    const football = sports.find(
        (sport) =>
            sport.slug === 'football' ||
            sport.name
                .toLowerCase()
                .includes('football'),
    )

    return football?.id ?? sports[0]?.id ?? ''
}

function formatCompetitionFormat(
    value: CompetitionFormat,
): string {
    return value
        .split('_')
        .map(
            (part) =>
                part.charAt(0) +
                part
                    .slice(1)
                    .toLowerCase(),
        )
        .join(' ')
}

export function CompetitionStep({
    organisationId,
    competitionId,
    onBack,
    onCreated,
    onFinish,
}: CompetitionStepProps) {
    const [competition, setCompetition] =
        useState<Competition | null>(null)
    const [sports, setSports] =
        useState<Sport[]>([])
    const [sportsLoading, setSportsLoading] =
        useState(true)
    const [sportsError, setSportsError] =
        useState<string | null>(null)
    const [draft, setDraft] =
        useState<CompetitionDraft>(initialDraft)
    const [slugEdited, setSlugEdited] =
        useState(false)
    const [loading, setLoading] =
        useState(Boolean(competitionId))
    const [saving, setSaving] =
        useState(false)
    const [advancedOpen, setAdvancedOpen] =
        useState(false)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        async function loadSports() {
            setSportsLoading(true)
            setSportsError(null)

            const { data, error } =
                await supabase
                    .from('sports')
                    .select(
                        'id, name, slug, icon_key, active, created_at, updated_at',
                    )
                    .eq('active', true)
                    .order('name', {
                        ascending: true,
                    })

            if (cancelled) {
                return
            }

            if (error) {
                console.error(
                    'Failed to load sports:',
                    error,
                )

                setSports([])
                setSportsError(
                    'Unable to load sports. Please refresh and try again.',
                )
                setSportsLoading(false)
                return
            }

            setSports(
                (data ?? []) as Sport[],
            )
            setSportsLoading(false)
        }

        void loadSports()

        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        if (
            sportsLoading ||
            sports.length === 0
        ) {
            return
        }

        setDraft((current) => {
            if (current.sportId) {
                return current
            }

            return {
                ...current,
                sportId: getDefaultSportId(
                    sports,
                ),
            }
        })
    }, [sports, sportsLoading])

    useEffect(() => {
        let mounted = true

        async function loadExisting() {
            if (!competitionId) {
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                const existing =
                    await competitionService.getById(
                        competitionId,
                    )

                if (mounted && existing) {
                    setCompetition(existing)
                }
            } catch (error) {
                if (mounted) {
                    setErrorMessage(
                        getErrorMessage(error),
                    )
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        void loadExisting()

        return () => {
            mounted = false
        }
    }, [competitionId])

    function updateDraft<
        Key extends keyof CompetitionDraft,
    >(
        key: Key,
        value: CompetitionDraft[Key],
    ) {
        setDraft((current) => ({
            ...current,
            [key]: value,
        }))
        setErrorMessage(null)
    }

    function handleNameChange(value: string) {
        setDraft((current) => ({
            ...current,
            name: value,
            slug: slugEdited
                ? current.slug
                : createSlug(value),
        }))
        setErrorMessage(null)
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        if (!organisationId) {
            setErrorMessage(
                'Create your organisation before creating a competition.',
            )
            return
        }

        if (!draft.sportId) {
            setErrorMessage(
                'Sport is required. Please refresh and try again.',
            )
            return
        }

        if (!draft.name.trim()) {
            setErrorMessage(
                'Add a competition name, or choose “Set this up later” to finish onboarding without creating one now.',
            )
            return
        }

        const resolvedSlug =
            draft.slug.trim() ||
            createSlug(draft.name)

        if (!resolvedSlug) {
            setErrorMessage(
                'Unable to create a URL slug from this name. Open Advanced setup and enter a simple URL slug.',
            )
            return
        }

        if (
            draft.startDate &&
            draft.endDate &&
            draft.endDate < draft.startDate
        ) {
            setErrorMessage(
                'The end date cannot be before the start date.',
            )
            setAdvancedOpen(true)
            return
        }

        setSaving(true)
        setErrorMessage(null)

        try {
            const input: CreateCompetitionInput = {
                organisation_id: organisationId,
                sport_id: draft.sportId,
                name: draft.name.trim(),
                slug: resolvedSlug,
                season:
                    draft.season.trim() || null,
                format: draft.format,
                description:
                    draft.description.trim() ||
                    null,
                start_date:
                    draft.startDate || null,
                end_date: draft.endDate || null,
                status: draft.status,
                published: draft.published,
            }

            const created =
                await competitionService.create(
                    input,
                )

            setCompetition(created)
            onCreated(created)
        } catch (error) {
            setErrorMessage(
                getErrorMessage(error),
            )
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="grid min-h-[18rem] place-items-center">
                <Loader2 className="h-7 w-7 animate-spin text-[var(--organisation-accent)]" />
            </div>
        )
    }

    const selectedSportName =
        sports.find(
            (sport) =>
                sport.id === draft.sportId,
        )?.name ?? 'Football'

    return (
        <div>
            <SetupWizardHeader
                title="One quick setup step"
                description="Create a draft competition now, or skip it and add the competition details later from the Admin Portal. Your progress is saved either way."
            />

            {errorMessage && (
                <div
                    role="alert"
                    className="mt-6 rounded-2xl border border-red-800/50 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-200"
                >
                    {errorMessage}
                </div>
            )}

            {competition ? (
                <section className="mt-8 rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] text-[var(--organisation-accent)]">
                                <Trophy className="h-7 w-7" />
                            </div>

                            <div>
                                <h2 className="m-0 text-xl font-black text-[var(--organisation-text)]">
                                    {competition.name}
                                </h2>
                                <p className="mt-1 text-sm text-[var(--organisation-muted)]">
                                    {sports.find(
                                        (sport) =>
                                            sport.id ===
                                            competition.sport_id,
                                    )?.name ?? 'Sport'}
                                    {' · '}
                                    {formatCompetitionFormat(
                                        competition.format,
                                    )}
                                    {competition.season
                                        ? ` · ${competition.season}`
                                        : ''}
                                </p>
                            </div>
                        </div>

                        <div className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300">
                            <CheckCircle2 className="h-5 w-5" />
                            Draft competition ready
                        </div>
                    </div>
                </section>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className="mt-8 space-y-5 rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-5 sm:p-6"
                >
                    <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--organisation-accent)]">
                            Keep it simple
                        </p>
                        <h2 className="mt-2 text-xl font-black text-[var(--organisation-text)]">
                            You only need a name to get started.
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--organisation-muted)]">
                            Teams, fixtures, groups, officials, dates and public publishing can all be completed later. This creates a safe draft so you can enter the platform without a long form.
                        </p>
                    </section>

                    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.45fr)]">
                        <label className="text-sm font-bold text-[var(--organisation-text)]">
                            Competition name
                            <input
                                value={draft.name}
                                onChange={(event) =>
                                    handleNameChange(
                                        event.target.value,
                                    )
                                }
                                className={fieldClassName}
                                placeholder="e.g. Kent Youth League 2026/27"
                                autoFocus
                            />
                        </label>

                        <label className="text-sm font-bold text-[var(--organisation-text)]">
                            Sport
                            <select
                                value={draft.sportId}
                                onChange={(event) =>
                                    updateDraft(
                                        'sportId',
                                        event.target.value,
                                    )
                                }
                                className={fieldClassName}
                                disabled={
                                    saving ||
                                    sportsLoading
                                }
                            >
                                <option value="">
                                    {sportsLoading
                                        ? 'Loading...'
                                        : 'Select'}
                                </option>

                                {sports.map((sport) => (
                                    <option
                                        key={sport.id}
                                        value={sport.id}
                                    >
                                        {sport.name}
                                    </option>
                                ))}
                            </select>

                            {sportsError ? (
                                <span className="mt-2 block text-xs font-semibold text-red-300">
                                    {sportsError}
                                </span>
                            ) : (
                                <span className="mt-2 block text-xs text-[var(--organisation-muted)]">
                                    Defaults to {selectedSportName} for this release.
                                </span>
                            )}
                        </label>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setAdvancedOpen(
                                (open) => !open,
                            )
                        }
                        className="flex w-full items-center justify-between rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-4 py-3 text-left text-sm font-black text-[var(--organisation-text)] transition hover:bg-white/[0.04]"
                    >
                        <span className="inline-flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-[var(--organisation-accent)]" />
                            Optional advanced details
                        </span>
                        <ChevronDown
                            className={[
                                'h-4 w-4 transition-transform',
                                advancedOpen
                                    ? 'rotate-180'
                                    : '',
                            ].join(' ')}
                        />
                    </button>

                    {advancedOpen && (
                        <div className="grid gap-5 rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-4 md:grid-cols-2">
                            <label className="text-sm font-bold text-[var(--organisation-text)]">
                                URL slug
                                <input
                                    value={draft.slug}
                                    onChange={(event) => {
                                        setSlugEdited(true)
                                        updateDraft(
                                            'slug',
                                            createSlug(
                                                event.target.value,
                                            ),
                                        )
                                    }}
                                    className={fieldClassName}
                                    placeholder="kent-youth-league"
                                />
                            </label>

                            <label className="text-sm font-bold text-[var(--organisation-text)]">
                                Season
                                <input
                                    value={draft.season}
                                    onChange={(event) =>
                                        updateDraft(
                                            'season',
                                            event.target.value,
                                        )
                                    }
                                    className={fieldClassName}
                                    placeholder="e.g. 2026/27"
                                />
                            </label>

                            <label className="text-sm font-bold text-[var(--organisation-text)]">
                                Format
                                <select
                                    value={draft.format}
                                    onChange={(event) =>
                                        updateDraft(
                                            'format',
                                            event.target.value as CompetitionFormat,
                                        )
                                    }
                                    className={fieldClassName}
                                >
                                    {formats.map(
                                        (format) => (
                                            <option
                                                key={
                                                    format.value
                                                }
                                                value={
                                                    format.value
                                                }
                                            >
                                                {
                                                    format.label
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label className="text-sm font-bold text-[var(--organisation-text)]">
                                Status
                                <select
                                    value={draft.status}
                                    onChange={(event) =>
                                        updateDraft(
                                            'status',
                                            event.target.value as CompetitionStatus,
                                        )
                                    }
                                    className={fieldClassName}
                                >
                                    {statuses.map(
                                        (status) => (
                                            <option
                                                key={
                                                    status.value
                                                }
                                                value={
                                                    status.value
                                                }
                                            >
                                                {
                                                    status.label
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label className="text-sm font-bold text-[var(--organisation-text)]">
                                Start date
                                <input
                                    type="date"
                                    value={
                                        draft.startDate
                                    }
                                    onChange={(event) =>
                                        updateDraft(
                                            'startDate',
                                            event.target.value,
                                        )
                                    }
                                    className={fieldClassName}
                                />
                            </label>

                            <label className="text-sm font-bold text-[var(--organisation-text)]">
                                End date
                                <input
                                    type="date"
                                    value={draft.endDate}
                                    min={
                                        draft.startDate ||
                                        undefined
                                    }
                                    onChange={(event) =>
                                        updateDraft(
                                            'endDate',
                                            event.target.value,
                                        )
                                    }
                                    className={fieldClassName}
                                />
                            </label>

                            <label className="text-sm font-bold text-[var(--organisation-text)] md:col-span-2">
                                Description
                                <textarea
                                    value={
                                        draft.description
                                    }
                                    onChange={(event) =>
                                        updateDraft(
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    className={`${fieldClassName} min-h-24 resize-y`}
                                    placeholder="Briefly describe the competition"
                                />
                            </label>

                            <label className="flex items-center gap-3 rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-4 py-4 text-sm font-bold text-[var(--organisation-text)] md:col-span-2">
                                <input
                                    type="checkbox"
                                    checked={draft.published}
                                    onChange={(event) =>
                                        updateDraft(
                                            'published',
                                            event.target.checked,
                                        )
                                    }
                                    className="h-5 w-5 accent-[var(--organisation-accent)]"
                                />
                                Publish this competition on the public site now
                            </label>
                        </div>
                    )}

                    <div className="flex flex-col-reverse gap-3 border-t border-[color:var(--organisation-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            type="button"
                            onClick={onFinish}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-5 py-3 text-sm font-black text-[var(--organisation-muted)] transition hover:bg-white/[0.06]"
                        >
                            Set this up later
                        </button>

                        <button
                            type="submit"
                            disabled={
                                saving ||
                                sportsLoading ||
                                sports.length === 0
                            }
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-6 py-3 text-sm font-black text-[var(--organisation-on-accent)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {saving
                                ? 'Creating...'
                                : 'Create draft competition'}
                        </button>
                    </div>
                </form>
            )}

            <div className="mt-8">
                <SetupWizardNavigation
                    canGoBack
                    canGoForward={Boolean(
                        competition,
                    )}
                    onBack={onBack}
                    onNext={onFinish}
                    nextLabel="Review setup"
                />
            </div>
        </div>
    )
}
