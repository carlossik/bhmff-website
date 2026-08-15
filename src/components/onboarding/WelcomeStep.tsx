import {
    ArrowRight,
    Bot,
    CalendarDays,
    Clock3,
    Globe2,
    ShieldCheck,
    Trophy,
    UsersRound,
    X,
} from 'lucide-react'
import type {
    LucideIcon,
} from 'lucide-react'

import type {
    OrganisationType,
} from '../admin/Organisations/organisationTypes'

type WelcomeStepProps = {
    organisationType: OrganisationType
    onContinue: () => void
}

type JourneyCard = {
    icon: LucideIcon
    title: string
    description: string
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

export function WelcomeStep({
    organisationType,
    onContinue,
}: WelcomeStepProps) {
    const isClub =
        organisationType === 'club'

    const marketingWebsiteUrl =
        getMarketingWebsiteUrl()

    const cards: JourneyCard[] = isClub
        ? [
              {
                  icon: UsersRound,
                  title: 'Manage your club & teams',
                  description:
                      'Create one club workspace for teams, squads, administrators and day-to-day operations.',
              },
              {
                  icon: CalendarDays,
                  title: 'Organise fixtures & results',
                  description:
                      'Manage seasons, fixtures, results and the information your club needs in one place.',
              },
              {
                  icon: Globe2,
                  title: 'Launch your club website',
                  description:
                      'Publish a branded public club experience using the same data you manage in TournamentHQ.',
              },
          ]
        : [
              {
                  icon: Trophy,
                  title: 'Create your competition',
                  description:
                      'Set up the first league, cup, tournament or festival you want to run.',
              },
              {
                  icon: Globe2,
                  title: 'Launch your public site',
                  description:
                      'Publish a branded public experience using the same data you manage.',
              },
              {
                  icon: Bot,
                  title: 'Use intelligent scheduling',
                  description:
                      'Use the AI Tournament Director to analyse readiness and help build intelligent schedules.',
              },
          ]

    return (
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <section className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-lime-800/70 bg-lime-400/5 px-3 py-1.5 !text-[10px] font-black uppercase tracking-[0.16em] text-lime-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    TournamentHQ Setup Assistant
                </span>

                <h1 className="mt-5 max-w-[34rem] break-normal !text-[30px] font-black uppercase !leading-[1.04] tracking-[-0.025em] text-white sm:!text-[34px] lg:!text-[36px]">
                    {isClub
                        ? 'Build your club workspace'
                        : "Let's build your TournamentHQ workspace"}
                </h1>

                <p className="mt-4 max-w-[34rem] !text-sm !leading-6 text-slate-400">
                    {isClub
                        ? 'We’ll guide you through the essentials, set up your club identity and subscription, then prepare the workspace you will use to manage your teams and club operations.'
                        : 'We’ll guide you through the essentials, save your progress automatically and get your first competition ready without unnecessary setup.'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-lime-900/60 bg-black/10 px-3 py-1.5 !text-xs font-bold text-slate-400">
                        <ShieldCheck className="h-3.5 w-3.5 text-lime-400" />
                        {isClub
                            ? 'Club-aware'
                            : 'Organisation-aware'}
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-lg border border-lime-900/60 bg-black/10 px-3 py-1.5 !text-xs font-bold text-slate-400">
                        <Clock3 className="h-3.5 w-3.5 text-lime-400" />
                        About 5 minutes
                    </span>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <a
                        href={marketingWebsiteUrl}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/10 px-5 !text-sm font-black text-white no-underline transition hover:border-lime-400/60 hover:text-lime-300"
                    >
                        <X className="h-4 w-4" />
                        Cancel setup
                    </a>

                    <button
                        type="button"
                        onClick={onContinue}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 !text-sm font-black text-[#071006] transition hover:bg-lime-300"
                    >
                        Start setup
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </section>

            <section className="grid gap-3">
                {cards.map((card) => {
                    const Icon = card.icon

                    return (
                        <article
                            key={card.title}
                            className="rounded-2xl border border-lime-900/60 bg-[#071006] p-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lime-400/10 text-lime-400">
                                    <Icon className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                    <h2 className="!m-0 !text-[18px] font-black !leading-6 text-lime-200 sm:!text-[20px]">
                                        {card.title}
                                    </h2>

                                    <p className="mt-1.5 !text-[13px] !leading-5 text-slate-400">
                                        {card.description}
                                    </p>
                                </div>
                            </div>
                        </article>
                    )
                })}
            </section>
        </div>
    )
}
