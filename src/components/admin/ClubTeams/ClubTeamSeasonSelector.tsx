import {
    CreditCard,
    UsersRound,
} from 'lucide-react'

import type {
    ClubTeamSeason,
} from './clubTeamSeasonTypes'

type ClubTeamSeasonSelectorProps = {
    teamSeasons: ClubTeamSeason[]
    value: string
    onChange: (teamId: string) => void
    disabled?: boolean
}

function paymentLabel(
    teamSeason: ClubTeamSeason,
): string {
    switch (teamSeason.payment_model) {
        case 'matchday':
            return 'Matchday subs'
        case 'monthly':
            return 'Monthly fees'
        case 'hybrid':
            return 'Monthly + matchday'
        default:
            return 'No recurring payment'
    }
}

export function ClubTeamSeasonSelector({
    teamSeasons,
    value,
    onChange,
    disabled = false,
}: ClubTeamSeasonSelectorProps) {
    const selected =
        teamSeasons.find(
            item => item.team_id === value,
        ) ?? null

    return (
        <div className="rounded-2xl border border-white/10 bg-[#0b1510] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <label className="block min-w-0 flex-1 text-sm font-semibold text-slate-300">
                    Team
                    <span className="mt-1 flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#071009] px-3">
                        <UsersRound className="h-4 w-4 shrink-0 text-[#8cf566]" />
                        <select
                            value={value}
                            disabled={
                                disabled ||
                                teamSeasons.length === 0
                            }
                            onChange={event =>
                                onChange(
                                    event.target.value,
                                )
                            }
                            className="min-h-10 w-full bg-transparent text-white outline-none disabled:opacity-50"
                        >
                            <option value="">
                                {teamSeasons.length === 0
                                    ? 'No teams configured for this season'
                                    : 'Select team'}
                            </option>

                            {teamSeasons.map(
                                teamSeason => (
                                    <option
                                        key={
                                            teamSeason.id
                                        }
                                        value={
                                            teamSeason.team_id
                                        }
                                    >
                                        {
                                            teamSeason
                                                .team
                                                .name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </span>
                </label>

                {selected && (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                        {selected.team.age_group && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
                                {
                                    selected.team
                                        .age_group
                                }
                            </span>
                        )}

                        {selected.team.division && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
                                {
                                    selected.team
                                        .division
                                }
                            </span>
                        )}

                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8cf566]/20 bg-[#8cf566]/10 px-3 py-1.5 text-[#8cf566]">
                            <CreditCard className="h-3.5 w-3.5" />
                            {paymentLabel(selected)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
