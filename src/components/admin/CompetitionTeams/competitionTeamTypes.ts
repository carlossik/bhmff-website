export type CompetitionTeamStatus =
    | 'invited'
    | 'confirmed'
    | 'withdrawn'

export type CompetitionTeam = {
    id: string

    competition_id: string

    team_id: string

    organisation_id: string

    group_id: string | null

    squad_number: number | null

    seed: number | null

    status: CompetitionTeamStatus

    published: boolean

    created_at: string

    team?: {
        id: string
        name: string
        logo_url: string | null
        age_group: string | null
        gender: string | null
        club_id: string | null
    }
    group?: {
        id: string
        name: string
    } | null

    club?: {
        id: string
        name: string
    }
}

export type CompetitionTeamForm = {
    team_id: string
    group_id: string
    squad_number: string
    seed: string
    status: CompetitionTeamStatus
    published: boolean
}

export type TeamOption = {
    id: string
    name: string
    club_id: string | null
    age_group: string | null
    gender: string | null
}

export type GroupOption = {
    id: string
    name: string
}