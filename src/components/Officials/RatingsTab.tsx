import {
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    Plus,
    Save,
    Star,
    Trash2,
    TrendingUp,
} from 'lucide-react'

import { officialService } from '../../services/officialService'
import type {
    Official,
    OfficialRating,
} from '../../types/officialTypes'

type RatingsTabProps = {
    official: Official
}

type EditableRating = OfficialRating & {
    isNew?: boolean
}

const DEFAULT_SCORE = 5

function clampScore(value: number): number {
    if (Number.isNaN(value)) {
        return DEFAULT_SCORE
    }

    return Math.min(10, Math.max(1, value))
}

export default function RatingsTab({
                                       official,
                                   }: RatingsTabProps) {
    const [ratings, setRatings] =
        useState<EditableRating[]>([])

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [errorMessage, setErrorMessage] =
        useState('')

    const [successMessage, setSuccessMessage] =
        useState('')

    async function loadRatings() {
        setLoading(true)
        setErrorMessage('')

        try {
            const data =
                await officialService.getRatings(
                    official.id
                )

            setRatings(data)
        } catch (error) {
            setRatings([])
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Failed to load ratings.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadRatings()
    }, [official.id])

    const averageRating = useMemo(() => {
        if (!ratings.length) {
            return 0
        }

        const total = ratings.reduce(
            (sum, rating) =>
                sum + rating.overall_rating,
            0
        )

        return total / ratings.length
    }, [ratings])

    function addRating() {
        setSuccessMessage('')
        setErrorMessage('')

        setRatings((current) => [
            {
                id: crypto.randomUUID(),
                organisation_id:
                official.organisation_id,
                official_id: official.id,
                assignment_id: null,
                fixture_id: null,
                overall_rating: DEFAULT_SCORE,
                punctuality_rating:
                DEFAULT_SCORE,
                professionalism_rating:
                DEFAULT_SCORE,
                communication_rating:
                DEFAULT_SCORE,
                knowledge_rating:
                DEFAULT_SCORE,
                fairness_rating:
                DEFAULT_SCORE,
                comments: '',
                rated_by: null,
                created_at: '',
                isNew: true,
            },
            ...current,
        ])
    }

    function updateRating(
        ratingId: string,
        field: keyof OfficialRating,
        value: string | number | null
    ) {
        setSuccessMessage('')
        setErrorMessage('')

        setRatings((current) =>
            current.map((rating) =>
                rating.id === ratingId
                    ? {
                        ...rating,
                        [field]: value,
                    }
                    : rating
            )
        )
    }

    async function removeRating(
        rating: EditableRating
    ) {
        setSuccessMessage('')
        setErrorMessage('')

        if (rating.isNew) {
            setRatings((current) =>
                current.filter(
                    (item) =>
                        item.id !== rating.id
                )
            )
            return
        }

        const confirmed = window.confirm(
            'Delete this rating permanently?'
        )

        if (!confirmed) {
            return
        }

        try {
            await officialService.deleteRating(
                rating.id
            )

            setRatings((current) =>
                current.filter(
                    (item) =>
                        item.id !== rating.id
                )
            )

            setSuccessMessage(
                'Rating deleted successfully.'
            )
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete rating.'
            )
        }
    }

    async function saveRatings() {
        setSaving(true)
        setSuccessMessage('')
        setErrorMessage('')

        try {
            for (const rating of ratings) {
                const payload = {
                    organisation_id:
                    rating.organisation_id,
                    official_id:
                    rating.official_id,
                    assignment_id:
                        rating.assignment_id ??
                        null,
                    fixture_id:
                        rating.fixture_id ??
                        null,
                    overall_rating:
                        clampScore(
                            rating.overall_rating
                        ),
                    punctuality_rating:
                        rating.punctuality_rating ==
                        null
                            ? null
                            : clampScore(
                                rating.punctuality_rating
                            ),
                    professionalism_rating:
                        rating.professionalism_rating ==
                        null
                            ? null
                            : clampScore(
                                rating.professionalism_rating
                            ),
                    communication_rating:
                        rating.communication_rating ==
                        null
                            ? null
                            : clampScore(
                                rating.communication_rating
                            ),
                    knowledge_rating:
                        rating.knowledge_rating ==
                        null
                            ? null
                            : clampScore(
                                rating.knowledge_rating
                            ),
                    fairness_rating:
                        rating.fairness_rating ==
                        null
                            ? null
                            : clampScore(
                                rating.fairness_rating
                            ),
                    comments:
                        rating.comments?.trim() ||
                        null,
                    rated_by:
                        rating.rated_by ?? null,
                }

                if (rating.isNew) {
                    await officialService.addRating(
                        payload
                    )
                } else {
                    await officialService.updateRating(
                        rating.id,
                        payload
                    )
                }
            }

            await loadRatings()

            setSuccessMessage(
                'Ratings saved successfully.'
            )
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Failed to save ratings.'
            )
        } finally {
            setSaving(false)
        }
    }

    function renderScoreInput(
        rating: EditableRating,
        field:
            | 'overall_rating'
            | 'punctuality_rating'
            | 'professionalism_rating'
            | 'communication_rating'
            | 'knowledge_rating'
            | 'fairness_rating'
    ) {
        return (
            <input
                type="number"
                min={1}
                max={10}
                value={
                    rating[field] ??
                    DEFAULT_SCORE
                }
                className="w-20 rounded-lg border border-lime-900/50 bg-slate-950 px-3 py-2 text-white outline-none focus:border-lime-500"
                onChange={(event) =>
                    updateRating(
                        rating.id,
                        field,
                        clampScore(
                            Number(
                                event.currentTarget
                                    .value
                            )
                        )
                    )
                }
            />
        )
    }

    if (loading) {
        return (
            <div className="rounded-2xl border border-lime-900/40 bg-black/20 p-12 text-center text-slate-400">
                Loading ratings...
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-lime-900/40 bg-black/20 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                            <Star
                                size={22}
                                className="text-lime-400"
                            />
                            Ratings & Reviews
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                            Performance feedback for{' '}
                            <strong className="text-white">
                                {official.full_name}
                            </strong>
                            .
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={addRating}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lime-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-lime-400"
                    >
                        <Plus size={17} />
                        Add Rating
                    </button>
                </div>
            </section>

            {errorMessage && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                </div>
            )}

            {successMessage && (
                <div className="rounded-xl border border-lime-500/40 bg-lime-500/10 px-4 py-3 text-sm text-lime-200">
                    {successMessage}
                </div>
            )}

            <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-lime-900/40 bg-black/20 p-5">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Star
                            size={18}
                            className="text-lime-400"
                        />
                        Average Rating
                    </div>

                    <div className="mt-2 text-3xl font-bold text-white">
                        {averageRating.toFixed(1)}
                    </div>
                </div>

                <div className="rounded-2xl border border-lime-900/40 bg-black/20 p-5">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <TrendingUp
                            size={18}
                            className="text-lime-400"
                        />
                        Reviews
                    </div>

                    <div className="mt-2 text-3xl font-bold text-white">
                        {ratings.length}
                    </div>
                </div>
            </section>

            {!ratings.length ? (
                <div className="rounded-2xl border border-dashed border-lime-900/60 bg-black/20 px-6 py-12 text-center">
                    <Star className="mx-auto h-9 w-9 text-lime-400/70" />

                    <h3 className="mt-4 text-lg font-bold text-white">
                        No ratings recorded
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                        Add the first performance rating for this official.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-lime-900/40 bg-black/20">
                    <table className="min-w-[1050px] w-full">
                        <thead className="bg-slate-950/80 text-left text-xs uppercase tracking-wide text-slate-400">
                        <tr>
                            <th className="px-4 py-3">
                                Overall
                            </th>
                            <th className="px-4 py-3">
                                Punctuality
                            </th>
                            <th className="px-4 py-3">
                                Professionalism
                            </th>
                            <th className="px-4 py-3">
                                Communication
                            </th>
                            <th className="px-4 py-3">
                                Knowledge
                            </th>
                            <th className="px-4 py-3">
                                Fairness
                            </th>
                            <th className="px-4 py-3">
                                Comments
                            </th>
                            <th className="px-4 py-3" />
                        </tr>
                        </thead>

                        <tbody>
                        {ratings.map(
                            (rating) => (
                                <tr
                                    key={
                                        rating.id
                                    }
                                    className="border-t border-lime-900/30"
                                >
                                    <td className="p-3">
                                        {renderScoreInput(
                                            rating,
                                            'overall_rating'
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {renderScoreInput(
                                            rating,
                                            'punctuality_rating'
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {renderScoreInput(
                                            rating,
                                            'professionalism_rating'
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {renderScoreInput(
                                            rating,
                                            'communication_rating'
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {renderScoreInput(
                                            rating,
                                            'knowledge_rating'
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {renderScoreInput(
                                            rating,
                                            'fairness_rating'
                                        )}
                                    </td>
                                    <td className="min-w-64 p-3">
                                        <input
                                            value={
                                                rating.comments ??
                                                ''
                                            }
                                            placeholder="Optional comments"
                                            className="w-full rounded-lg border border-lime-900/50 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:border-lime-500"
                                            onChange={(event) =>
                                                updateRating(
                                                    rating.id,
                                                    'comments',
                                                    event.currentTarget
                                                        .value
                                                )
                                            }
                                        />
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            type="button"
                                            aria-label="Delete rating"
                                            onClick={() =>
                                                void removeRating(
                                                    rating
                                                )
                                            }
                                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            )
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() =>
                        void saveRatings()
                    }
                    disabled={
                        saving ||
                        !ratings.length
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lime-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-lime-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                    <Save size={18} />

                    {saving
                        ? 'Saving...'
                        : 'Save Ratings'}
                </button>
            </div>
        </div>
    )
}