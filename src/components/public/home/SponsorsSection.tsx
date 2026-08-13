import { PublicSponsors } from '../PublicSponsors'
import { Section } from '../../Section'
import { useOptionalPublicOrganisation } from '../../../context/PublicOrganisationContext'

export type SponsorsSectionProps = {
    organisationName: string
    isBhmff: boolean
    surfaceColour: string
    textColour: string
    accentColour: string
    accentTextColour?: string
}

export function SponsorsSection({
                                    organisationName,
                                    isBhmff,
                                    surfaceColour,
                                    textColour,
                                    accentColour,
                                    accentTextColour = '#ffffff',
                                }: SponsorsSectionProps) {
    const publicOrganisation =
        useOptionalPublicOrganisation()

    const isClub =
        publicOrganisation?.organisation.organisation_type ===
        'club'

    const title = isBhmff
        ? 'Festival Partners'
        : isClub
            ? 'Club Sponsors'
            : 'Competition Partners'

    const intro = isBhmff
        ? 'The festival is supported by organisations committed to grassroots football, community development and creating opportunities for young people. Additional partners are welcome.'
        : isClub
            ? `Businesses and organisations supporting ${organisationName} and its teams, players and community.`
            : `Organisations supporting ${organisationName}, its teams and participants.`

    return (
        <Section
            id="sponsors"
            title={title}
        >
            <p className="lead max-w-2xl">{intro}</p>

            <PublicSponsors
                surfaceColour={surfaceColour}
                textColour={textColour}
                accentColour={accentColour}
                accentTextColour={accentTextColour}
            />
        </Section>
    )
}