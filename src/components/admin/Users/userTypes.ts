import type {
    AdminRole,
} from '../../../services/accessControl'

export type AdminUser = {
    id: string
    full_name: string | null
    email: string | null
    role: AdminRole
    active: boolean
    created_at: string
    updated_at: string
}

export type UserAccessFormValues = {
    fullName: string
    role: AdminRole
    active: boolean
}