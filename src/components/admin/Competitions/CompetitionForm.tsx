import React, {
    FormEvent,
    useEffect,
    useState,
} from 'react'

import {
    CalendarDays,
    Save,
    Trophy,
    X,
} from 'lucide-react'

import type {
    Competition,
    CompetitionFormat,
    CompetitionStatus,
} from '../../../types/competitionTypes'

export interface CompetitionFormData {
    name: string
    slug: string
    season: string | null
    format: CompetitionFormat
    description: string | null
    start_date: string | null
    end_date: string | null
    status: CompetitionStatus
    published: boolean
}

interface CompetitionFormProps {
    competition?: Competition
    saving?: boolean
    onSave: (
        values: CompetitionFormData
    ) => Promise<void> | void
    onCancel: () => void
}

interface CompetitionFormErrors {
    name?: string
    slug?: string
    season?: string
    start_date?: string
    end_date?: string
}

const competitionFormats: Array<{
    value: CompetitionFormat
    label: string
}> = [
    {
        value: 'LEAGUE',
        label: 'League',
    },
    {
        value: 'ROUND_ROBIN',
        label: 'Round Robin',
    },
    {
        value: 'GROUP_AND_KNOCKOUT',
        label: 'Group and Knockout',
    },
    {
        value: 'KNOCKOUT',
        label: 'Knockout',
    },
    {
        value: 'SINGLE_MATCH',
        label: 'Single Match',
    },
    {
        value: 'FRIENDLY',
        label: 'Friendly',
    },
    {
        value: 'CUSTOM',
        label: 'Custom',
    },
]

const competitionStatuses: Array<{
    value: CompetitionStatus
    label: string
}> = [
    {
        value: 'DRAFT',
        label: 'Draft',
    },
    {
        value: 'ACTIVE',
        label: 'Active',
    },
    {
        value: 'COMPLETED',
        label: 'Completed',
    },
    {
        value: 'ARCHIVED',
        label: 'Archived',
    },
]

const createSlug = (value: string): string =>
    value
        .toLowerCase()
        .trim()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

const getInitialFormData = (
    competition?: Competition
): CompetitionFormData => ({
    name: competition?.name ?? '',
    slug: competition?.slug ?? '',
    season: competition?.season ?? '',
    format:
        competition?.format ??
        'GROUP_AND_KNOCKOUT',
    description:
        competition?.description ?? '',
    start_date:
        competition?.start_date ?? '',
    end_date:
        competition?.end_date ?? '',
    status:
        competition?.status ?? 'DRAFT',
    published:
        competition?.published ?? false,
})

export const CompetitionForm: React.FC<
    CompetitionFormProps
