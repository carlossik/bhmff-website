export type FestivalGroup = {
    id: string
    festival_id: string
    name: string
    sort_order: number
    created_at: string | null
}

export type GroupTeam = {
    id: string
    name: string
    logo_url: string | null
}

export type GroupMembership = {
    id: string
    group_id: string
    team_id: string
}

export type GroupFormValues = {
    name: string
    sort_order: string
    team_ids: string[]
}