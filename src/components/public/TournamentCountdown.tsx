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
        const interval =
            window.setInterval(
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
            className="bhmffCountdown"
        >
            <style>
                {`
                    .bhmffCountdown {
                        padding: 2.1rem 1rem 2rem;
                        overflow: hidden;
                        border-top: 1px solid rgba(132, 204, 22, 0.3);
                        border-bottom: 1px solid rgba(132, 204, 22, 0.35);
                        background: linear-gradient(110deg, #19351a 0%, #0f2b15 45%, #175522 100%);
                        color: #ffffff;
                        text-align: center;
                    }

                    .bhmffCountdownInner {
                        width: min(1120px, calc(100% - 1rem));
                        margin: 0 auto;
                    }

                    .bhmffCountdownKicker {
                        margin: 0 0 0.45rem;
                        color: #b8ff7a;
                        font-size: clamp(0.72rem, 1.2vw, 0.95rem);
                        font-weight: 900;
                        letter-spacing: 0.2em;
                        text-transform: uppercase;
                    }

                    .bhmffCountdownTitle {
                        margin: 0 0 1.35rem;
                        color: #ffffff;
                        -webkit-text-fill-color: #ffffff;
                        font-size: clamp(2.25rem, 5.2vw, 4.7rem);
                        line-height: 0.95;
                        letter-spacing: -0.035em;
                        text-transform: uppercase;
                        white-space: nowrap;
                    }

                    .bhmffCountdownGrid {
                        display: grid;
                        grid-template-columns: repeat(4, minmax(120px, 170px));
                        justify-content: center;
                        gap: 0.8rem;
                    }

                    .bhmffCountdownCard {
                        min-height: 122px;
                        display: grid;
                        place-items: center;
                        padding: 0.8rem;
                        border: 1px solid rgba(132, 204, 22, 0.38);
                        border-radius: 16px;
                        background: rgba(4, 24, 10, 0.72);
                        box-shadow: 0 16px 34px rgba(0, 0, 0, 0.14);
                    }

                    .bhmffCountdownValue {
                        display: block;
                        color: #b8ff7a;
                        font-size: clamp(2.6rem, 5vw, 4rem);
                        line-height: 0.95;
                    }

                    .bhmffCountdownLabel {
                        display: block;
                        margin-top: 0.65rem;
                        font-size: 0.68rem;
                        font-weight: 900;
                        letter-spacing: 0.16em;
                        text-transform: uppercase;
                    }

                    .bhmffCountdownMeta {
                        display: flex;
                        justify-content: center;
                        gap: 0.75rem;
                        flex-wrap: wrap;
                        margin-top: 1.15rem;
                    }

                    .bhmffCountdownPill {
                        padding: 0.62rem 1.25rem;
                        border: 1px solid rgba(132, 204, 22, 0.38);
                        border-radius: 999px;
                        background: rgba(4, 24, 10, 0.46);
                        font-size: 0.78rem;
                        font-weight: 900;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                    }

                    @media (max-width: 700px) {
                        .bhmffCountdown {
                            padding: 1.5rem 0.75rem;
                        }

                        .bhmffCountdownInner {
                            width: 100%;
                        }

                        .bhmffCountdownKicker {
                            font-size: 0.68rem;
                            letter-spacing: 0.14em;
                        }

                        .bhmffCountdownTitle {
                            margin-bottom: 1rem;
                            font-size: clamp(1.8rem, 9vw, 2.65rem);
                            line-height: 1;
                            white-space: normal;
                        }

                        .bhmffCountdownGrid {
                            grid-template-columns: repeat(2, minmax(0, 1fr));
                            gap: 0.65rem;
                        }

                        .bhmffCountdownCard {
                            min-height: 100px;
                            padding: 0.7rem;
                        }

                        .bhmffCountdownValue {
                            font-size: clamp(2.2rem, 12vw, 3rem);
                        }

                        .bhmffCountdownMeta {
                            display: grid;
                            grid-template-columns: 1fr;
                            gap: 0.6rem;
                        }

                        .bhmffCountdownPill {
                            width: 100%;
                            padding: 0.65rem 0.8rem;
                            font-size: 0.7rem;
                        }
                    }
                `}
            </style>

            <div className="bhmffCountdownInner">
                <p className="bhmffCountdownKicker">
                    Black History Month Football Festival 2026
                </p>

                <h2 className="bhmffCountdownTitle">
                    The Festival Begins In
                </h2>

                <div className="bhmffCountdownGrid">
                    {items.map((item) => (
                        <div
                            key={item.label}
                            className="bhmffCountdownCard"
                        >
                            <div>
                                <strong className="bhmffCountdownValue">
                                    {String(
                                        item.value,
                                    ).padStart(
                                        2,
                                        '0',
                                    )}
                                </strong>

                                <span className="bhmffCountdownLabel">
                                    {item.label}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bhmffCountdownMeta">
                    <span className="bhmffCountdownPill">
                        Saturday 3 October 2026
                    </span>

                    <span className="bhmffCountdownPill">
                        Kick-off: 09:00 AM
                    </span>
                </div>
            </div>
        </section>
    )
}