> = ({
         competition,
         saving = false,
         onSave,
         onCancel,
     }) => {
    const [formData, setFormData] =
        useState<CompetitionFormData>(
            getInitialFormData(competition)
        )

    const [errors, setErrors] =
        useState<CompetitionFormErrors>({})

    const [slugManuallyEdited, setSlugManuallyEdited] =
        useState(Boolean(competition?.slug))

    useEffect(() => {
        setFormData(
            getInitialFormData(competition)
        )

        setErrors({})

        setSlugManuallyEdited(
            Boolean(competition?.slug)
        )
    }, [competition])

    const updateField = <
        Key extends keyof CompetitionFormData
    >(
        field: Key,
        value: CompetitionFormData[Key]
    ) => {
        setFormData(previous => ({
            ...previous,
            [field]: value,
        }))

        setErrors(previous => ({
            ...previous,
            [field]: undefined,
        }))
    }

    const handleNameChange = (
        value: string
    ) => {
        setFormData(previous => ({
            ...previous,
            name: value,
            slug: slugManuallyEdited
                ? previous.slug
                : createSlug(value),
        }))

        setErrors(previous => ({
            ...previous,
            name: undefined,
            slug: undefined,
        }))
    }

    const handleSlugChange = (
        value: string
    ) => {
        setSlugManuallyEdited(true)

        updateField(
            'slug',
            createSlug(value)
        )
    }

    const validateForm = (): boolean => {
        const nextErrors:
            CompetitionFormErrors = {}

        const trimmedName =
            formData.name.trim()

        const trimmedSlug =
            formData.slug.trim()

        if (!trimmedName) {
            nextErrors.name =
                'Competition name is required.'
        }

        if (!trimmedSlug) {
            nextErrors.slug =
                'Competition slug is required.'
        } else if (
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
                trimmedSlug
            )
        ) {
            nextErrors.slug =
                'Use lowercase letters, numbers and hyphens only.'
        }

        if (
            formData.start_date &&
            formData.end_date &&
            formData.end_date <
            formData.start_date
        ) {
            nextErrors.end_date =
                'The end date cannot be before the start date.'
        }

        setErrors(nextErrors)

        return (
            Object.keys(nextErrors).length === 0
        )
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault()

        if (saving || !validateForm()) {
            return
        }

        await onSave({
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            season:
                formData.season?.trim() ||
                null,
            format: formData.format,
            description:
                formData.description?.trim() ||
                null,
            start_date:
                formData.start_date || null,
            end_date:
                formData.end_date || null,
            status: formData.status,
            published: formData.published,
        })
    }

    return (
        <div
            className="competition-modal-overlay"
            role="presentation"
            onMouseDown={event => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onCancel()
                }
            }}
        >
            <div
                className="competition-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="competition-form-title"
            >
                <div className="competition-modal-header">
                    <div>
                        <h3 id="competition-form-title">
                            <Trophy size={21} />

                            {competition
                                ? 'Edit Competition'
                                : 'New Competition'}
                        </h3>

                        <p>
                            {competition
                                ? 'Update the tournament details below.'
                                : 'Create a new tournament for the selected organisation.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="competition-modal-close"
                        onClick={onCancel}
                        disabled={saving}
                        aria-label="Close competition form"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form
                    className="competition-form"
                    onSubmit={handleSubmit}
                    noValidate
                >
                    <div className="competition-form-body">
                        <div className="competition-form-grid">
                            <div className="competition-form-field competition-form-field-full">
                                <label htmlFor="competition-name">
                                    Competition Name
                                    <span aria-hidden="true">
                                        *
                                    </span>
                                </label>

                                <input
                                    id="competition-name"
                                    type="text"
                                    value={formData.name}
                                    onChange={event =>
                                        handleNameChange(
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. Black History Month Football Festival 2026"
                                    autoFocus
                                    disabled={saving}
                                    className={
                                        errors.name
                                            ? 'has-error'
                                            : ''
                                    }
                                />

                                {errors.name && (
                                    <span className="competition-field-error">
                                        {errors.name}
                                    </span>
                                )}
                            </div>

                            <div className="competition-form-field">
                                <label htmlFor="competition-slug">
                                    Slug
                                    <span aria-hidden="true">
                                        *
                                    </span>
                                </label>

                                <input
                                    id="competition-slug"
                                    type="text"
                                    value={formData.slug}
                                    onChange={event =>
                                        handleSlugChange(
                                            event.target.value
                                        )
                                    }
                                    placeholder="competition-name-2026"
                                    disabled={saving}
                                    className={
                                        errors.slug
                                            ? 'has-error'
                                            : ''
                                    }
                                />

                                {errors.slug && (
                                    <span className="competition-field-error">
                                        {errors.slug}
                                    </span>
                                )}
                            </div>

                            <div className="competition-form-field">
                                <label htmlFor="competition-season">
                                    Season
                                </label>

                                <input
                                    id="competition-season"
                                    type="text"
                                    value={
                                        formData.season ??
                                        ''
                                    }
                                    onChange={event =>
                                        updateField(
                                            'season',
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. 2026 or 2026/27"
                                    disabled={saving}
                                />

                                {errors.season && (
                                    <span className="competition-field-error">
                                        {errors.season}
                                    </span>
                                )}
                            </div>

                            <div className="competition-form-field">
                                <label htmlFor="competition-format">
                                    Format
                                </label>

                                <select
                                    id="competition-format"
                                    value={formData.format}
                                    onChange={event =>
                                        updateField(
                                            'format',
                                            event.target
                                                .value as CompetitionFormat
                                        )
                                    }
                                    disabled={saving}
                                >
                                    {competitionFormats.map(
                                        option => (
                                            <option
                                                key={
                                                    option.value
                                                }
                                                value={
                                                    option.value
                                                }
                                            >
                                                {
                                                    option.label
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div className="competition-form-field">
                                <label htmlFor="competition-status">
                                    Status
                                </label>

                                <select
                                    id="competition-status"
                                    value={formData.status}
                                    onChange={event =>
                                        updateField(
                                            'status',
                                            event.target
                                                .value as CompetitionStatus
                                        )
                                    }
                                    disabled={saving}
                                >
                                    {competitionStatuses.map(
                                        option => (
                                            <option
                                                key={
                                                    option.value
                                                }
                                                value={
                                                    option.value
                                                }
                                            >
                                                {
                                                    option.label
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div className="competition-form-field">
                                <label htmlFor="competition-start-date">
                                    Start Date
                                </label>

                                <div className="competition-date-input">
                                    <CalendarDays
                                        size={17}
                                    />

                                    <input
                                        id="competition-start-date"
                                        type="date"
                                        value={
                                            formData.start_date ??
                                            ''
                                        }
                                        onChange={event =>
                                            updateField(
                                                'start_date',
                                                event.target
                                                    .value
                                            )
                                        }
                                        disabled={saving}
                                        className={
                                            errors.start_date
                                                ? 'has-error'
                                                : ''
                                        }
                                    />
                                </div>

                                {errors.start_date && (
                                    <span className="competition-field-error">
                                        {
                                            errors.start_date
                                        }
                                    </span>
                                )}
                            </div>

                            <div className="competition-form-field">
                                <label htmlFor="competition-end-date">
                                    End Date
                                </label>

                                <div className="competition-date-input">
                                    <CalendarDays
                                        size={17}
                                    />

                                    <input
                                        id="competition-end-date"
                                        type="date"
                                        value={
                                            formData.end_date ??
                                            ''
                                        }
                                        min={
                                            formData.start_date ??
                                            undefined
                                        }
                                        onChange={event =>
                                            updateField(
                                                'end_date',
                                                event.target
                                                    .value
                                            )
                                        }
                                        disabled={saving}
                                        className={
                                            errors.end_date
                                                ? 'has-error'
                                                : ''
                                        }
                                    />
                                </div>

                                {errors.end_date && (
                                    <span className="competition-field-error">
                                        {errors.end_date}
                                    </span>
                                )}
                            </div>

                            <div className="competition-form-field competition-form-field-full">
                                <label htmlFor="competition-description">
                                    Description
                                </label>

                                <textarea
                                    id="competition-description"
                                    value={
                                        formData.description ??
                                        ''
                                    }
                                    onChange={event =>
                                        updateField(
                                            'description',
                                            event.target.value
                                        )
                                    }
                                    placeholder="Add a short description of the competition..."
                                    rows={4}
                                    disabled={saving}
                                />
                            </div>

                            <div className="competition-form-field competition-form-field-full">
                                <label className="competition-checkbox-field">
                                    <input
                                        type="checkbox"
                                        checked={
                                            formData.published
                                        }
                                        onChange={event =>
                                            updateField(
                                                'published',
                                                event.target
                                                    .checked
                                            )
                                        }
                                        disabled={saving}
                                    />

                                    <span>
                                        <strong>
                                            Publish competition
                                        </strong>

                                        <small>
                                            Make this competition
                                            available on its public
                                            tournament pages.
                                        </small>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="competition-form-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={onCancel}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={saving}
                        >
                            <Save size={17} />

                            {saving
                                ? 'Saving...'
                                : competition
                                    ? 'Save Changes'
                                    : 'Create Competition'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}