import { Check } from 'lucide-react'
import { SETUP_WIZARD_STEP_DEFINITIONS, type SetupWizardStep } from '../../types/setupWizard'

type SetupWizardProgressProps = { currentStep: SetupWizardStep; completedSteps: SetupWizardStep[] }

export function SetupWizardProgress({ currentStep, completedSteps }: SetupWizardProgressProps) {
    const currentIndex = SETUP_WIZARD_STEP_DEFINITIONS.findIndex(step => step.id === currentStep)
    return (
        <nav aria-label="Setup progress" className="w-full">
            <ol className="grid grid-cols-5 gap-2">
                {SETUP_WIZARD_STEP_DEFINITIONS.map((step, index) => {
                    const complete = completedSteps.includes(step.id)
                    const current = step.id === currentStep
                    return (
                        <li key={step.id} className="min-w-0">
                            <div className={['h-1.5 rounded-full transition', complete || current ? 'bg-[var(--organisation-accent,#84cc16)]' : 'bg-white/10'].join(' ')} />
                            <div className="mt-3 hidden items-center gap-2 lg:flex">
                                <span className={['grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-black', complete ? 'border-[var(--organisation-accent,#84cc16)] bg-[var(--organisation-accent,#84cc16)] text-[var(--organisation-on-accent,#071006)]' : current ? 'border-[var(--organisation-accent,#84cc16)] text-[var(--organisation-accent,#84cc16)]' : 'border-white/15 text-slate-500'].join(' ')}>{complete ? <Check className="h-4 w-4" /> : index + 1}</span>
                                <span className={['truncate text-xs font-bold', current ? 'text-white' : complete ? 'text-slate-300' : 'text-slate-500'].join(' ')}>{step.shortTitle}</span>
                            </div>
                        </li>
                    )
                })}
            </ol>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:hidden">Step {Math.max(currentIndex + 1, 1)} of {SETUP_WIZARD_STEP_DEFINITIONS.length}</p>
        </nav>
    )
}
