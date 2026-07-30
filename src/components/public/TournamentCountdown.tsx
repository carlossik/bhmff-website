import {
    useEffect,
    useMemo,
    useState,
} from 'react'

const TOURNAMENT_START =
    new Date('2026-10-03T09:00:00+01:00')

type CountdownValue = {
    days: number
    hours: number
    minutes: number
    seconds: number
}

function calculateCountdown(): CountdownValue {
    const difference =
        TOURNAMENT_START.getTime() -
        Date.now()

    if (difference <= 0) {
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
        }
    }

    const totalSeconds =
        Math.floor(difference / 1000)

    return {
        days: Math.floor(
            totalSeconds / 86400,
        ),
        hours: Math.floor(
            (totalSeconds % 86400) / 3600,
        ),
        minutes: Math.floor(
            (totalSeconds % 3600) / 60,
        ),
        seconds:
            totalSeconds % 60,
    }
}

export function TournamentCountdown() {
    const [countdown, setCountdown] =
        useState<CountdownValue>(
            calculateCountdown,
        )

    useEffect(() => {
        const interval = window.setInterval(
            () => {
                setCountdown(
                    calculateCountdown(),
                )
            },
            1000,
        )

        return () => {
            window.clearInterval(interval)
        }
    }, [])

    const items = useMemo(
        () => [
            {
                label: 'Days',
                value: countdown.days,
            },
            {
                label: 'Hours',
                value: countdown.hours,
            },
            {
                label: 'Minutes',
                value: countdown.minutes,
            },
            {
                label: 'Seconds',
                value: countdown.seconds,
            },
        ],
        [countdown],
    )

    return (
        <section
            aria-label="Tournament countdown"
            style={{
                padding: '2.1rem 1rem 2rem',
                overflow: 'hidden',
                borderTop:
                    '1px solid rgba(132, 204, 22, 0.3)',
                borderBottom:
                    '1px solid rgba(132, 204, 22, 0.35)',
                background:
                    'linear-gradient(110deg, #19351a 0%, #0f2b15 45%, #175522 100%)',
                color: '#ffffff',
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    width:
                        'min(1120px, calc(100% - 1rem))',
                    margin: '0 auto',
                }}
            >
                <p
                    style={{
                        margin: '0 0 0.45rem',
                        color: '#b8ff7a',
                        fontSize:
                            'clamp(0.72rem, 1.2vw, 0.95rem)',
                        fontWeight: 900,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                    }}
                >
                    Black History Month Football Festival 2026
                </p>

                <h2
                    style={{
                        margin: '0 0 1.35rem',
                        color: '#ffffff',
                        WebkitTextFillColor: '#ffffff',
                        fontSize:
                            'clamp(2.25rem, 5.2vw, 4.7rem)',
                        lineHeight: 0.95,
                        letterSpacing: '-0.035em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                    }}
                >
                    The Festival Begins In
                </h2>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(4, minmax(120px, 170px))',
                        justifyContent: 'center',
                        gap: '0.8rem',
                    }}
                >
                    {items.map((item) => (
                        <div
                            key={item.label}
                            style={{
                                minHeight: '122px',
                                display: 'grid',
                                placeItems: 'center',
                                padding: '0.8rem',
                                borderRadius: '16px',
                                border:
                                    '1px solid rgba(132, 204, 22, 0.38)',
                                background:
                                    'rgba(4, 24, 10, 0.72)',
                                boxShadow:
                                    '0 16px 34px rgba(0, 0, 0, 0.14)',
                            }}
                        >
                            <div>
                                <strong
                                    style={{
                                        display: 'block',
                                        color: '#b8ff7a',
                                        fontSize:
                                            'clamp(2.6rem, 5vw, 4rem)',
                                        lineHeight: 0.95,
                                    }}
                                >
                                    {String(
                                        item.value,
                                    ).padStart(2, '0')}
                                </strong>

                                <span
                                    style={{
                                        display: 'block',
                                        marginTop: '0.65rem',
                                        fontSize: '0.68rem',
                                        fontWeight: 900,
                                        letterSpacing: '0.16em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                  {item.label}
                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                        marginTop: '1.15rem',
                    }}
                >
          <span
              style={{
                  padding: '0.62rem 1.25rem',
                  borderRadius: '999px',
                  border:
                      '1px solid rgba(132, 204, 22, 0.38)',
                  background:
                      'rgba(4, 24, 10, 0.46)',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
              }}
          >
            Saturday 3 October 2026
          </span>

                    <span
                        style={{
                            padding: '0.62rem 1.25rem',
                            borderRadius: '999px',
                            border:
                                '1px solid rgba(132, 204, 22, 0.38)',
                            background:
                                'rgba(4, 24, 10, 0.46)',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                        }}
                    >
            Kick-off: 09:00 AM
          </span>
                </div>
            </div>
        </section>
    )
}