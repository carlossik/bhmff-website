export type Venue = {
    id: string
    organisation_id: string
    competition_id: string
    name: string
    address: string | null
    postcode: string | null
    notes: string | null
    created_at: string | null
}

export type VenueFormValues = {
    name: string
    address: string
    postcode: string
    notes: string
}