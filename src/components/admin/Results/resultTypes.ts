export type Result = {
    id: string
    fixture_id: string
    home_score: number
    away_score: number
    player_of_match: string | null
    match_report: string | null
    published: boolean
    created_at: string | null
}

export type ResultFixture = {
    id: string
    stage: string
    kickoff_time: string | null
    home_competition_team_id: string | null
    away_competition_team_id: string | null
}

export type ResultTeam = {
    id: string
    competition_team_id: string
    name: string
}

export type ResultFormValues = {
    fixture_id: string
    home_score: string
    away_score: string
    player_of_match: string
    match_report: string
    published: boolean
}