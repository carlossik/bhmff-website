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
    isBhmff?: boolean
}

export function ResultsSection({
                                   organisationName,
                                   results,
                                   surfaceColour,
                                   textColour,
                                   accentColour,
                                   isBhmff = false,
                               }: ResultsSectionProps) {
    return (
        <Section
            id="results"
            title="Latest Results"
            intro={`Confirmed and published match results from ${organisationName}.`}
        >
            {results.length > 0 ? (
                isBhmff ? <details className="rounded-xl border p-4" style={{borderColor:`${accentColour}40`, background:surfaceColour}}>
                    <summary className="cursor-pointer font-bold">Show all published results ({results.length})</summary>
                    <div className="mt-4"><ResultsList results={results} surfaceColour={surfaceColour} textColour={textColour} accentColour={accentColour}/></div>
                </details> : <ResultsList results={results} surfaceColour={surfaceColour} textColour={textColour} accentColour={accentColour}/>
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