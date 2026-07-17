export type CompetitionFormat =
    | 'LEAGUE'
    | 'ROUND_ROBIN'
    | 'GROUP_AND_KNOCKOUT'
    | 'KNOCKOUT'
    | 'SINGLE_MATCH'
    | 'FRIENDLY'
    | 'CUSTOM'

export type CompetitionStatus =
    | 'DRAFT'
    | 'ACTIVE'
    | 'COMPLETED'
    | 'ARCHIVED'

export interface Competition {
    id: string
    organisation_id: string
    name: string
    slug: string
    season: string | null
    format: CompetitionFormat
    description: string | null
    start_date: string | null
    end_date: string | null
    status: CompetitionStatus
    published: boolean
    legacy_festival_id: string | null
    created_at: string
    updated_at: string
}

export interface CreateCompetitionInput {
    organisation_id: string
    name: string
    slug: string
    season?: string | null
    format: CompetitionFormat
    description?: string | null
    start_date?: string | null
    end_date?: string | null
    status?: CompetitionStatus
    published?: boolean
}

export interface UpdateCompetitionInput {
    name?: string
    slug?: string
    season?: string | null
    format?: CompetitionFormat
    description?: string | null
    start_date?: string | null
    end_date?: string | null
    status?: CompetitionStatus
    published?: boolean
}