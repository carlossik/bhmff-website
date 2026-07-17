import {
    createContext,
    useContext,
    type ReactNode,
} from 'react'
import type {
    AdminProfile,
    AdminRole,
    Organisation,
    OrganisationMembership,
} from '../services/accessControl'

type OrganisationContextValue = {
    profile: AdminProfile
    currentOrganisation: Organisation
    currentMembership: OrganisationMembership
    currentRole: AdminRole
}

const OrganisationContext =
    createContext<OrganisationContextValue | null>(
        null
    )

type OrganisationProviderProps = {
    profile: AdminProfile
    children: ReactNode
}

export function OrganisationProvider({
                                         profile,
                                         children,
                                     }: OrganisationProviderProps) {
    const value: OrganisationContextValue = {
        profile,
        currentOrganisation:
        profile.currentOrganisation,
        currentMembership:
        profile.currentMembership,
        currentRole: profile.role,
    }

    return (
        <OrganisationContext.Provider
            value={value}
        >
            {children}
        </OrganisationContext.Provider>
    )
}

export function useOrganisation() {
    const context = useContext(
        OrganisationContext
    )

    if (!context) {
        throw new Error(
            'useOrganisation must be used within an OrganisationProvider.'
        )
    }

    return context
}