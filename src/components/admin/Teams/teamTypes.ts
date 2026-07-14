export type TeamParticipationStatus =
    | 'interested'
    | 'invited'
    | 'confirmed'
    | 'withdrawn'

export type DbTeam = {
    id: string
    name: string
    manager_name: string | null
    contact_email: string | null
    contact_phone: string | null
    notes: string | null
    logo_url: string | null
    published: boolean
    participation_status: TeamParticipationStatus
    primary_home_venue_id: string | null
}

export type TeamVenueOption = {
    id: string
    name: string
}