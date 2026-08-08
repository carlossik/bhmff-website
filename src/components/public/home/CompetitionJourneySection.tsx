import { FixtureList, type PublicFixture } from '../../FixtureList'
import { Section } from '../../Section'

type JourneyStep = {
    stage: string
    title: string
    description: string
}

const bhmffJourney: readonly JourneyStep[] = [
    {
        stage: 'Group Stage',
        title: 'Opening Fixtures',
        description:
            'Teams begin their group-stage campaigns, with each side playing every other team in its group once.',
    },
    {
        stage: 'Group Stage',
        title: 'Qualification Decided',
        description:
            'The remaining group fixtures determine the group winners and runners-up who progress to the semi-finals.',
    },
    {
        stage: 'Semi Finals',
        title: 'Final Places at Stake',
        description:
            'The four qualifying teams compete in two semi-finals, with both winners progressing to the Championship Final.',
    },
    {
        stage: 'Finals',
        title: 'Final & Third-Place Match',
        description:
            'The semi-final winners compete for the Black History Month Football Festival title, while the remaining teams contest the third-place match before presentations and awards.',
    },
]

const genericJourney: readonly JourneyStep[] = [
    {
        stage: 'Setup',
        title: 'Competition Preparation',
        description:
            'The organiser confirms participating teams, venues, regulations and the competition schedule.',
    },
    {
        stage: 'Fixtures',
        title: 'Competition Begins',
        description:
            'Published fixtures, kick-off times and venues become available to teams and supporters.',
    },
    {
        stage: 'Results',
        title: 'Competition Progress',
        description:
            'Confirmed results, tables and statistics update as matches are completed and published.',
    },
    {
        stage: 'Completion',
        title: 'Awards & Recognition',
        description:
            'The competition concludes with final standings, awards and official organiser updates.',
    },
]

export type CompetitionJourneySectionProps = {
    isBhmff: boolean
    competitionName: string
    fixtures: PublicFixture[]
    loading: boolean
    surfaceColour: string
    textColour: string
    accentColour: string
}

export function CompetitionJourneySection({
                                              isBhmff,
                                              competitionName,
                                              fixtures,
                                              loading,
                                              surfaceColour,
                                              textColour,
                                              accentColour,
                                          }: CompetitionJourneySectionProps) {
    const journey = isBhmff ? bhmffJourney : genericJourney

    return (
        <Section
            id="fixtures"
            title={isBhmff ? 'Tournament Pathway' : 'Competition Journey'}
            intro={
                isBhmff
                    ? 'The competition progresses from a single round-robin group stage to the semi-finals, followed by the final and third-place match, with fixtures scheduled to give every game proper focus.'
                    : `Follow the setup, fixtures, results and completion of ${competitionName}.`
            }
        >
            <div className="grid gap-5 lg:grid-cols-2">
                {journey.map(({ stage, title, description }, index) => (
                    <article
                        key={`${stage}-${title}`}
                        className="relative overflow-hidden rounded-2xl border p-6 shadow-sm"
                        style={{
                            backgroundColor: surfaceColour,
                            borderColor: `${accentColour}30`,
                            color: textColour,
                        }}
                    >
                        <div className="flex items-start gap-4">
                            <div
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black"
                                style={{
                                    backgroundColor: `${accentColour}18`,
                                    color: accentColour,
                                }}
                                aria-hidden="true"
                            >
                                {String(index + 1).padStart(2, '0')}
                            </div>

                            <div>
                                <p
                                    className="text-xs font-black uppercase tracking-[0.18em]"
                                    style={{ color: accentColour }}
                                >
                                    {stage}
                                </p>

                                <h3 className="mt-2 text-xl font-black leading-tight">
                                    {title}
                                </h3>

                                <p className="mt-3 text-sm leading-6 opacity-75">
                                    {description}
                                </p>
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            <div className="mt-10">
                <h3 className="text-xl font-black sm:text-2xl">
                    Confirmed Fixtures
                </h3>

                <div className="mt-5">
                    {loading ? (
                        <p className="text-sm opacity-70">
                            Loading fixtures...
                        </p>
                    ) : (
                        <FixtureList
                            fixtures={fixtures}
                            surfaceColour={surfaceColour}
                            textColour={textColour}
                            accentColour={accentColour}
                        />
                    )}
                </div>
            </div>
        </Section>
    )
}