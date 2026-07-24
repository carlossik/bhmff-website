export type OrganisationStatus =
    | 'active'
    | 'inactive'
    | 'suspended'

export interface Organisation {
    id: string
    name: string
    slug: string
    status: OrganisationStatus

    logo_url: string | null

    primary_colour: string | null
    secondary_colour: string | null

    created_at: string
    updated_at: string
}

export interface OrganisationFormData {
    name: string
    slug: string

    primary_colour: string
    secondary_colour: string

    logo_url: string

    status: OrganisationStatus
}

export const defaultOrganisation: OrganisationFormData = {
    name: '',
    slug: '',
    primary_colour: '#0f766e',
    secondary_colour: '#0f172a',
    logo_url: '',
    status: 'active',
}