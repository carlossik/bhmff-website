import {
    createContext,
    useContext,
    type ReactNode,
} from 'react'

import type { Organisation } from '../components/admin/Organisations/organisationTypes'
import type { PublicOrganisationData } from '../services/public/organisationPublicService'

export type PublicOrganisationContextValue = {
    organisation: Organisation
    organisationId: string
    organisationSlug: string
    basePath: string
    publicData: PublicOrganisationData
}

const PublicOrganisationContext =
    createContext<PublicOrganisationContextValue | null>(
        null
    )

type PublicOrganisationProviderProps = {
    organisation: Organisation
    basePath: string
    publicData: PublicOrganisationData
    children: ReactNode
}

export function PublicOrganisationProvider({
                                               organisation,
                                               basePath,
                                               publicData,
                                               children,
                                           }: PublicOrganisationProviderProps) {
    return (
        <PublicOrganisationContext.Provider
            value={{
                organisation,
                organisationId: organisation.id,
                organisationSlug: organisation.slug,
                basePath,
                publicData,
            }}
        >
            {children}
        </PublicOrganisationContext.Provider>
    )
}

export function usePublicOrganisation() {
    const context = useContext(
        PublicOrganisationContext
    )

    if (!context) {
        throw new Error(
            'usePublicOrganisation must be used within a PublicOrganisationProvider.'
        )
    }

    return context
}

export function useOptionalPublicOrganisation() {
    return useContext(
        PublicOrganisationContext
    )
}