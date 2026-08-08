import type { LucideIcon } from 'lucide-react'

import type { DirectorAccent } from '../types'

type DirectorMetricProps = {
    label: string
    value: string | number
    icon: LucideIcon
    helper?: string
    accent?: DirectorAccent
}

const accentStyles: Record<
    DirectorAccent,
    {
        glow: string
        shell: string
        icon: string
    }
> = {
    theme: {
        glow: 'from-[color:var(--organisation-accent)]/20 via-[color:var(--organisation-accent)]/5 to-transparent',
        shell: 'border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10',
        icon: 'text-[var(--organisation-accent)]',
    },
    sky: {
        glow: 'from-sky-400/20 via-sky-400/5 to-transparent',
        shell: 'border-sky-400/20 bg-sky-400/10',
        icon: 'text-sky-300',
    },
    violet: {
        glow: 'from-violet-400/20 via-violet-400/5 to-transparent',
        shell: 'border-violet-400/20 bg-violet-400/10',
        icon: 'text-violet-300',
    },
    amber: {
        glow: 'from-amber-400/20 via-amber-400/5 to-transparent',
        shell: 'border-amber-400/20 bg-amber-400/10',
        icon: 'text-amber-300',
    },
}

export function DirectorMetric({
    label,
    value,
    icon: Icon,
    helper,
    accent = 'theme',
}: DirectorMetricProps) {
    const styles = accentStyles[accent]

    return (
        <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.95)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.065]">
            <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${styles.glow}`}
            />

            <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--organisation-text)]/45">
                        {label}
                    </p>

                    <p className="mt-3 break-words text-2xl font-bold tracking-tight text-[var(--organisation-text)]">
                        {value}
                    </p>

                    {helper ? (
                        <p className="mt-2 text-sm leading-6 text-[color:var(--organisation-text)]/60">
                            {helper}
                        </p>
                    ) : null}
                </div>

                <div
                    className={`shrink-0 rounded-2xl border p-3 ${styles.shell}`}
                >
                    <Icon className={`h-5 w-5 ${styles.icon}`} />
                </div>
            </div>
        </article>
    )
}
