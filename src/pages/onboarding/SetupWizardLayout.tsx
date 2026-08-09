import type {
    CSSProperties,
    ReactNode,
} from 'react'

import type {
    SetupWizardStep,
} from '../../types/setupWizard'
import {
    SetupWizardProgress,
} from './SetupWizardProgress'

type SetupWizardLayoutProps = {
    currentStep: SetupWizardStep
    completedSteps: SetupWizardStep[]
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

export function SetupWizardLayout({
    currentStep,
    completedSteps,
    children,
}: SetupWizardLayoutProps) {
    return (
        <main
            style={wizardTheme}
            className="min-h-screen bg-[var(--organisation-background)] px-4 py-6 text-[var(--organisation-text)] sm:px-6 lg:px-8 lg:py-10"
        >
            <div className="relative mx-auto max-w-6xl">
                <div className="mb-6 flex items-center justify-between">
                    <a
                        href="/admin"
                        className="text-lg font-black tracking-tight text-[var(--organisation-text)] no-underline"
                    >
                        Tournament
                        <span className="text-[var(--organisation-accent)]">
                            HQ
                        </span>
                    </a>

                    <span className="text-xs font-semibold text-[var(--organisation-muted)]">
                        Secure guided setup
                    </span>
                </div>

                <section className="overflow-hidden rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] shadow-2xl shadow-black/20">
                    <div className="border-b border-[color:var(--organisation-border)] px-5 py-5 sm:px-8">
                        <SetupWizardProgress
                            currentStep={currentStep}
                            completedSteps={completedSteps}
                        />
                    </div>

                    <div className="p-5 sm:p-8 lg:p-10">
                        {children}
                    </div>
                </section>

                <p className="mt-5 text-center text-xs text-[var(--organisation-muted)] opacity-70">
                    TournamentHQ · Your setup progress is saved automatically.
                </p>
            </div>
        </main>
    )
}
