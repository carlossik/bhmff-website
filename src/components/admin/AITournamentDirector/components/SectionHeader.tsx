import type { LucideIcon } from 'lucide-react'

import type { SectionAccent } from '../types'

type SectionHeaderProps = {
    eyebrow: string
    title: string
    description?: string
    icon: LucideIcon
    accent?: SectionAccent
}

const accentStyles: Record<
    SectionAccent,
    {
        shell: string
        icon: string
        eyebrow: string
    }
> = {
    theme: {
        shell: 'border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10',
        icon: 'text-[var(--organisation-accent)]',
        eyebrow: 'text-[var(--organisation-accent)]',
    },
    sky: {
        shell: 'border-sky-400/20 bg-sky-400/10',
        icon: 'text-sky-300',
        eyebrow: 'text-sky-300',
    },
    violet: {
        shell: 'border-violet-400/20 bg-violet-400/10',
        icon: 'text-violet-300',
        eyebrow: 'text-violet-300',
    },
    red: {
        shell: 'border-red-400/20 bg-red-400/10',
        icon: 'text-red-300',
        eyebrow: 'text-red-300',
    },
}

export function SectionHeader({
    eyebrow,
    title,
    description,
    icon: Icon,
    accent = 'theme',
}: SectionHeaderProps) {
    const styles = accentStyles[accent]

    return (
        <div className="flex items-start gap-4">
            <div
                className={`rounded-2xl border p-3 ${styles.shell}`}
            >
                <Icon className={`h-5 w-5 ${styles.icon}`} />
            </div>

            <div>
                <p
                    className={`text-xs font-semibold uppercase tracking-[0.2em] ${styles.eyebrow}`}
                >
                    {eyebrow}
                </p>

                <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--organisation-text)]">
                    {title}
                </h2>

                {description ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--organisation-text)]/60">
                        {description}
                    </p>
                ) : null}
            </div>
        </div>
    )
}
