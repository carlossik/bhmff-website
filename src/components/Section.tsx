import type { ReactNode } from 'react'

import { useOptionalPublicOrganisation } from '../context/PublicOrganisationContext'

type SectionProps = {
    id: string
    title: string
    intro?: string
    children: ReactNode
}

export function Section({
    id,
    title,
    intro,
    children,
}: SectionProps) {
    const publicOrganisation =
        useOptionalPublicOrganisation()

    const isBhmff =
        publicOrganisation?.organisationSlug
            ?.trim()
            .toLowerCase() === 'bhmff'

    return (
        <section
            id={id}
            className="section"
        >
            <div className="container">
                <h2
                    style={
                        isBhmff
                            ? undefined
                            : {
                                  color: 'var(--organisation-text, inherit)',
                              }
                    }
                >
                    {title}
                </h2>

                {intro && (
                    <p
                        className="lead"
                        style={
                            isBhmff
                                ? undefined
                                : {
                                      color: 'var(--organisation-text, inherit)',
                                      opacity: 0.78,
                                  }
                        }
                    >
                        {intro}
                    </p>
                )}

                {children}
            </div>
        </section>
    )
}
