import { useEffect, useState } from 'react'

const tournamentStart = new Date('2026-10-03T09:00:00+01:00')
const tournamentEnd = new Date('2026-10-31T23:59:59+00:00')

function getTimeRemaining() {
    const now = new Date()

    if (now > tournamentEnd) {
        return null
    }

    const difference = tournamentStart.getTime() - now.getTime()

    if (difference <= 0) {
        return {
            label: 'Tournament is live',
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
        }
    }

    return {
        label: 'Countdown to kick-off',
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
    }
}

export function TournamentCountdown() {
    const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining())

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeRemaining(getTimeRemaining())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    if (!timeRemaining) {
        return null
    }

    return (
        <section className="countdownBanner">
            <span>{timeRemaining.label}</span>

            <div className="countdownGrid">
                <div><strong>{timeRemaining.days}</strong><small>Days</small></div>
                <div><strong>{timeRemaining.hours}</strong><small>Hours</small></div>
                <div><strong>{timeRemaining.minutes}</strong><small>Minutes</small></div>
                <div><strong>{timeRemaining.seconds}</strong><small>Seconds</small></div>
            </div>
        </section>
    )
}