import { ClipboardCheck } from 'lucide-react'

import { ResultsList, type PublicResult } from '../../ResultsList'
import { Section } from '../../Section'
import { PublicEmptyState } from './PublicEmptyState'

export type ResultsSectionProps = {
    organisationName: string
    results: PublicResult[]
    surfaceColour: string
    textColour: string
    accentColour: string
}

export function ResultsSection({
                                   organisationName,
                                   results,
                                   surfaceColour,
                                   textColour,
                                   accentColour,
                               }: ResultsSectionProps) {
    return (
        <Section
            id="results"
            title="Latest Results"
            intro={`Confirmed and published match results from ${organisationName}.`}
        >
            {results.length > 0 ? (
                <ResultsList
                    results={results}
                    surfaceColour={surfaceColour}
                    textColour={textColour}
                    accentColour={accentColour}
                />
            ) : (
                <PublicEmptyState
                    title="No published results yet"
                    description="Results will automatically appear here once organisers publish completed fixtures."
                    icon={ClipboardCheck}
                    surfaceColour={surfaceColour}
                    textColour={textColour}
                    accentColour={accentColour}
                />
            )}
        </Section>
    )
}