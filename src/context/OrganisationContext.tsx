import {
    createContext,
    useContext,
    type ReactNode,
} from 'react'

import type {
    AdminProfile,
    AdminRole,
    Organisation,
    OrganisationAccess,
    OrganisationMembership,
} from '../services/accessControl'

type OrganisationContextValue = {
    profile: AdminProfile

    currentOrganisation: Organisation

    currentMembership:
        OrganisationMembership

    currentRole: AdminRole

    organisationAccess:
        OrganisationAccess[]

    switchOrganisation: (
        organisationId: string,
    ) => void
}

const OrganisationContext =
    createContext<
        OrganisationContextValue | null
    >(null)

type OrganisationProviderProps = {
    profile: AdminProfile
    children: ReactNode
}

export function OrganisationProvider({
                                         profile,
                                         children,
                                     }: OrganisationProviderProps) {
    function switchOrganisation(
        organisationId: string,
    ) {
        const selectedAccess =
            profile.organisationAccess.find(
                (access) =>
                    access.organisation.id ===
                    organisationId,
            )

        if (!selectedAccess) {
            console.error(
                'The selected organisation is not available to this user.',
            )

            return
        }

        if (
            selectedAccess.organisation.id ===
            profile.currentOrganisation.id
        ) {
            return
        }

        window.localStorage.setItem(
            'tournamenthq-current-organisation',
            selectedAccess.organisation.id,
        )

        window.location.reload()
    }

    const value: OrganisationContextValue = {
        profile,

        currentOrganisation:
        profile.currentOrganisation,

        currentMembership:
        profile.currentMembership,

        currentRole:
        profile.currentMembership.role,

        organisationAccess:
        profile.organisationAccess,

        switchOrganisation,
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
        OrganisationContext,
    )

    if (!context) {
        throw new Error(
            'useOrganisation must be used within an OrganisationProvider.',
        )
    }

    return context
}