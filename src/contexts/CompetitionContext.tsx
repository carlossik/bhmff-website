import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react'

import type { Competition } from '../types/competitionTypes'

type CompetitionContextValue = {
    currentCompetition: Competition | null
    currentCompetitionId: string | null
    setCurrentCompetition: (
        competition: Competition | null
    ) => void
}

const CompetitionContext =
    createContext<CompetitionContextValue | null>(
        null
    )

type CompetitionProviderProps = {
    children: ReactNode
}

export function CompetitionProvider({
                                        children,
                                    }: CompetitionProviderProps) {
    const [
        currentCompetition,
        setCurrentCompetition,
    ] = useState<Competition | null>(null)

    const currentCompetitionId =
        currentCompetition?.id ?? null

    const value = useMemo(
        () => ({
            currentCompetition,
            currentCompetitionId,
            setCurrentCompetition,
        }),
        [
            currentCompetition,
            currentCompetitionId,
        ]
    )

    return (
        <CompetitionContext.Provider
            value={value}
        >
            {children}
        </CompetitionContext.Provider>
    )
}

export function useCompetition() {
    const context =
        useContext(CompetitionContext)

    if (!context) {
        throw new Error(
            'useCompetition must be used within a CompetitionProvider.'
        )
    }

    return context
}