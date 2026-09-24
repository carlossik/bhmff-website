import type {
    AdminRole,
} from '../../../services/accessControl'

export type AdminUser = {
    membership_id: string
    organisation_id: string
    user_id: string

    full_name: string | null
    email: string | null

    role: AdminRole
    active: boolean

    profile_active: boolean

    created_at: string
    updated_at: string
    competition_id?: string
    competition_team_id?: string
    invited_at: string | null
    last_sent_at: string | null
    accepted_at: string | null
    invitation_send_count: number
    sign_in_count: number
    first_signed_in_at: string | null
    last_signed_in_at: string | null
}

export type UserAccessFormValues = {
    fullName: string
    role: AdminRole
    active: boolean
    competitionId?: string
    competitionTeamId?: string
}

export type InviteUserFormValues = {
    fullName: string
    email: string
    role: AdminRole
    competitionId?: string
    competitionTeamId?: string
}
