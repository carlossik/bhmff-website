import type {
    CSSProperties,
    ReactNode,
} from 'react'

import {
    X,
} from 'lucide-react'

import type {
    OrganisationType,
} from '../../components/admin/Organisations/organisationTypes'
import type {
    SetupWizardStep,
} from '../../types/setupWizard'
import {
    SetupWizardProgress,
} from './SetupWizardProgress'

type SetupWizardLayoutProps = {
    currentStep: SetupWizardStep
    completedSteps: SetupWizardStep[]
    organisationType: OrganisationType
    children: ReactNode
}

type WizardTheme = CSSProperties & {
    '--organisation-primary': string
    '--organisation-secondary': string
    '--organisation-accent': string
    '--organisation-background': string
    '--organisation-surface': string
    '--organisation-text': string
    '--organisation-muted': string
    '--organisation-border': string
    '--organisation-on-accent': string
}

const wizardTheme: WizardTheme = {
    '--organisation-primary': '#84cc16',
    '--organisation-secondary': '#13220f',
    '--organisation-accent': '#84cc16',
    '--organisation-background': '#071006',
    '--organisation-surface': '#10190f',
    '--organisation-text': '#ffffff',
    '--organisation-muted': '#94a3b8',
    '--organisation-border': '#315125',
    '--organisation-on-accent': '#071006',
}

function getMarketingWebsiteUrl(): string {
    if (typeof window === 'undefined') {
        return 'https://tournamenthq.co.uk'
    }

    const hostname =
        window.location.hostname.toLowerCase()

    if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1'
    ) {
        return 'http://localhost:5173'
    }

    return 'https://tournamenthq.co.uk'
}

export function SetupWizardLayout({
    currentStep,
    completedSteps,
    organisationType,
    children,
}: SetupWizardLayoutProps) {
    const marketingWebsiteUrl =
        getMarketingWebsiteUrl()

    return (
        <main
            style={wizardTheme}
            className="min-h-screen bg-[var(--organisation-background)] px-4 py-4 text-[var(--organisation-text)] sm:px-5 lg:px-6 lg:py-5"
        >
            <div className="relative mx-auto max-w-5xl">
                <div className="mb-3 flex items-center justify-between gap-4">
                    <a
                        href={marketingWebsiteUrl}
                        className="!text-base font-black tracking-tight text-[var(--organisation-text)] no-underline"
                    >
                        Tournament
                        <span className="text-[var(--organisation-accent)]">
                            HQ
                        </span>
                    </a>

                    <span className="hidden !text-[11px] font-semibold text-[var(--organisation-muted)] sm:inline">
                        {organisationType ===
                        'club'
                            ? 'Secure club setup'
                            : 'Secure guided setup'}
                    </span>
                </div>

                <section className="overflow-hidden rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] shadow-xl shadow-black/20">
                    <div className="flex items-center gap-4 border-b border-[color:var(--organisation-border)] px-4 py-3 sm:px-5">
                        <div className="min-w-0 flex-1">
                            <SetupWizardProgress
                                currentStep={currentStep}
                                completedSteps={completedSteps}
                                organisationType={organisationType}
                            />
                        </div>

                        <a
                            href={marketingWebsiteUrl}
                            className="hidden min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-black/10 px-3 !text-xs font-black text-white no-underline transition hover:border-[var(--organisation-accent)] hover:text-[var(--organisation-accent)] lg:inline-flex"
                        >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                        </a>
                    </div>

                    <div className="p-4 sm:p-5 lg:p-6">
                        {children}
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-[color:var(--organisation-border)] bg-black/10 px-4 py-2.5 sm:px-5">
                        <p className="m-0 !text-[11px] text-[var(--organisation-muted)] opacity-75">
                            Progress is saved automatically.
                        </p>

                        <a
                            href={marketingWebsiteUrl}
                            className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 !text-xs font-black text-white no-underline transition hover:border-[var(--organisation-accent)] hover:text-[var(--organisation-accent)]"
                        >
                            <X className="h-3.5 w-3.5" />
                            Cancel setup
                        </a>
                    </div>
                </section>
            </div>
        </main>
    )
}
