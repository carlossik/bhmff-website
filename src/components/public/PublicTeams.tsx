import { Users } from 'lucide-react'

import { PublicEmptyState } from './home/PublicEmptyState'

export type PublicTeam = {
    id: string
    name: string
    manager_name: string | null
    logo_url: string | null
}

export type PublicTeamsProps = {
    teams: PublicTeam[]
    surfaceColour: string
    textColour: string
    accentColour: string
}

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0])
        .join('')
        .slice(0, 3)
        .toUpperCase()
}

export function PublicTeams({
                                teams,
                                surfaceColour,
                                textColour,
                                accentColour,
                            }: PublicTeamsProps) {
    return (
        <div>
            <div className="mb-6">
                <span
                    className="text-xs font-black uppercase tracking-[0.18em]"
                    style={{ color: accentColour }}
                >
                    Participating Clubs
                </span>

                <h3
                    className="mt-2 text-2xl font-black sm:text-3xl"
                    style={{ color: textColour }}
                >
                    Confirmed Teams
                </h3>
            </div>

            {!teams.length ? (
                <PublicEmptyState
                    title="Confirmed teams coming soon"
                    description="Participating clubs will appear here once their registration has been confirmed and published."
                    icon={Users}
                    surfaceColour={surfaceColour}
                    textColour={textColour}
                    accentColour={accentColour}
                />
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {teams.map((team) => (
                        <article
                            key={team.id}
                            className="rounded-2xl border p-5 shadow-sm"
                            style={{
                                backgroundColor: surfaceColour,
                                borderColor: `${accentColour}30`,
                                color: textColour,
                            }}
                        >
                            <div className="flex items-start gap-4">
                                {team.logo_url ? (
                                    <img
                                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                                        src={team.logo_url}
                                        alt={`${team.name} logo`}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div
                                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black"
                                        style={{
                                            backgroundColor: `${accentColour}22`,
                                            color: accentColour,
                                        }}
                                    >
                                        {getInitials(team.name)}
                                    </div>
                                )}

                                <div className="min-w-0">
                                    <span
                                        className="inline-flex rounded-full px-3 py-1 text-xs font-black"
                                        style={{
                                            backgroundColor: `${accentColour}18`,
                                            color: accentColour,
                                        }}
                                    >
                                        Confirmed
                                    </span>

                                    <h3 className="mt-3 text-xl font-black">
                                        {team.name}
                                    </h3>

                                    <p className="mt-2 text-sm opacity-75">
                                        Manager:{' '}
                                        {team.manager_name ??
                                            'To be confirmed'}
                                    </p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    )
}