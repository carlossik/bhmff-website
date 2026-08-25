export type ClubPlayerRegistrationStatus =
    | 'pending'
    | 'registered'
    | 'trialist'
    | 'not_registered'
    | 'inactive'

export type ClubPaymentStatus =
    | 'not_due'
    | 'due'
    | 'part_paid'
    | 'paid'
    | 'waived'

export interface ClubSquadMember {
    id: string
    organisation_id: string
    season_id: string
    team_id: string
    player_id: string
    squad_number: number | null
    position: string | null
    registration_status: ClubPlayerRegistrationStatus
    sign_on_fee_amount: number
    sign_on_fee_status: ClubPaymentStatus
    notes: string | null
    active: boolean
    created_at: string
    updated_at: string
    player: {
        id: string
        first_name: string
        last_name: string
        email: string | null
        phone: string | null
        active: boolean
    }
}

export interface ClubSquadMemberFormValues {
    first_name: string
    last_name: string
    email: string
    phone: string
    squad_number: string
    position: string
    registration_status: ClubPlayerRegistrationStatus
    sign_on_fee_amount: string
    sign_on_fee_status: ClubPaymentStatus
    notes: string
    active: boolean
}

export interface ClubSquadCsvRow {
    first_name: string
    last_name: string
    email: string
    phone: string
    squad_number: string
    position: string
    registration_status: string
    sign_on_fee_amount: string
    sign_on_fee_status: string
    notes: string
}
