export interface Sport {
    id: string
    name: string
    slug: string
    icon_key: string | null
    active: boolean
    created_at: string
    updated_at: string
}

export interface SportOfficialRole {
    id: string
    sport_id: string
    role: string
    display_name: string
    description: string | null
    sort_order: number
    is_primary: boolean
    active: boolean
    created_at: string
    updated_at: string
}

export interface SportWithRoles extends Sport {
    roles: SportOfficialRole[]
}

export interface CreateSportInput {
    name: string
    slug: string
    icon_key?: string | null
    active?: boolean
}

export interface UpdateSportInput {
    name?: string
    slug?: string
    icon_key?: string | null
    active?: boolean
}

export interface CreateSportOfficialRoleInput {
    sport_id: string
    role: string
    display_name: string
    description?: string | null
    sort_order?: number
    is_primary?: boolean
    active?: boolean
}

export interface UpdateSportOfficialRoleInput {
    role?: string
    display_name?: string
    description?: string | null
    sort_order?: number
    is_primary?: boolean
    active?: boolean
}