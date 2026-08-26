export type TrialistStatus =
    | 'draft'
    | 'invited'
    | 'accepted'
    | 'declined'
    | 'scheduled'
    | 'attended'
    | 'under_review'
    | 'offered'
    | 'further_trial'
    | 'unsuccessful'
    | 'no_show'
    | 'withdrawn'

export type TrialDecision = 'offer_place' | 'further_trial' | 'keep_observing' | 'unsuccessful' | null

export type Trialist = {
    id: string
    organisation_id: string
    season_id: string | null
    team_id: string | null
    first_name: string
    last_name: string
    date_of_birth: string | null
    position: string | null
    preferred_foot: string | null
    email: string | null
    phone: string | null
    guardian_name: string | null
    guardian_email: string | null
    guardian_phone: string | null
    previous_club: string | null
    referred_by: string | null
    trial_date: string | null
    trial_type: 'training' | 'match' | 'other'
    venue_name: string | null
    venue_address: string | null
    status: TrialistStatus
    eligible_for_match_trial: boolean
    internal_notes: string | null
    report_summary: string | null
    decision: TrialDecision
    linked_player_id: string | null
    linked_squad_member_id: string | null
    created_at: string
    updated_at: string
}

export type TrialistFormValues = {
    season_id: string
    team_id: string
    first_name: string
    last_name: string
    date_of_birth: string
    position: string
    preferred_foot: string
    email: string
    phone: string
    guardian_name: string
    guardian_email: string
    guardian_phone: string
    previous_club: string
    referred_by: string
    trial_date: string
    trial_type: 'training' | 'match' | 'other'
    venue_name: string
    venue_address: string
    eligible_for_match_trial: boolean
    internal_notes: string
}

export type TrialAssessment = {
    id: string
    trialist_id: string
    organisation_id: string
    technical: number
    tactical: number
    physical: number
    attitude: number
    coachability: number
    teamwork: number
    strengths: string | null
    development_areas: string | null
    coach_notes: string | null
    public_feedback: string | null
    recommendation: Exclude<TrialDecision, null>
    created_at: string
    updated_at: string
}
