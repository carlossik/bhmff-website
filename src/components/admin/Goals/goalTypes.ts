export type Goal = {
    id: string
    fixture_id: string | null
    team_id: string | null
    player_name: string
    minute: number | null
    video_timestamp: string | null
    created_at: string | null
}

export type GoalFixture = {
    id: string
    stage: string
    kickoff_time: string | null
    home_team_id: string | null
    away_team_id: string | null
}

export type GoalTeam = {
    id: string
    name: string
    logo_url: string | null
}

export type GoalFormValues = {
    fixture_id: string
    team_id: string
    player_name: string
    minute: string
    video_timestamp: string
}