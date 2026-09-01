import {
    LifeBuoy,
    Mail,
} from 'lucide-react'

import {
    createTournamentHqSupportMailto,
    TOURNAMENTHQ_SUPPORT_EMAIL,
} from '../../config/customerSupport'

type SupportContext =
    | 'admin'
    | 'signup'
    | 'onboarding'

type TournamentHqSupportLinkProps = {
    context?: SupportContext
}

function contextLabel(context: SupportContext): string {
    if (context === 'signup') return 'Signup help'
    if (context === 'onboarding') return 'Setup help'
    return 'Need help?'
}

export function TournamentHqSupportLink({
    context = 'admin',
}: TournamentHqSupportLinkProps) {
    return (
        <aside className="pointer-events-none fixed right-3 top-3 z-[70] max-w-[calc(100vw-1.5rem)] sm:right-5 sm:top-5">
            <a
                href={createTournamentHqSupportMailto(context)}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#071009]/95 px-3 py-2 text-xs font-black text-white no-underline shadow-2xl shadow-black/30 backdrop-blur transition hover:border-[#8cf566]/50 hover:bg-[#0b180e] hover:text-[#8cf566] sm:px-4"
                aria-label={`Email TournamentHQ Support at ${TOURNAMENTHQ_SUPPORT_EMAIL}`}
            >
                <LifeBuoy className="h-4 w-4 text-[#8cf566]" />
                <span>{contextLabel(context)}</span>
                <span className="hidden h-4 w-px bg-white/15 sm:inline-block" />
                <span className="hidden items-center gap-1 text-slate-300 sm:inline-flex">
                    <Mail className="h-3.5 w-3.5" />
                    {TOURNAMENTHQ_SUPPORT_EMAIL}
                </span>
            </a>
        </aside>
    )
}
