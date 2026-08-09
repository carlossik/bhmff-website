import {
    useEffect,
    useState,
    type FormEvent,
} from 'react'

import {
    CheckCircle2,
    Loader2,
    Save,
    Trophy,
} from 'lucide-react'

import {
    competitionService,
} from '../../services/competitionService'
import type {
    Competition,
    CompetitionFormat,
    CompetitionStatus,
    CreateCompetitionInput,
} from '../../types/competitionTypes'
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
    { value: 'ROUND_ROBIN', label: 'Round Robin' },
    { value: 'GROUP_AND_KNOCKOUT', label: 'Group and Knockout' },
    { value: 'KNOCKOUT', label: 'Knockout' },
    { value: 'SINGLE_MATCH', label: 'Single Match' },
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

        if (message.toLowerCase().includes('duplicate')) {
            return 'A competition with this slug already exists. Choose a different competition name or slug.'
        }

        return message
    }

    return 'Unable to create the competition.'
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
    const [draft, setDraft] =
        useState<CompetitionDraft>(initialDraft)
    const [slugEdited, setSlugEdited] =
        useState(false)
    const [loading, setLoading] =
        useState(Boolean(competitionId))
    const [saving, setSaving] =
        useState(false)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

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

    function updateDraft<Key extends keyof CompetitionDraft>(
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

        if (!draft.name.trim()) {
            setErrorMessage(
                'Competition name is required.',
            )
            return
        }

        if (!draft.slug.trim()) {
            setErrorMessage(
                'Competition slug is required.',
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
            return
        }

        setSaving(true)
        setErrorMessage(null)

        try {
            const input: CreateCompetitionInput = {
                organisation_id: organisationId,
                name: draft.name.trim(),
                slug: draft.slug.trim(),
                season: draft.season.trim() || null,
                format: draft.format,
                description:
                    draft.description.trim() || null,
                start_date: draft.startDate || null,
                end_date: draft.endDate || null,
                status: draft.status,
                published: draft.published,
            }

            const created =
                await competitionService.create(input)

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

    return (
        <div>
            <SetupWizardHeader
                title="Create your first competition"
                description="Add the essentials now. Advanced competition settings remain available in the Admin Portal after setup."
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
                                    {competition.format.replaceAll('_', ' ')}
                                    {competition.season
                                        ? ` · ${competition.season}`
                                        : ''}
                                </p>
                            </div>
                        </div>

                        <div className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300">
                            <CheckCircle2 className="h-5 w-5" />
                            Competition ready
                        </div>
                    </div>
                </section>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className="mt-8 space-y-6 rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-5 sm:p-6"
                >
                    <div className="grid gap-5 md:grid-cols-2">
                        <label className="text-sm font-bold text-[var(--organisation-text)] md:col-span-2">
                            Competition name *
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
                            URL slug *
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
                            Competition format
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
                                {formats.map((format) => (
                                    <option
                                        key={format.value}
                                        value={format.value}
                                    >
                                        {format.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="text-sm font-bold text-[var(--organisation-text)]">
                            Initial status
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
                                {statuses.map((status) => (
                                    <option
                                        key={status.value}
                                        value={status.value}
                                    >
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="text-sm font-bold text-[var(--organisation-text)]">
                            Start date
                            <input
                                type="date"
                                value={draft.startDate}
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
                                min={draft.startDate || undefined}
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
                                value={draft.description}
                                onChange={(event) =>
                                    updateDraft(
                                        'description',
                                        event.target.value,
                                    )
                                }
                                className={`${fieldClassName} min-h-28 resize-y`}
                                placeholder="Briefly describe the competition"
                            />
                        </label>

                        <label className="flex items-center gap-3 rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-4 py-4 text-sm font-bold text-[var(--organisation-text)] md:col-span-2">
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
                            Publish this competition on the public site
                        </label>
                    </div>

                    <div className="flex justify-end border-t border-[color:var(--organisation-border)] pt-5">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-6 py-3 text-sm font-black text-[var(--organisation-on-accent)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {saving
                                ? 'Creating...'
                                : 'Create competition'}
                        </button>
                    </div>
                </form>
            )}

            <div className="mt-8">
                <SetupWizardNavigation
                    canGoBack
                    canGoForward={Boolean(competition)}
                    onBack={onBack}
                    onNext={onFinish}
                    nextLabel="Review setup"
                />
            </div>
        </div>
    )
}
