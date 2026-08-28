import {
    CalendarDays,
    Clock3,
    MapPin,
} from 'lucide-react'
import {
    useEffect,
    useMemo,
    useState,
} from 'react'

import type {
    ClubPublicFixture,
    ClubPublicTeam,
} from '../../../services/public/clubPublicService'

type CountdownValue = {
    days: number
    hours: number
    minutes: number
    seconds: number
    hasStarted: boolean
}

export function formatClubPublicDate(value: string): string {
    const date = new Date(`${value}T12:00:00`)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date)
}

export function getClubFixtureKickoffTimestamp(
    fixture: ClubPublicFixture,
): number | null {
    const fixtureDate = fixture.fixtureDate.trim()
    if (!fixtureDate) {
        return null
    }

    const kickoffTime = fixture.kickoffTime?.trim()
    const normalisedTime = kickoffTime
        ? kickoffTime.slice(0, 8)
        : '23:59:59'

    const timestamp = new Date(
        `${fixtureDate}T${normalisedTime}`,
    ).getTime()

    return Number.isNaN(timestamp) ? null : timestamp
}

function calculateCountdown(
    targetTimestamp: number | null,
): CountdownValue {
    if (targetTimestamp === null) {
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            hasStarted: false,
        }
    }

    const difference = targetTimestamp - Date.now()

    if (difference <= 0) {
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            hasStarted: true,
        }
    }

    const totalSeconds = Math.floor(difference / 1000)

    return {
        days: Math.floor(totalSeconds / 86_400),
        hours: Math.floor((totalSeconds % 86_400) / 3_600),
        minutes: Math.floor((totalSeconds % 3_600) / 60),
        seconds: totalSeconds % 60,
        hasStarted: false,
    }
}

function countdownValue(value: number): string {
    return String(value).padStart(2, '0')
}

export type ClubNextMatchCountdownProps = {
    fixture: ClubPublicFixture
    fixtureTitle: string
    accentColour: string
    teamName?: string | null
}

export function ClubNextMatchCountdown({
    fixture,
    fixtureTitle,
    accentColour,
    teamName = null,
}: ClubNextMatchCountdownProps) {
    const targetTimestamp = useMemo(
        () => getClubFixtureKickoffTimestamp(fixture),
        [fixture],
    )

    const [countdown, setCountdown] = useState<CountdownValue>(() =>
        calculateCountdown(targetTimestamp),
    )

    useEffect(() => {
        setCountdown(calculateCountdown(targetTimestamp))

        if (targetTimestamp === null) {
            return
        }

        const interval = window.setInterval(() => {
            setCountdown(calculateCountdown(targetTimestamp))
        }, 1000)

        return () => window.clearInterval(interval)
    }, [targetTimestamp])

    const items = [
        { label: 'Days', value: countdown.days },
        { label: 'Hours', value: countdown.hours },
        { label: 'Minutes', value: countdown.minutes },
        { label: 'Seconds', value: countdown.seconds },
    ]

    return (
        <>
            <p
                className="text-xs font-black uppercase tracking-[0.14em]"
                style={{ color: accentColour }}
            >
                Next Match Begins In
            </p>

            {teamName && (
                <p className="mt-3 text-xs font-bold uppercase tracking-wider opacity-55">
                    {teamName}
                </p>
            )}

            <h2
                className="mt-2 font-black tracking-[-0.04em]"
                style={{
                    fontSize: 'clamp(1.55rem, 2.5vw, 2.9rem)',
                    lineHeight: 1.05,
                    textTransform: 'none',
                }}
            >
                {fixtureTitle}
            </h2>

            {targetTimestamp !== null && !countdown.hasStarted ? (
                <div className="mt-5 grid grid-cols-4 gap-2">
                    {items.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-xl border px-2 py-3 text-center"
                            style={{
                                background: `${accentColour}0D`,
                                borderColor: `${accentColour}28`,
                            }}
                        >
                            <strong
                                className="block text-xl font-black tabular-nums sm:text-2xl"
                                style={{ color: accentColour }}
                            >
                                {countdownValue(item.value)}
                            </strong>
                            <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.12em] opacity-55 sm:text-[10px]">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            ) : targetTimestamp !== null ? (
                <p
                    className="mt-4 text-sm font-bold"
                    style={{ color: accentColour }}
                >
                    Kick-off is underway.
                </p>
            ) : (
                <p className="mt-4 text-sm opacity-65">
                    Kick-off time has not been confirmed yet.
                </p>
            )}

            <div className="mt-5 space-y-2 text-sm opacity-70">
                <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {formatClubPublicDate(fixture.fixtureDate)}
                </p>

                {fixture.kickoffTime && (
                    <p className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4" />
                        {fixture.kickoffTime.slice(0, 5)}
                    </p>
                )}

                <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {fixture.venueName ??
                        (fixture.homeAway === 'away' ? 'Away' : 'Home')}
                </p>
            </div>
        </>
    )
}

export type ClubTeamCardProps = {
    team: ClubPublicTeam
    href: string
    accentColour: string
    surfaceColour: string
    textColour: string
    nextFixtureLabel?: string | null
    playerCount?: number
}

export function ClubTeamCard({
    team,
    href,
    accentColour,
    surfaceColour,
    textColour,
    nextFixtureLabel = null,
    playerCount = 0,
}: ClubTeamCardProps) {
    const metadata = [
        team.ageGroup,
        team.division,
        team.gender,
    ].filter((value): value is string => Boolean(value?.trim()))

    return (
        <a
            href={href}
            className="group block rounded-2xl border p-5 no-underline transition hover:-translate-y-0.5"
            style={{
                background: surfaceColour,
                borderColor: `${accentColour}35`,
                color: textColour,
            }}
        >
            <div className="flex items-start gap-4">
                {team.logoUrl ? (
                    <img
                        src={team.logoUrl}
                        alt={`${team.name} badge`}
                        className="h-14 w-14 shrink-0 rounded-xl object-contain"
                    />
                ) : (
                    <div
                        className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-lg font-black"
                        style={{
                            background: `${accentColour}18`,
                            color: accentColour,
                        }}
                    >
                        {team.name.charAt(0).toUpperCase()}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black">
                        {team.name}
                    </h3>

                    <p className="mt-1 text-xs font-semibold opacity-60">
                        {metadata.length > 0
                            ? metadata.join(' • ')
                            : 'Club team'}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                        <span
                            className="rounded-full px-2.5 py-1"
                            style={{
                                background: `${accentColour}14`,
                                color: accentColour,
                            }}
                        >
                            {playerCount} player{playerCount === 1 ? '' : 's'}
                        </span>

                        {nextFixtureLabel && (
                            <span className="rounded-full bg-black/10 px-2.5 py-1 opacity-70">
                                Next: {nextFixtureLabel}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div
                className="mt-5 text-sm font-black transition group-hover:translate-x-1"
                style={{ color: accentColour }}
            >
                View team →
            </div>
        </a>
    )
}
