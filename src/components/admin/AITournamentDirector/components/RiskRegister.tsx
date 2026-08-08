import {
    CheckCircle2,
    CircleAlert,
    ShieldAlert,
} from 'lucide-react'

import type { TournamentDirectorReport } from '../types'
import { SectionHeader } from './SectionHeader'

type RiskRegisterProps = {
    report: TournamentDirectorReport
}

export function RiskRegister({
    report,
}: RiskRegisterProps) {
    return (
        <section className="rounded-[2rem] border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-6 sm:p-7">
            <SectionHeader
                eyebrow="Risk Register"
                title="Operational issues"
                description="Blocking issues prevent safe generation. Advisory warnings remain visible without stopping normal competition operations unnecessarily."
                icon={ShieldAlert}
                accent="red"
            />

            <div className="mt-7 space-y-3">
                {report.warnings.length === 0 ? (
                    <div className="rounded-2xl border border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/[0.08] p-5">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--organisation-accent)]" />
                            <div>
                                <p className="font-semibold text-[var(--organisation-accent)]">
                                    No operational warnings detected
                                </p>
                                <p className="mt-1 text-sm leading-6 text-[color:var(--organisation-text)]/60">
                                    The current configuration has no analysis warnings.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {report.warnings.map((warning) => (
                    <article
                        key={warning.id}
                        className={`rounded-2xl border p-5 ${
                            warning.blocking
                                ? 'border-red-400/20 bg-red-400/[0.06]'
                                : 'border-amber-400/20 bg-amber-400/[0.06]'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            {warning.blocking ? (
                                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                            ) : (
                                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                            )}

                            <div>
                                <p
                                    className={`font-semibold ${
                                        warning.blocking
                                            ? 'text-red-200'
                                            : 'text-amber-200'
                                    }`}
                                >
                                    {warning.title}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-[color:var(--organisation-text)]/65">
                                    {warning.message}
                                </p>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}
