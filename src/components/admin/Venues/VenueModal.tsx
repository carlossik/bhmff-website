import {
    Loader2,
    MapPin,
    Save,
    Search,
    X,
} from 'lucide-react'
import {
    useState,
    type FormEvent,
} from 'react'

import type { VenueFormValues } from './venueTypes'
import { EnterpriseModal } from '../../common/EnterpriseModal'

type VenueModalProps = {
    mode: 'create' | 'edit'
    values: VenueFormValues
    isSaving: boolean
    onChange: (values: VenueFormValues) => void
    onClose: () => void
    onSave: () => void
}

type PostcodeLookupResult = {
    postcode: string
    admin_district?: string | null
    parish?: string | null
    region?: string | null
    country?: string | null
}

type PostcodeLookupResponse = {
    status: number
    result?: PostcodeLookupResult | null
    error?: string
}

const fieldClassName =
    'mt-2 w-full rounded-xl border border-[color:var(--thq-accent,#84cc16)]/25 bg-black/10 px-4 py-3 text-sm font-medium text-[var(--thq-text,#ffffff)] outline-none transition placeholder:opacity-45 focus:border-[var(--thq-accent,#84cc16)] focus:ring-2 focus:ring-[var(--thq-accent,#84cc16)]/15 disabled:cursor-not-allowed disabled:opacity-60'

const labelClassName =
    'block text-sm font-semibold text-[var(--thq-text,#ffffff)]/80'

function normaliseSpaces(value: string) {
    return value.replace(/\s+/g, ' ')
}

function formatPostcode(value: string) {
    const compact = value
        .toUpperCase()
        .replace(/\s+/g, '')

    if (compact.length <= 3) {
        return compact
    }

    return `${compact.slice(0, -3)} ${compact.slice(-3)}`
}

function buildAreaAddress(
    result: PostcodeLookupResult
) {
    const parts = [
        result.parish,
        result.admin_district,
        result.region,
        result.country,
    ]
        .map((value) => value?.trim())
        .filter(
            (value): value is string =>
                Boolean(value)
        )

    return Array.from(
        new Set(parts)
    ).join(', ')
}

