import type {
    OrganisationType,
} from '../components/admin/Organisations/organisationTypes'

export const REQUESTED_ORGANISATION_TYPE_STORAGE_KEY =
    'tournamenthq-requested-organisation-type'

export function getRequestedOrganisationTypeFromSearch(
    search: string,
): OrganisationType | null {
    const params = new URLSearchParams(search)
    const value = params.get('type')

    if (
        value === 'club' ||
        value === 'competition_organiser'
    ) {
        return value
    }

    return null
}

export function getStoredRequestedOrganisationType():
    OrganisationType | null {
    if (typeof window === 'undefined') {
        return null
    }

    const value = window.localStorage.getItem(
        REQUESTED_ORGANISATION_TYPE_STORAGE_KEY,
    )

    return value === 'club' ||
        value === 'competition_organiser'
        ? value
        : null
}

export function persistRequestedOrganisationType(
    organisationType: OrganisationType,
): void {
    if (typeof window === 'undefined') {
        return
    }

    window.localStorage.setItem(
        REQUESTED_ORGANISATION_TYPE_STORAGE_KEY,
        organisationType,
    )
}

export function resolveRequestedOrganisationType(
    search: string,
): OrganisationType {
    return (
        getRequestedOrganisationTypeFromSearch(
            search,
        ) ??
        getStoredRequestedOrganisationType() ??
        'competition_organiser'
    )
}
