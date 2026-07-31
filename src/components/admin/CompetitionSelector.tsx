import { useEffect, useState } from 'react'
import { competitionService } from '../../services/competitionService'
import { useOrganisation } from '../../context/OrganisationContext'
import { useCompetition } from '../../contexts/CompetitionContext'
import type { Competition } from '../../types/competitionTypes'

export function CompetitionSelector() {
    const { currentOrganisation } = useOrganisation()

    const {
        currentCompetition,
        setCurrentCompetition,
    } = useCompetition()

    const [competitions, setCompetitions] =
        useState<Competition[]>([])

    const [loading, setLoading] =
        useState(true)

    useEffect(() => {
        async function loadCompetitions() {
            try {
                const data =
                    await competitionService.getAll(
                        currentOrganisation.id
                    )

                setCompetitions(data)
                console.log('Competitions:', data);

                if (
                    !currentCompetition &&
                    data.length > 0
                ) {
                    setCurrentCompetition(data[0])
                }
            } finally {
                setLoading(false)
            }
        }

        void loadCompetitions()
    }, [
        currentOrganisation.id,
        currentCompetition,
        setCurrentCompetition,
    ])

    if (loading) {
        return (
            <p className="muted">
                Loading competitions...
            </p>
        )
    }

    if (!competitions.length) {
        return (
            <p className="muted">
                No competitions found
            </p>
        )
    }

    return (
        <div className="competitionSelector">
            <label>
                Competition
            </label>

            <select
                value={
                    currentCompetition?.id ?? ''
                }
                onChange={(e) => {
                    const selected =
                        competitions.find(
                            (competition) =>
                                competition.id ===
                                e.target.value
                        )

                    if (selected) {
                        setCurrentCompetition(
                            selected
                        )
                        console.log('Competition selected:', selected);

                    }
                }}
            >
                {competitions.map(
                    (competition) => (
                        <option
                            key={competition.id}
                            value={
                                competition.id
                            }
                        >
                            {competition.name}
                        </option>
                    )
                )}
            </select>
        </div>
    )
}