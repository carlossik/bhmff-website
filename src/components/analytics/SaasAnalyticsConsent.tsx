import { useEffect, useState } from 'react'

import {
    getSaasAnalyticsConsent,
    setSaasAnalyticsConsent,
} from '../../lib/saasAnalytics'

function hasBrowserConsentState(): boolean {
    return getSaasAnalyticsConsent() !== null
}

export function SaasAnalyticsConsent() {
    const [isVisible, setIsVisible] =
        useState(false)

    useEffect(() => {
        setIsVisible(
            !hasBrowserConsentState(),
        )
    }, [])

    function handleChoice(
        consent: 'granted' | 'denied',
    ) {
        setSaasAnalyticsConsent(consent)
        setIsVisible(false)
    }

    if (!isVisible) {
        return null
    }

    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] px-4 pb-4 sm:px-6 sm:pb-6"
        >
            <section className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-lime-400/25 bg-[#071006]/95 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
                <div className="min-w-0">
                    <h2 className="m-0 text-base font-black text-white">
                        Help us improve TournamentHQ
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                        We use analytics cookies to understand which setup steps work well, where users get stuck and how to improve the platform.
                    </p>
                </div>

                <div className="mt-4 flex shrink-0 flex-col gap-2 sm:mt-0 sm:flex-row">
                    <button
                        type="button"
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-black text-white transition hover:border-lime-300 hover:text-lime-200"
                        onClick={() =>
                            handleChoice('denied')
                        }
                    >
                        Reject
                    </button>
                    <button
                        type="button"
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-lime-400 px-4 text-sm font-black text-[#071006] transition hover:bg-lime-300"
                        onClick={() =>
                            handleChoice('granted')
                        }
                    >
                        Accept analytics
                    </button>
                </div>
            </section>
        </div>
    )
}
