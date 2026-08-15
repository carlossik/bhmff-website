export type ClubTeamSeasonStatus =
    | 'active'
    | 'inactive'
    | 'archived'

export type ClubTeamPaymentModel =
    | 'none'
    | 'matchday'
    | 'monthly'
    | 'hybrid'

export type ClubTeamSummary = {
    id: string
    name: string
    age_group: string | null
    division: string | null
    logo_url: string | null
    published: boolean
}

export type ClubTeamSeason = {
    id: string
    organisation_id: string
    season_id: string
    team_id: string
    status: ClubTeamSeasonStatus
    payment_model: ClubTeamPaymentModel
    monthly_fee_amount: number
    matchday_sub_amount: number
    monthly_due_day: number
    yellow_card_fine_amount: number
    red_card_fine_amount: number
    notes: string | null
    created_at: string
    updated_at: string
    team: ClubTeamSummary
}

export type ClubTeamPaymentFormValues = {
    payment_model: ClubTeamPaymentModel
    monthly_fee_amount: string
    matchday_sub_amount: string
    monthly_due_day: string
    yellow_card_fine_amount: string
    red_card_fine_amount: string
    notes: string
}
