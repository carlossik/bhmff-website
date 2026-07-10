export type PublicFixture = {
  id: string
  stage: string
  kickoffTime: string | null
  status: string
  homeTeam: string
  awayTeam: string
  venueName: string
  venueAddress: string
  venuePostcode: string
  venueNotes: string
}

type FixtureListProps = {
  fixtures: PublicFixture[]
}

function formatKickoff(kickoffTime: string | null) {
  if (!kickoffTime) {
    return {
      date: 'Date to be confirmed',
      time: 'Time to be confirmed',
    }
  }

  const kickoff = new Date(kickoffTime)

  return {
    date: new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(kickoff),

    time: new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(kickoff),
  }
}

function formatStatus(status: string) {
  return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (character: string) =>
          character.toUpperCase()
      )
}

function extractUrl(value: string) {
  const match = value.match(/https?:\/\/[^\s]+/)
  return match?.[0] ?? null
}

function removeUrl(value: string) {
  return value
      .replace(/https?:\/\/[^\s]+/, '')
      .trim()
}

export function FixtureList({ fixtures }: FixtureListProps) {
  if (!fixtures.length) {
    return (
        <div className="teamsEmptyState">
          <h3>Fixtures coming soon</h3>
          <p>
            Confirmed festival fixtures will appear here once they are
            published by the organisers.
          </p>
        </div>
    )
  }

  return (
      <div className="fixtureGrid">
        {fixtures.map((fixture) => {
          const kickoff = formatKickoff(fixture.kickoffTime)
          const mapUrl = extractUrl(fixture.venueNotes)
          const venueNotes = removeUrl(fixture.venueNotes)

          return (
              <article className="fixtureCard" key={fixture.id}>
                <div className="fixtureMain">
                            <span className="badge">
                                {fixture.stage}
                            </span>

                  <h3>
                    {fixture.homeTeam} vs {fixture.awayTeam}
                  </h3>

                  <p className="fixtureKickoff">
                    {kickoff.date}
                    <span>Kick-off: {kickoff.time}</span>
                  </p>

                  <div className="fixtureVenue">
                    <strong>{fixture.venueName}</strong>

                    {fixture.venueAddress && (
                        <span>{fixture.venueAddress}</span>
                    )}

                    {fixture.venuePostcode && (
                        <span>{fixture.venuePostcode}</span>
                    )}

                    {venueNotes && (
                        <small>{venueNotes}</small>
                    )}

                    {mapUrl && (
                        <a
                            className="fixtureMapLink"
                            href={mapUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                          View on Google Maps
                        </a>
                    )}
                  </div>
                </div>

                <div className="scoreBox">
                  <strong>VS</strong>
                  <span>
                                {formatStatus(fixture.status)}
                            </span>
                </div>
              </article>
          )
        })}
      </div>
  )
}