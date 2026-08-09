import { ArrowRight, Bot, Globe2, ShieldCheck, Sparkles, Trophy } from 'lucide-react'
import { SetupWizardHeader } from '../../pages/onboarding/SetupWizardHeader'

type WelcomeStepProps = { onContinue: () => void }
const benefits = [
    { icon: Trophy, title: 'Create your competition', description: 'Set up the first league, cup, tournament or festival you want to run.' },
    { icon: Globe2, title: 'Launch your public site', description: 'Your organisation gets a branded public experience using the same data you manage.' },
    { icon: Bot, title: 'Let AI do the heavy lifting', description: 'Once your competition is ready, TournamentHQ can help generate and optimise fixtures.' },
] as const

export function WelcomeStep({ onContinue }: WelcomeStepProps) {
    return (
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
                <SetupWizardHeader title="Let's build your TournamentHQ workspace" description="We'll guide you through the essentials, save your progress automatically and get your first competition ready without unnecessary setup." />
                <div className="mt-8 flex flex-wrap gap-3">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-3 py-2 text-xs font-bold text-[var(--organisation-muted)]"><ShieldCheck className="h-4 w-4 text-[var(--organisation-accent,#84cc16)]" />Organisation-aware</div>
                    <div className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-3 py-2 text-xs font-bold text-[var(--organisation-muted)]"><Sparkles className="h-4 w-4 text-[var(--organisation-accent,#84cc16)]" />About 5 minutes</div>
                </div>
                <button type="button" onClick={onContinue} className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent,#84cc16)] px-6 py-3 text-sm font-black text-[var(--organisation-on-accent,#071006)] transition hover:opacity-90">Start setup<ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4">
                {benefits.map(({ icon: Icon, title, description }) => (
                    <article key={title} className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-5">
                        <div className="flex items-start gap-4">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--organisation-accent,#84cc16)]/10 text-[var(--organisation-accent,#84cc16)]"><Icon className="h-5 w-5" /></div>
                            <div><h2 className="m-0 text-base font-black text-[var(--organisation-text)]">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--organisation-muted)]">{description}</p></div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    )
}
