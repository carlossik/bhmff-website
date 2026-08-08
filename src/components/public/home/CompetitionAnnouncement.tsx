export type CompetitionAnnouncementProps = {
    competitionName: string
    competitionStartDate?: string | null
    accentColour: string
}

function formatCompetitionStartDate(value: string): string {
    const parsedDate = new Date(value)

    if (Number.isNaN(parsedDate.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(parsedDate)
}

export function CompetitionAnnouncement({
                                            competitionName,
                                            competitionStartDate,
                                            accentColour,
                                        }: CompetitionAnnouncementProps) {
    if (!competitionStartDate) {
        return null
    }

    return (
        <section
            className="border-b py-10 text-center sm:py-12"
            style={{
                background: `linear-gradient(90deg, ${accentColour}18, ${accentColour}30, ${accentColour}18)`,
                borderColor: `${accentColour}35`,
            }}
            aria-labelledby="competition-announcement-title"
        >
            <div className="mx-auto w-[min(1180px,calc(100%-2rem))]">
                <p
                    className="text-xs font-black uppercase tracking-[0.2em]"
                    style={{ color: accentColour }}
                >
                    Upcoming competition
                </p>

                <h2
                    id="competition-announcement-title"
                    className="mt-3 text-3xl font-black uppercase leading-tight tracking-[-0.03em] sm:text-5xl"
                >
                    {competitionName}
                </h2>

                <p className="mt-3 text-sm opacity-75 sm:text-base">
                    Starts {formatCompetitionStartDate(competitionStartDate)}
                </p>
            </div>
        </section>
    )
}