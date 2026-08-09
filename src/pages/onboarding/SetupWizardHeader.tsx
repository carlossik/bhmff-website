import { Sparkles } from 'lucide-react'

type SetupWizardHeaderProps = {
    title: string
    description: string
}

export function SetupWizardHeader({
    title,
    description,
}: SetupWizardHeaderProps) {
    return (
        <header className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--organisation-accent)]">
                <Sparkles className="h-4 w-4" />
                TournamentHQ Setup Assistant
            </div>

            <div>
                <h1
                    className="m-0 font-black tracking-tight text-[var(--organisation-text)]"
                    style={{
                        fontSize:
                            'clamp(1.75rem, 3vw, 2.5rem)',
                        lineHeight: 1.08,
                    }}
                >
                    {title}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--organisation-muted)] sm:text-[15px]">
                    {description}
                </p>
            </div>
        </header>
    )
}
