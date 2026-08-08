import { PublicSponsors } from '../PublicSponsors'
import { Section } from '../../Section'

export type SponsorsSectionProps = {
    organisationName: string
    isBhmff: boolean
    surfaceColour: string
    textColour: string
    accentColour: string
    accentTextColour: string
}

export function SponsorsSection({
                                    organisationName,
                                    isBhmff,
                                    surfaceColour,
                                    textColour,
                                    accentColour,
                                    accentTextColour,
                                }: SponsorsSectionProps) {
    const title = isBhmff
        ? 'Festival Partners'
        : 'Competition Partners'

    const intro = isBhmff
        ? 'The festival is supported by organisations committed to grassroots football, community development and creating opportunities for young people. Additional partners are welcome.'
        : `Organisations supporting ${organisationName}, its teams and participants.`

    return (
        <Section
            id="sponsors"
            title={title}
            intro={intro}
        >
            <PublicSponsors
                surfaceColour={surfaceColour}
                textColour={textColour}
                accentColour={accentColour}
                accentTextColour={accentTextColour}
            />
        </Section>
    )
}