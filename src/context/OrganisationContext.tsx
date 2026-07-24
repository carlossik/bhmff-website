import {
    createContext,
    useContext,
    useMemo,
    useState,
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
    currentMembership: OrganisationMembership
    currentRole: AdminRole
    organisationAccess: OrganisationAccess[]
    switchOrganisation: (
        organisationId: string
    ) => void
}

const OrganisationContext =
    createContext<OrganisationContextValue | null>(
        null
    )

type OrganisationProviderProps = {
    profile: AdminProfile
    children: ReactNode
}

const STORAGE_KEY =
    'tournamenthq-current-organisation'

export function OrganisationProvider({
                                         profile,
                                         children,
                                     }: OrganisationProviderProps) {
    const [selectedOrganisationId, setSelectedOrganisationId] =
        useState(profile.currentOrganisation.id)

    const selectedAccess = useMemo(() => {
        return (
            profile.organisationAccess.find(
                (access) =>
                    access.organisation.id ===
                    selectedOrganisationId
            ) ?? profile.organisationAccess[0]
        )
    }, [
        profile.organisationAccess,
        selectedOrganisationId,
    ])

    function switchOrganisation(
        organisationId: string
    ) {
        const access =
            profile.organisationAccess.find(
                (item) =>
                    item.organisation.id ===
                    organisationId
            )

        if (!access) {
            throw new Error(
                'You do not have access to this organisation.'
            )
        }

        setSelectedOrganisationId(
            organisationId
        )

        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                organisationId
            )
        } catch {
            // Local storage may be unavailable.
        }
    }

    const value = useMemo<
        OrganisationContextValue
    >(
        () => ({
            profile: {
                ...profile,
                role:
                selectedAccess.membership
                    .role,
                currentOrganisation:
                selectedAccess.organisation,
                currentMembership:
                selectedAccess.membership,
            },
            currentOrganisation:
            selectedAccess.organisation,
            currentMembership:
            selectedAccess.membership,
            currentRole:
            selectedAccess.membership.role,
            organisationAccess:
            profile.organisationAccess,
            switchOrganisation,
        }),
        [
            profile,
            selectedAccess,
        ]
    )

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