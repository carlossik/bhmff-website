export type OrganisationTeamOption = {
    id: string
    club_id: string | null
    name: string
    logo_url: string | null
    age_group: string | null
    division: string | null
    participation_status: string | null
    published: boolean
    club_name: string | null
}

export type CompetitionTeam = {
    id: string
    competition_id: string
    team_id: string
    created_at: string | null
    team: OrganisationTeamOption
}

export type CompetitionTeamSelection = {
    team_id: string
    selected: boolean
}

export type CompetitionTeamRow = {
    id: string
    competition_id: string
    team_id: string
    created_at: string | null
    team:
        | {
        id: string
        club_id: string | null
        name: string
        logo_url: string | null
        age_group: string | null
        division: string | null
        participation_status: string | null
        published: boolean
        club:
            | {
            name: string
        }
            | {
            name: string
        }[]
            | null
    }
        | {
        id: string
        club_id: string | null
        name: string
        logo_url: string | null
        age_group: string | null
        division: string | null
        participation_status: string | null
        published: boolean
        club:
            | {
            name: string
        }
            | {
            name: string
        }[]
            | null
    }[]
        | null
}

export type OrganisationTeamRow = {
    id: string
    club_id: string | null
    name: string
    logo_url: string | null
    age_group: string | null
    division: string | null
    participation_status: string | null
    published: boolean
    club:
        | {
        name: string
    }
        | {
        name: string
    }[]
        | null
}