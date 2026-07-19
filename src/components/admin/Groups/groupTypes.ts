export type CompetitionGroup = {
    id: string
    competition_id: string
    name: string
    sort_order: number
    created_at: string | null
}

export type GroupTeam = {
    id: string
    competition_team_id: string
    team_id: string
    name: string
    logo_url: string | null
}

export type GroupMembership = {
    id: string
    group_id: string
    competition_team_id: string
}

export type GroupFormValues = {
    name: string
    sort_order: string
    competition_team_ids: string[]
}