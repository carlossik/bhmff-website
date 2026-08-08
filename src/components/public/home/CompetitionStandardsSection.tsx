import type { LucideIcon } from 'lucide-react'
import {
    Calendar,
    Camera,
    Handshake,
    Scale,
    Shield,
    Trophy,
    UserCheck,
    Users,
} from 'lucide-react'

import { Section } from '../../Section'

type StandardItem = {
    title: string
    description: string
    icon: LucideIcon
}

const bhmffStandards: readonly StandardItem[] = [
    {
        title: 'Competition Format',
        description:
            'The tournament begins with group-stage football, where every team plays every other team in their group once. Group winners and runners-up qualify for the semi-finals, with the winners progressing to the Championship Final.',
        icon: Trophy,
    },
    {
        title: 'Tournament Rules',
        description:
            'Every fixture is played under the Laws of the Game and the published tournament regulations. Player eligibility, substitutions, disciplinary procedures, scheduling and competition decisions are applied consistently.',
        icon: Scale,
    },
    {
        title: 'Match Officials',
        description:
            'Qualified referees and supporting match officials will be appointed to fixtures. Officials will record match reports, disciplinary incidents and key match events through TournamentHQ.',
        icon: UserCheck,
    },
    {
        title: 'Respect & Code of Conduct',
        description:
            'We operate a zero-tolerance policy towards racism, discrimination, referee abuse, violence, intimidation and unsporting behaviour. Players, coaches and supporters must uphold the highest standards of respect.',
        icon: Shield,
    },
    {
        title: 'Player Welfare',
        description:
            'Fixtures are scheduled to provide sensible recovery time, reduce unnecessary congestion and create the safest possible competitive environment for every player.',
        icon: Calendar,
    },
    {
        title: 'Professional Media Coverage',
        description:
            'Match filming, highlights, interviews, reports and digital storytelling will showcase players, clubs, partners and the wider community throughout the tournament.',
        icon: Camera,
    },
    {
        title: 'Community Legacy',
        description:
            'The festival promotes education, Black History Month, community cohesion and opportunities for young people while building lasting relationships with businesses and public organisations.',
        icon: Users,
    },
    {
        title: 'Partnership & Investment',
        description:
            'The tournament offers a credible platform for sponsors and strategic partners to support grassroots football, youth development, inclusion and measurable community impact.',
        icon: Handshake,
    },
]

const genericStandards: readonly StandardItem[] = [
    {
        title: 'Competition Format',
        description:
            'Competition stages, team eligibility and progression are managed through TournamentHQ and published by the organiser.',
        icon: Trophy,
    },
    {
        title: 'Competition Rules',
        description:
            'Fixtures are played under the organiser’s published regulations, player eligibility requirements and applicable governing-body rules.',
        icon: Scale,
    },
    {
        title: 'Match Officials',
        description:
            'Referees and supporting officials can be assigned to fixtures, with availability and match responsibilities managed centrally.',
        icon: UserCheck,
    },
    {
        title: 'Respect & Conduct',
        description:
            'Players, coaches, officials and supporters are expected to uphold high standards of respect, safety and sporting behaviour.',
        icon: Shield,
    },
    {
        title: 'Player Welfare',
        description:
            'Scheduling, venues and recovery periods can be managed to support a safe and well-organised competition experience.',
        icon: Calendar,
    },
    {
        title: 'Media & Updates',
        description:
            'Published news, match coverage, highlights and organiser updates appear on this official competition website.',
        icon: Camera,
    },
    {
        title: 'Community',
        description:
            'The competition provides a platform for teams, participants, families and local communities to connect through sport.',
        icon: Users,
    },
    {
        title: 'Partners',
        description:
            'Sponsors and strategic partners can support the competition and gain visibility through its official public platform.',
        icon: Handshake,
    },
]

export type CompetitionStandardsSectionProps = {
    organisationName: string
    isBhmff: boolean
    surfaceColour: string
    textColour: string
    accentColour: string
}

export function CompetitionStandardsSection({
                                                organisationName,
                                                isBhmff,
                                                surfaceColour,
                                                textColour,
                                                accentColour,
                                            }: CompetitionStandardsSectionProps) {
    const standards = isBhmff ? bhmffStandards : genericStandards

    return (
        <Section
            id="festival"
            title={
                isBhmff
                    ? 'Tournament Standards & Governance'
                    : 'Competition Standards & Governance'
            }
            intro={
                isBhmff
                    ? 'A professionally organised tournament with a clear competitive pathway, qualified match officials, strong safeguarding standards, zero tolerance for discrimination and a platform designed to attract credible partners and long-term investment.'
                    : `Key standards, operating principles and participant expectations for ${organisationName}.`
            }
        >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {standards.map(({ title, description, icon: Icon }) => (
                    <article
                        key={title}
                        className="rounded-2xl border p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                        style={{
                            backgroundColor: surfaceColour,
                            borderColor: `${accentColour}30`,
                            color: textColour,
                        }}
                    >
                        <div
                            className="flex h-11 w-11 items-center justify-center rounded-xl"
                            style={{
                                backgroundColor: `${accentColour}18`,
                                color: accentColour,
                            }}
                        >
                            <Icon
                                aria-hidden="true"
                                className="h-5 w-5"
                                strokeWidth={2.25}
                            />
                        </div>

                        <h3 className="mt-5 text-lg font-black leading-tight">
                            {title}
                        </h3>

                        <p className="mt-3 text-sm leading-6 opacity-75">
                            {description}
                        </p>
                    </article>
                ))}
            </div>
        </Section>
    )
}