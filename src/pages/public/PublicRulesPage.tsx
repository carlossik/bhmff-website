import {
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    ExternalLink,
    FileText,
    Loader2,
    ShieldCheck,
} from 'lucide-react'

import { CompetitionRulesContent } from '../../components/common/CompetitionRulesContent'
import {
    getPublicCompetitionRules,
    type CompetitionRules,
} from '../../services/competitionRulesService'
import type { Competition } from '../../types/competitionTypes'

type PublicRulesPageProps = {
    organisationId: string
    organisationName: string
    competitions?: Competition[]
    backgroundColour: string
    surfaceColour: string
    textColour: string
    accentColour: string
    accentTextColour: string
    basePath: string
}

function formatRulesDate(value: string): string {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return ''
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date)
}

export function PublicRulesPage({
    organisationId,
    organisationName,
    competitions = [],
    backgroundColour,
    surfaceColour,
    textColour,
    accentColour,
    accentTextColour,
}: PublicRulesPageProps) {
    const [rules, setRules] = useState<CompetitionRules[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const publishedCompetitions = useMemo(
        () => competitions.filter((competition) => competition.published),
        [competitions],
    )

    const competitionNames = useMemo(
        () => new Map(
            publishedCompetitions.map((competition) => [
                competition.id,
                competition.name,
            ]),
        ),
        [publishedCompetitions],
    )

    useEffect(() => {
        let disposed = false

        async function loadRules(): Promise<void> {
            setLoading(true)
            setError('')

            try {
                const result = await getPublicCompetitionRules(
                    organisationId,
                    publishedCompetitions.map((competition) => competition.id),
                )

                if (!disposed) {
                    setRules(result)
                }
            } catch (caughtError) {
                if (!disposed) {
                    setRules([])
                    setError(
                        caughtError instanceof Error
                            ? caughtError.message
                            : 'Tournament rules could not be loaded.',
                    )
                }
            } finally {
                if (!disposed) {
                    setLoading(false)
                }
            }
        }

        void loadRules()

        return () => {
            disposed = true
        }
    }, [organisationId, publishedCompetitions])

    return (
        <div
            className="min-h-screen"
            style={{
                background: backgroundColour,
                color: textColour,
            }}
        >
            <section
                className="border-b py-14 sm:py-16"
                style={{ borderColor: `${accentColour}30` }}
            >
                <div className="mx-auto w-[min(1000px,calc(100%-2rem))]">
                    <div
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em]"
                        style={{
                            background: `${accentColour}18`,
                            color: accentColour,
                        }}
                    >
                        <ShieldCheck className="h-4 w-4" />
                        Official competition rules
                    </div>

                    <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                        Tournament Rules
                    </h1>

                    <p className="mt-4 max-w-3xl text-base leading-7 opacity-75">
                        Read the official competition and playing rules published by{' '}
                        <strong>{organisationName}</strong>.
                    </p>
                </div>
            </section>

            <section className="py-8 sm:py-10">
                <div className="mx-auto w-[min(1000px,calc(100%-2rem))] space-y-6">
                    {loading && (
                        <div
                            className="rounded-2xl border p-8 text-center"
                            style={{
                                background: surfaceColour,
                                borderColor: `${accentColour}30`,
                            }}
                        >
                            <Loader2
                                className="mx-auto h-8 w-8 animate-spin"
                                color={accentColour}
                            />
                            <p className="mt-4 text-sm font-bold opacity-70">
                                Loading tournament rules...
                            </p>
                        </div>
                    )}

                    {!loading && error && (
                        <div
                            role="alert"
                            className="rounded-2xl border p-6 text-sm font-semibold"
                            style={{
                                background: surfaceColour,
                                borderColor: `${accentColour}30`,
                            }}
                        >
                            Tournament rules are temporarily unavailable. Please try again later.
                        </div>
                    )}

                    {!loading && !error && rules.length === 0 && (
                        <div
                            className="rounded-2xl border p-10 text-center"
                            style={{
                                background: surfaceColour,
                                borderColor: `${accentColour}30`,
                            }}
                        >
                            <FileText
                                className="mx-auto h-10 w-10"
                                color={accentColour}
                            />
                            <h2 className="mt-4 text-2xl font-black">
                                No public rules published yet
                            </h2>
                            <p className="mt-2 text-sm opacity-70">
                                Published competition rules will appear here when available.
                            </p>
                        </div>
                    )}

                    {rules.map((rule) => {
                        const competitionName =
                            competitionNames.get(rule.competition_id) ??
                            'Competition'
                        const publishedDate = formatRulesDate(rule.updated_at)

                        return (
                            <article
                                key={rule.id}
                                className="overflow-hidden rounded-3xl border shadow-xl shadow-black/10"
                                style={{
                                    background: surfaceColour,
                                    borderColor: `${accentColour}35`,
                                }}
                            >
                                <div
                                    className="border-b px-5 py-5 sm:px-7"
                                    style={{ borderColor: `${accentColour}25` }}
                                >
                                    <p
                                        className="text-xs font-black uppercase tracking-[0.15em]"
                                        style={{ color: accentColour }}
                                    >
                                        {competitionName}
                                    </p>
                                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                                                {rule.title}
                                            </h2>
                                            <p className="mt-2 text-sm opacity-65">
                                                Version {rule.version}
                                                {publishedDate
                                                    ? ` • Updated ${publishedDate}`
                                                    : ''}
                                            </p>
                                        </div>

                                        {rule.rules_url && (
                                            <a
                                                href={rule.rules_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black no-underline"
                                                style={{
                                                    background: accentColour,
                                                    color: accentTextColour,
                                                }}
                                            >
                                                Open rules document
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {rule.rules_text && (
                                    <div className="px-5 py-6 sm:px-7 sm:py-8">
                                        <CompetitionRulesContent
                                            text={rule.rules_text}
                                        />
                                    </div>
                                )}
                            </article>
                        )
                    })}
                </div>
            </section>
        </div>
    )
}
