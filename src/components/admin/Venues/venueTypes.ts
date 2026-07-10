export type Festival = {
    id: string
    name: string
    year: number
}

export type Venue = {
    id: string
    festival_id: string | null
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