export function VenueModal({
    mode,
    values,
    isSaving,
    onChange,
    onClose,
    onSave,
}: VenueModalProps) {
    const [isLookingUp, setIsLookingUp] =
        useState(false)

    const [
        lookupMessage,
        setLookupMessage,
    ] = useState('')

    const [
        lookupError,
        setLookupError,
    ] = useState('')

    function updateField<
        K extends keyof VenueFormValues,
    >(
        field: K,
        value: VenueFormValues[K]
    ) {
        onChange({
            ...values,
            [field]: value,
        })
    }

    function handlePostcodeChange(
        value: string
    ) {
        setLookupMessage('')
        setLookupError('')

        updateField(
            'postcode',
            value.toUpperCase()
        )
    }

    async function lookupPostcode() {
        const postcode =
            formatPostcode(values.postcode)

        if (!postcode.trim()) {
            setLookupMessage('')
            setLookupError(
                'Enter a postcode before searching.'
            )
            return
        }

        setIsLookingUp(true)
        setLookupMessage('')
        setLookupError('')

        try {
            const response = await fetch(
                `https://api.postcodes.io/postcodes/${encodeURIComponent(
                    postcode
                )}`
            )

            const payload =
                (await response.json()) as PostcodeLookupResponse

            if (
                !response.ok ||
                !payload.result
            ) {
                throw new Error(
                    payload.error ||
                        'The postcode could not be found.'
                )
            }

            const formattedPostcode =
                formatPostcode(
                    payload.result.postcode
                )

            const areaAddress =
                buildAreaAddress(
                    payload.result
                )

            onChange({
                ...values,
                postcode:
                    formattedPostcode,
                address:
                    values.address.trim()
                        ? values.address
                        : areaAddress,
            })

            setLookupMessage(
                areaAddress
                    ? `Postcode confirmed. Area details added: ${areaAddress}.`
                    : 'Postcode confirmed.'
            )
        } catch (error) {
            setLookupError(
                error instanceof Error
                    ? error.message
                    : 'The postcode lookup failed.'
            )
        } finally {
            setIsLookingUp(false)
        }
    }

    function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        if (
            isSaving ||
            !values.name.trim()
        ) {
            return
        }

        onChange({
            ...values,
            name: normaliseSpaces(
                values.name
            ).trim(),
            address: normaliseSpaces(
                values.address
            ).trim(),
            postcode: formatPostcode(
                values.postcode
            ),
            notes: values.notes.trim(),
        })

        onSave()
    }

    return (
        <EnterpriseModal
            title={mode === 'edit' ? 'Edit Venue' : 'Add Venue'}
            eyebrow="Venue administration"
            description="Add the ground, location and access information organisers and teams will need."
            closeDisabled={isSaving}
            onClose={onClose}
            maxWidthClassName="max-w-3xl"
        >
                <form
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={handleSubmit}
                >
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <label className={labelClassName}>
                                Venue name{' '}
                                <span className="text-[var(--thq-accent,#84cc16)]">
                                    *
                                </span>

                                <input
                                    className={fieldClassName}
                                    value={values.name}
                                    placeholder="e.g. Meridian Sports Ground"
                                    autoFocus
                                    disabled={isSaving}
                                    onChange={(event) =>
                                        updateField(
                                            'name',
                                            event
                                                .currentTarget
                                                .value
                                        )
                                    }
                                    onBlur={(event) =>
                                        updateField(
                                            'name',
                                            normaliseSpaces(
                                                event
                                                    .currentTarget
                                                    .value
                                            ).trim()
                                        )
                                    }
                                />
                            </label>

                            <div>
                                <label className={labelClassName}>
                                    Postcode
                                </label>

                                <div className="mt-2 flex gap-2">
                                    <input
                                        className="min-w-0 flex-1 rounded-xl border border-lime-900/60 bg-[#0c160b] px-4 py-3 text-sm font-medium uppercase text-[var(--thq-text,#ffffff)] outline-none transition placeholder:text-slate-600 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                                        value={
                                            values.postcode
                                        }
                                        placeholder="e.g. IG6 3LD"
                                        disabled={
                                            isSaving ||
                                            isLookingUp
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handlePostcodeChange(
                                                event
                                                    .currentTarget
                                                    .value
                                            )
                                        }
                                        onBlur={(
                                            event
                                        ) =>
                                            updateField(
                                                'postcode',
                                                formatPostcode(
                                                    event
                                                        .currentTarget
                                                        .value
                                                )
                                            )
                                        }
                                    />

                                    <button
                                        type="button"
                                        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-lime-700 bg-[var(--thq-accent,#84cc16)]/10 px-4 text-sm font-bold text-[var(--thq-accent,#84cc16)] transition hover:bg-[var(--thq-accent,#84cc16)] hover:text-black disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-600"
                                        disabled={
                                            isSaving ||
                                            isLookingUp ||
                                            !values.postcode.trim()
                                        }
                                        onClick={() =>
                                            void lookupPostcode()
                                        }
                                    >
                                        {isLookingUp ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Search className="h-4 w-4" />
                                        )}

                                        <span className="hidden sm:inline">
                                            {isLookingUp
                                                ? 'Looking up...'
                                                : 'Lookup'}
                                        </span>
                                    </button>
                                </div>

                                {lookupMessage && (
                                    <p className="mt-2 text-xs leading-5 text-[var(--thq-accent,#84cc16)]">
                                        {lookupMessage}
                                    </p>
                                )}

                                {lookupError && (
                                    <p className="mt-2 text-xs leading-5 text-red-300">
                                        {lookupError}
                                    </p>
                                )}
                            </div>

                            <label
                                className={`${labelClassName} md:col-span-2`}
                            >
                                Address

                                <input
                                    className={fieldClassName}
                                    value={
                                        values.address
                                    }
                                    placeholder="Street address, town or area"
                                    disabled={isSaving}
                                    onChange={(event) =>
                                        updateField(
                                            'address',
                                            event
                                                .currentTarget
                                                .value
                                        )
                                    }
                                    onBlur={(event) =>
                                        updateField(
                                            'address',
                                            normaliseSpaces(
                                                event
                                                    .currentTarget
                                                    .value
                                            ).trim()
                                        )
                                    }
                                />

                                <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">
                                    Postcode lookup confirms the postcode and can add area details. Add the building or street manually where required.
                                </span>
                            </label>

                            <label
                                className={`${labelClassName} md:col-span-2`}
                            >
                                Venue notes

                                <textarea
                                    className={`${fieldClassName} min-h-32 resize-y`}
                                    value={values.notes}
                                    disabled={isSaving}
                                    placeholder="Parking, changing rooms, pitch access, floodlights, surface, disabled access, refreshments or anything organisers should know."
                                    onChange={(event) =>
                                        updateField(
                                            'notes',
                                            event
                                                .currentTarget
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <div className="rounded-2xl border border-[color:var(--thq-accent,#84cc16)]/20 bg-black/5 p-4 md:col-span-2">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-[var(--thq-accent,#84cc16)]/10 p-3">
                                        <MapPin className="h-5 w-5 text-[var(--thq-accent,#84cc16)]" />
                                    </div>

                                    <div>
                                        <p className="text-sm font-bold text-[var(--thq-text,#ffffff)]">
                                            Venue summary
                                        </p>

                                        <p className="mt-1 text-sm text-[var(--thq-accent,#84cc16)]">
                                            {values.name.trim() ||
                                                'Venue name not entered'}
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-slate-400">
                                            {[
                                                values.address.trim(),
                                                formatPostcode(
                                                    values.postcode
                                                ),
                                            ]
                                                .filter(
                                                    Boolean
                                                )
                                                .join(
                                                    ' · '
                                                ) ||
                                                'Add an address or postcode to complete the location.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-lime-900/50 bg-[var(--thq-surface,#0d170c)] px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-900/60 bg-black/20 px-5 py-3 text-sm font-bold text-[var(--thq-text,#ffffff)] transition hover:border-lime-500/70 hover:bg-[var(--thq-accent,#84cc16)]/5 disabled:cursor-not-allowed disabled:opacity-50"
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </button>

                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--thq-accent,#84cc16)] px-5 py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                            type="submit"
                            disabled={
                                isSaving ||
                                !values.name.trim()
                            }
                        >
                            <Save className="h-4 w-4" />

                            {isSaving
                                ? 'Saving...'
                                : mode === 'edit'
                                  ? 'Update Venue'
                                  : 'Create Venue'}
                        </button>
                    </footer>
                </form>
        </EnterpriseModal>
    )

}