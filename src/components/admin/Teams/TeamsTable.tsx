import {
    Eye,
    EyeOff,
    Globe2,
    Pencil,
    ShieldCheck,
    Trash2,
    Users,
} from 'lucide-react'
import type {
    ClubOption,
    DbTeam,
    TeamParticipationStatus,
} from './teamTypes'

type TeamsTableProps = {
    teams: DbTeam[]
    clubs: ClubOption[]
    onEdit: (team: DbTeam) => void
    onDelete: (team: DbTeam) => void
    onTogglePublished: (team: DbTeam) => void
}

function getInitials(
    teamName: string
) {
    return teamName
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0])
        .join('')
        .slice(0, 3)
        .toUpperCase()
}

function formatParticipationStatus(
    status: TeamParticipationStatus
) {
    return (
        status.charAt(0).toUpperCase() +
        status.slice(1)
    )
}

function getClubName(
    team: DbTeam,
    clubs: ClubOption[]
) {
    return (
        clubs.find(
            (club) =>
                club.id === team.club_id
        )?.name ?? 'No club assigned'
    )
}

function getParticipationBadgeClassName(
    status: TeamParticipationStatus
) {
    switch (status) {
        case 'confirmed':
            return 'border-lime-700/60 bg-lime-400/10 text-lime-300'
        case 'invited':
            return 'border-sky-700/60 bg-sky-400/10 text-sky-300'
        case 'withdrawn':
            return 'border-red-800/60 bg-red-500/10 text-red-300'
        case 'interested':
        default:
            return 'border-amber-700/60 bg-amber-400/10 text-amber-300'
    }
}

function getPublicVisibility(
    team: DbTeam
) {
    if (
        team.published &&
        team.participation_status ===
        'confirmed'
    ) {
        return {
            label: 'Visible publicly',
            badgeClassName:
                'border-lime-700/60 bg-lime-400/10 text-lime-300',
            description:
                'Confirmed and published.',
            icon: Eye,
        }
    }

    if (!team.published) {
        return {
            label: 'Hidden publicly',
            badgeClassName:
                'border-slate-700 bg-slate-500/10 text-slate-300',
            description:
                'Publish this team to make it eligible for public display.',
            icon: EyeOff,
        }
    }

    return {
        label: 'Hidden publicly',
        badgeClassName:
            'border-amber-700/60 bg-amber-400/10 text-amber-300',
        description:
            `Status is ${formatParticipationStatus(
                team.participation_status
            )}. Only confirmed teams appear publicly.`,
        icon: EyeOff,
    }
}

type DetailItemProps = {
    label: string
    value: string
}

function DetailItem({
                        label,
                        value,
                    }: DetailItemProps) {
    return (
        <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-medium leading-6 text-slate-200">
                {value}
            </p>
        </div>
    )
}

