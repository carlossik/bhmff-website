export type Sponsor = {
    id: string
    festival_id: string | null
    name: string
    tier: string | null
    logo_url: string | null
    website_url: string | null
    description: string | null
    active: boolean
    created_at: string | null
}

export type SponsorFormValues = {
    name: string
    tier: string
    website_url: string
    description: string
    active: boolean
}