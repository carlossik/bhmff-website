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

function getInitials(teamName: string) {
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

function getPublicVisibility(team: DbTeam) {
    if (
        team.published &&
        team.participation_status === 'confirmed'
    ) {
        return {
            label: 'Visible on public website',
            className:
                'teamVisibilityBadge teamVisibilityPublished',
            description:
                'The team is confirmed and published.',
        }
    }

    if (!team.published) {
        return {
            label: 'Hidden from public website',
            className:
                'teamVisibilityBadge teamVisibilityHidden',
            description:
                'Publish the team to make it eligible for public display.',
        }
    }

    return {
        label: 'Hidden from public website',
        className:
            'teamVisibilityBadge teamVisibilityHidden',
        description:
            `Status is ${formatParticipationStatus(
                team.participation_status
            )}. Only confirmed teams appear publicly.`,
    }
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
            <div className="rounded-2xl border border-dashed border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-12 text-center text-[var(--organisation-text)] [&_h3]:text-xl [&_h3]:font-bold [&_h4]:text-lg [&_h4]:font-bold [&_p]:mt-2 [&_p]:text-sm [&_p]:text-slate-400">
                <h3>No teams added</h3>

                <p>
                    Add the first team for one of
                    your clubs.
                </p>
            </div>
        )
    }

    return (
        <div>
            <div className="rounded-2xl border border-[var(--organisation-accent)] bg-[var(--organisation-surface)] p-4 text-sm text-[var(--organisation-text)] [&_strong]:text-[var(--organisation-accent)] [&_p]:mt-1 [&_p]:text-slate-300">
                <strong>
                    Public website visibility rules
                </strong>

                <p>
                    A team appears publicly only
                    when its participation status is
                    <strong> Confirmed</strong> and
                    it is
                    <strong> Published</strong>.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {teams.map((team) => {
                    const visibility =
                        getPublicVisibility(team)

                    return (
                        <article
                            className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5 text-[var(--organisation-text)] shadow-sm"
                            key={team.id}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 items-center gap-4">
                                    {team.logo_url ? (
                                        <img
                                            className="h-14 w-14 rounded-xl border border-[var(--organisation-border)] object-contain"
                                            src={
                                                team.logo_url
                                            }
                                            alt={`${team.name} logo`}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--organisation-accent)] font-bold text-[var(--organisation-on-accent)]">
                                            {getInitials(
                                                team.name
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <h4>
                                            {team.name}
                                        </h4>

                                        <p className="text-slate-400">
                                            {getClubName(
                                                team,
                                                clubs
                                            )}
                                        </p>

                                        <div className="mt-2 flex flex-wrap gap-2 [&_span]:rounded-full [&_span]:border [&_span]:border-[var(--organisation-border)] [&_span]:px-2.5 [&_span]:py-1 [&_span]:text-xs [&_span]:font-semibold">
                                            <span
                                                className={`teamParticipationBadge teamParticipation-${team.participation_status}`}
                                            >
                                                {formatParticipationStatus(
                                                    team.participation_status
                                                )}
                                            </span>

                                            <span
                                                className={
                                                    team.published
                                                        ? 'teamVisibilityBadge teamVisibilityPublished'
                                                        : 'teamVisibilityBadge teamVisibilityHidden'
                                                }
                                            >
                                                {team.published
                                                    ? 'Published'
                                                    : 'Unpublished'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[var(--organisation-border)] pt-4 sm:grid-cols-2 [&>div]:flex [&>div]:flex-col [&>div]:gap-1">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Public Visibility
                                    </span>

                                    <span
                                        className={
                                            visibility.className
                                        }
                                    >
                                        {visibility.label}
                                    </span>

                                    <small className="text-slate-400">
                                        {
                                            visibility.description
                                        }
                                    </small>
                                </div>

                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Age Group
                                    </span>

                                    <strong>
                                        {team.age_group ??
                                            'Not provided'}
                                    </strong>
                                </div>

                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Gender
                                    </span>

                                    <span>
                                        {team.gender ??
                                            'Not provided'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Division
                                    </span>

                                    <span>
                                        {team.division ??
                                            'Not provided'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Home Kit
                                    </span>

                                    <span>
                                        {team.home_kit_colour ??
                                            'Not provided'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Away Kit
                                    </span>

                                    <span>
                                        {team.away_kit_colour ??
                                            'Not provided'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Notes
                                    </span>

                                    <span>
                                        {team.notes?.trim() ||
                                            'No notes added'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--organisation-border)] pt-4">
                                <button
                                    className="inline-flex items-center justify-center rounded-lg border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-2 text-sm font-semibold text-[var(--organisation-text)] transition hover:border-[var(--organisation-accent)]"
                                    type="button"
                                    onClick={() =>
                                        onEdit(team)
                                    }
                                >
                                    Edit
                                </button>

                                <button
                                    className="inline-flex items-center justify-center rounded-lg border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-2 text-sm font-semibold text-[var(--organisation-text)] transition hover:border-[var(--organisation-accent)]"
                                    type="button"
                                    onClick={() =>
                                        onTogglePublished(
                                            team
                                        )
                                    }
                                >
                                    {team.published
                                        ? 'Unpublish'
                                        : 'Publish'}
                                </button>

                                <button
                                    className="inline-flex items-center justify-center rounded-lg border border-red-700/60 bg-red-950/20 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/40"
                                    type="button"
                                    onClick={() =>
                                        onDelete(team)
                                    }
                                >
                                    Delete
                                </button>
                            </div>
                        </article>
                    )
                })}
            </div>
        </div>
    )
}