export function TeamsTable({
                               teams,
                               clubs,
                               onEdit,
                               onDelete,
                               onTogglePublished,
                           }: TeamsTableProps) {
    if (!teams.length) {
        return (
            <section className="rounded-3xl border border-dashed border-lime-800/60 bg-[#10190e] px-6 py-14 text-center font-sans">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/10">
                    <Users className="h-7 w-7 text-lime-400" />
                </div>

                <h3 className="mt-5 text-xl font-bold text-white">
                    No teams added
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                    Add the first team for one of
                    your clubs. Its primary home
                    venue will be linked during
                    creation.
                </p>
            </section>
        )
    }

    return (
        <div className="space-y-5 font-sans">
            <section className="flex items-start gap-3 rounded-2xl border border-sky-800/40 bg-sky-500/10 px-5 py-4">
                <div className="mt-0.5 rounded-xl bg-sky-400/10 p-2">
                    <Globe2 className="h-5 w-5 text-sky-300" />
                </div>

                <div>
                    <h3 className="text-sm font-bold text-sky-100">
                        Public website visibility
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-sky-100/70">
                        A team appears publicly only
                        when its participation status
                        is{' '}
                        <strong className="font-bold text-sky-100">
                            Confirmed
                        </strong>{' '}
                        and it is{' '}
                        <strong className="font-bold text-sky-100">
                            Published
                        </strong>
                        .
                    </p>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {teams.map((team) => {
                    const visibility =
                        getPublicVisibility(team)

                    const VisibilityIcon =
                        visibility.icon

                    return (
                        <article
                            className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-lime-900/50 bg-[#10190e] shadow-lg shadow-black/10 transition hover:border-lime-700/60"
                            key={team.id}
                        >
                            <header className="flex items-start gap-4 border-b border-lime-900/40 p-5 sm:p-6">
                                {team.logo_url ? (
                                    <img
                                        className="h-16 w-16 shrink-0 rounded-2xl border border-lime-900/50 bg-black/20 object-cover"
                                        src={team.logo_url}
                                        alt={`${team.name} logo`}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-lime-800/50 bg-lime-400/10 text-lg font-black tracking-wide text-lime-300">
                                        {getInitials(
                                            team.name
                                        )}
                                    </div>
                                )}

                                <div className="min-w-0 flex-1">
                                    <h4 className="truncate text-lg font-bold tracking-tight text-white">
                                        {team.name}
                                    </h4>

                                    <p className="mt-1 truncate text-sm font-medium text-slate-400">
                                        {getClubName(
                                            team,
                                            clubs
                                        )}
                                    </p>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span
                                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${getParticipationBadgeClassName(
                                                team.participation_status
                                            )}`}
                                        >
                                            {formatParticipationStatus(
                                                team.participation_status
                                            )}
                                        </span>

                                        <span
                                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${
                                                team.published
                                                    ? 'border-lime-700/60 bg-lime-400/10 text-lime-300'
                                                    : 'border-slate-700 bg-slate-500/10 text-slate-300'
                                            }`}
                                        >
                                            {team.published
                                                ? 'Published'
                                                : 'Unpublished'}
                                        </span>
                                    </div>
                                </div>
                            </header>

                            <div className="flex-1 p-5 sm:p-6">
                                <div className="rounded-2xl border border-lime-900/40 bg-black/20 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-xl bg-lime-400/10 p-2">
                                            <VisibilityIcon className="h-4 w-4 text-lime-300" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                                Public visibility
                                            </p>

                                            <span
                                                className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${visibility.badgeClassName}`}
                                            >
                                                {
                                                    visibility.label
                                                }
                                            </span>

                                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                                {
                                                    visibility.description
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5">
                                    <DetailItem
                                        label="Age group"
                                        value={
                                            team.age_group ??
                                            'Not provided'
                                        }
                                    />

                                    <DetailItem
                                        label="Gender"
                                        value={
                                            team.gender ??
                                            'Not provided'
                                        }
                                    />

                                    <DetailItem
                                        label="Division"
                                        value={
                                            team.division ??
                                            'Not provided'
                                        }
                                    />

                                    <DetailItem
                                        label="Year group"
                                        value={
                                            team.year_group?.toString() ??
                                            'Not provided'
                                        }
                                    />

                                    <DetailItem
                                        label="Home kit"
                                        value={
                                            team.home_kit_colour ??
                                            'Not provided'
                                        }
                                    />

                                    <DetailItem
                                        label="Away kit"
                                        value={
                                            team.away_kit_colour ??
                                            'Not provided'
                                        }
                                    />
                                </div>

                                <div className="mt-5 border-t border-lime-900/40 pt-5">
                                    <DetailItem
                                        label="Notes"
                                        value={
                                            team.notes?.trim() ||
                                            'No notes added'
                                        }
                                    />
                                </div>
                            </div>

                            <footer className="grid grid-cols-1 gap-2 border-t border-lime-900/40 bg-black/10 p-4 sm:grid-cols-3">
                                <button
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-800/60 bg-lime-400/5 px-4 py-2.5 text-sm font-bold text-lime-100 transition hover:border-lime-500/70 hover:bg-lime-400/10"
                                    type="button"
                                    onClick={() =>
                                        onEdit(team)
                                    }
                                >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                </button>

                                <button
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-800/60 bg-sky-400/5 px-4 py-2.5 text-sm font-bold text-sky-100 transition hover:border-sky-500/70 hover:bg-sky-400/10"
                                    type="button"
                                    onClick={() =>
                                        onTogglePublished(
                                            team
                                        )
                                    }
                                >
                                    {team.published ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <ShieldCheck className="h-4 w-4" />
                                    )}

                                    {team.published
                                        ? 'Unpublish'
                                        : 'Publish'}
                                </button>

                                <button
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-900/60 bg-red-500/5 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:border-red-600/70 hover:bg-red-500/10"
                                    type="button"
                                    onClick={() =>
                                        onDelete(team)
                                    }
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </button>
                            </footer>
                        </article>
                    )
                })}
            </div>
        </div>
    )
}