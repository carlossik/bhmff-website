import {
    useEffect,
    useState,
} from 'react'
import { supabase } from '../../lib/supabaseClient'

type PublicSponsor = {
    id: string
    name: string
    tier: string | null
    logo_url: string | null
    website_url: string | null
    description: string | null
}

export function PublicSponsors() {
    const [sponsors, setSponsors] =
        useState<PublicSponsor[]>([])

    const [isLoading, setIsLoading] =
        useState(true)

    useEffect(() => {
        async function loadSponsors() {
            try {
                const {
                    data: festival,
                    error: festivalError,
                } = await supabase
                    .from('festivals')
                    .select('id')
                    .eq('status', 'active')
                    .order('year', {
                        ascending: false,
                    })
                    .limit(1)
                    .maybeSingle()

                if (festivalError) {
                    throw festivalError
                }

                if (!festival) {
                    setSponsors([])
                    return
                }

                const { data, error } =
                    await supabase
                        .from('sponsors')
                        .select(`
                            id,
                            name,
                            tier,
                            logo_url,
                            website_url,
                            description
                        `)
                        .eq(
                            'festival_id',
                            festival.id
                        )
                        .eq('active', true)
                        .order('created_at', {
                            ascending: true,
                        })

                if (error) {
                    throw error
                }

                setSponsors(data ?? [])
            } catch (error) {
                console.error(
                    'Failed to load public sponsors:',
                    error
                )

                setSponsors([])
            } finally {
                setIsLoading(false)
            }
        }

        loadSponsors()
    }, [])

    if (isLoading) {
        return (
            <p className="muted">
                Loading festival partners...
            </p>
        )
    }

    return (
        <div className="cardGrid three">
            {sponsors.map((sponsor) => (
                <article
                    className="card sponsorCard publicSponsorCard"
                    key={sponsor.id}
                >
                    {sponsor.logo_url && (
                        <div className="publicSponsorLogo">
                            <img
                                src={
                                    sponsor.logo_url
                                }
                                alt={`${sponsor.name} logo`}
                                loading="lazy"
                            />
                        </div>
                    )}

                    <span className="badge">
                        {sponsor.tier ??
                            'Festival Partner'}
                    </span>

                    <h3>{sponsor.name}</h3>

                    {sponsor.description && (
                        <p>
                            {
                                sponsor.description
                            }
                        </p>
                    )}

                    {sponsor.website_url && (
                        <a
                            className="btn secondary small"
                            href={
                                sponsor.website_url
                            }
                            target="_blank"
                            rel="noreferrer"
                        >
                            Visit Partner
                        </a>
                    )}
                </article>
            ))}

            <article className="card sponsorCard partnershipCallout">
                <span className="badge">
                    Partnership Opportunities
                </span>

                <h3>
                    Become a Festival Partner
                </h3>

                <p>
                    Support grassroots football,
                    community development and Black
                    History Month while promoting your
                    organisation to players, families
                    and the wider community.
                </p>

                <a
                    className="btn primary small"
                    href="mailto:info@ckefamedia.com?subject=Black History Month Football Festival Partnership Enquiry"
                >
                    Discuss Partnership
                </a>
            </article>
        </div>
    )
}