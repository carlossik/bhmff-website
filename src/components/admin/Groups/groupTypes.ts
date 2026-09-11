export const GROUP_MATCH_DAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
] as const

export type GroupMatchDay =
    (typeof GROUP_MATCH_DAYS)[number]

export type CompetitionGroup = {
    id: string
    competition_id: string
    name: string
    sort_order: number
    published: boolean
    match_day: GroupMatchDay | null
    permitted_match_days: string[]
    created_at: string | null
}

export type GroupTeam = {
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
    match_day: GroupMatchDay | ''
    competition_team_ids: string[]
}