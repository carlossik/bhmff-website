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
}

export type UserAccessFormValues = {
    fullName: string
    role: AdminRole
    active: boolean
}

export type InviteUserFormValues = {
    fullName: string
    email: string
    role: AdminRole
}