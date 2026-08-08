import { Trophy } from 'lucide-react'

import { PublicEmptyState } from './public/home/PublicEmptyState'

export type PublicResult = {
    id: string
    fixtureId: string
    stage: string
    kickoffTime: string | null
    homeTeamId: string
    awayTeamId: string
    homeTeam: string
    awayTeam: string
    homeScore: number
    awayScore: number
    playerOfMatch: string
    matchReport: string
}

export type ResultsListProps = {
    results: PublicResult[]
    surfaceColour: string
    textColour: string
    accentColour: string
}

function formatMatchDate(kickoffTime: string | null) {
    if (!kickoffTime) {
        return 'Match date to be confirmed'
    }

    const date = new Date(kickoffTime)

    if (Number.isNaN(date.getTime())) {
        return 'Match date to be confirmed'
    }

    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date)
}

export function ResultsList({
                                results,
                                surfaceColour,
                                textColour,
                                accentColour,
                            }: ResultsListProps) {
    if (!results.length) {
        return (
            <PublicEmptyState
                title="No published results yet"
                description="Match results will appear here once they have been confirmed and published by the organisers."
                icon={Trophy}
                surfaceColour={surfaceColour}
                textColour={textColour}
                accentColour={accentColour}
            />
        )
    }

    return (
        <div className="grid gap-5">
            {results.map((result) => (
                <article
                    key={result.id}
                    className="overflow-hidden rounded-2xl border shadow-sm"
                    style={{
                        backgroundColor: surfaceColour,
                        borderColor: `${accentColour}30`,
                        color: textColour,
                    }}
                >
                    <div
                        className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6"
                        style={{ borderColor: `${accentColour}22` }}
                    >
                        <span
                            className="inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide"
                            style={{
                                backgroundColor: `${accentColour}18`,
                                color: accentColour,
                            }}
                        >
                            {result.stage}
                        </span>

                        <span className="text-sm opacity-70">
                            {formatMatchDate(result.kickoffTime)}
                        </span>
                    </div>

                    <div className="grid gap-4 px-5 py-6 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                        <div className="flex items-center justify-between gap-4 lg:justify-end">
                            <span className="text-base font-bold sm:text-lg">
                                {result.homeTeam}
                            </span>

                            <strong
                                className="text-3xl font-black sm:text-4xl"
                                style={{ color: accentColour }}
                            >
                                {result.homeScore}
                            </strong>
                        </div>

                        <div
                            className="mx-auto rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide"
                            style={{
                                backgroundColor: `${accentColour}10`,
                                borderColor: `${accentColour}30`,
                                color: accentColour,
                            }}
                        >
                            Full Time
                        </div>

                        <div className="flex items-center justify-between gap-4 lg:justify-start">
                            <strong
                                className="text-3xl font-black sm:text-4xl"
                                style={{ color: accentColour }}
                            >
                                {result.awayScore}
                            </strong>

                            <span className="text-base font-bold sm:text-lg">
                                {result.awayTeam}
                            </span>
                        </div>
                    </div>

                    {(result.playerOfMatch || result.matchReport) && (
                        <div
                            className="grid gap-4 border-t px-5 py-5 sm:px-6 lg:grid-cols-2"
                            style={{ borderColor: `${accentColour}22` }}
                        >
                            {result.playerOfMatch && (
                                <div
                                    className="rounded-xl border p-4"
                                    style={{
                                        backgroundColor: `${accentColour}0D`,
                                        borderColor: `${accentColour}25`,
                                    }}
                                >
                                    <span
                                        className="text-xs font-black uppercase tracking-[0.16em]"
                                        style={{ color: accentColour }}
                                    >
                                        Player of the Match
                                    </span>

                                    <strong className="mt-2 block">
                                        {result.playerOfMatch}
                                    </strong>
                                </div>
                            )}

                            {result.matchReport && (
                                <div
                                    className="rounded-xl border p-4"
                                    style={{
                                        backgroundColor: `${accentColour}08`,
                                        borderColor: `${accentColour}20`,
                                    }}
                                >
                                    <h4 className="font-black">
                                        Match Report
                                    </h4>

                                    <p className="mt-2 text-sm leading-6 opacity-75">
                                        {result.matchReport}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </article>
            ))}
        </div>
    )
}