import {
    SportRulesResolutionEngine,
} from './sportRulesResolutionEngine'

import type {
    RulesConfirmation,
    RulesResolution,
} from './sportRulesResolutionEngine'

export type FootballAgeCategory =
    | 'u7-u8'
    | 'u9-u10'
    | 'u11-u12'
    | 'u13-u14'
    | 'u15-u16'
    | 'u17'
    | 'adult'

export type FootballCompetitionFormat =
    | 'league'
    | 'knockout'

export type FootballRulesProfileId =
    | 'adult-league'
    | 'adult-knockout'
    | 'youth-custom'

export type FootballRulesProfile = {
    id: FootballRulesProfileId
    sport: 'football'
    label: string
    ageCategory: FootballAgeCategory
    competitionFormat: FootballCompetitionFormat
    normalMatchDurationMinutes: number
    injuryTimeAllowanceMinutes: number
    extraTimeEnabled: boolean
    extraTimeDurationMinutes: number
    penaltiesEnabled: boolean
    reserveMaximumKnockoutDuration: boolean
    defaultDaysBetweenRounds: number
    venueChangeoverMinutes: number
    configurable: boolean
}

export type FootballScheduleRules = FootballRulesProfile & {
    scheduledFixtureDurationMinutes: number
    minimumSameVenueStartIntervalMinutes: number
}

const ADULT_LEAGUE_PROFILE: FootballRulesProfile = {
    id: 'adult-league',
    sport: 'football',
    label: 'Adult league football',
    ageCategory: 'adult',
    competitionFormat: 'league',
    normalMatchDurationMinutes: 90,
    injuryTimeAllowanceMinutes: 0,
    extraTimeEnabled: false,
    extraTimeDurationMinutes: 0,
    penaltiesEnabled: false,
    reserveMaximumKnockoutDuration: false,
    defaultDaysBetweenRounds: 7,
    venueChangeoverMinutes: 0,
    configurable: true,
}

const ADULT_KNOCKOUT_PROFILE: FootballRulesProfile = {
    id: 'adult-knockout',
    sport: 'football',
    label: 'Adult knockout football',
    ageCategory: 'adult',
    competitionFormat: 'knockout',
    normalMatchDurationMinutes: 90,
    injuryTimeAllowanceMinutes: 0,
    extraTimeEnabled: true,
    extraTimeDurationMinutes: 30,
    penaltiesEnabled: true,
    reserveMaximumKnockoutDuration: true,
    defaultDaysBetweenRounds: 7,
    venueChangeoverMinutes: 0,
    configurable: true,
}

export class FootballRulesEngine {
    static getAdultLeagueProfile(): FootballRulesProfile {
        return { ...ADULT_LEAGUE_PROFILE }
    }

    static getAdultKnockoutProfile(): FootballRulesProfile {
        return { ...ADULT_KNOCKOUT_PROFILE }
    }

    static getProfileForFormat(
        format: FootballCompetitionFormat
    ): FootballRulesProfile {
        return format === 'knockout'
            ? FootballRulesEngine.getAdultKnockoutProfile()
            : FootballRulesEngine.getAdultLeagueProfile()
    }

    static detectAndResolve(params: {
        competitionName?: string | null
        teamNames: string[]
        competitionFormat: FootballCompetitionFormat
        confirmation?: RulesConfirmation | null
    }): RulesResolution {
        return SportRulesResolutionEngine.resolve({
            competitionName: params.competitionName,
            teamNames: params.teamNames,
            competitionFormat: params.competitionFormat,
            confirmation: {
                ...params.confirmation,
                sport: 'football',
            },
        })
    }

    static createYouthProfile(params: {
        ageCategory: Exclude<FootballAgeCategory, 'adult'>
        competitionFormat: FootballCompetitionFormat
        matchDurationMinutes: number
        injuryTimeAllowanceMinutes?: number
        extraTimeEnabled?: boolean
        extraTimeDurationMinutes?: number
        penaltiesEnabled?: boolean
        daysBetweenRounds?: number
    }): FootballRulesProfile {
        if (
            !Number.isFinite(params.matchDurationMinutes) ||
            params.matchDurationMinutes <= 0
        ) {
            throw new Error(
                'Youth match duration must be greater than zero.'
            )
        }

        return {
            id: 'youth-custom',
            sport: 'football',
            label: `Youth football (${params.ageCategory})`,
            ageCategory: params.ageCategory,
            competitionFormat: params.competitionFormat,
            normalMatchDurationMinutes:
            params.matchDurationMinutes,
            injuryTimeAllowanceMinutes:
                params.injuryTimeAllowanceMinutes ?? 0,
            extraTimeEnabled:
                params.extraTimeEnabled ?? false,
            extraTimeDurationMinutes:
                params.extraTimeDurationMinutes ?? 0,
            penaltiesEnabled:
                params.penaltiesEnabled ?? false,
            reserveMaximumKnockoutDuration:
                params.competitionFormat === 'knockout' &&
                (params.extraTimeEnabled ?? false),
            defaultDaysBetweenRounds:
                params.daysBetweenRounds ?? 7,
            venueChangeoverMinutes: 0,
            configurable: true,
        }
    }

    static resolveScheduleRules(
        profile: FootballRulesProfile
    ): FootballScheduleRules {
        const scheduledFixtureDurationMinutes =
            profile.normalMatchDurationMinutes +
            profile.injuryTimeAllowanceMinutes +
            (
                profile.extraTimeEnabled &&
                profile.reserveMaximumKnockoutDuration
                    ? profile.extraTimeDurationMinutes
                    : 0
            )

        return {
            ...profile,
            scheduledFixtureDurationMinutes,
            minimumSameVenueStartIntervalMinutes:
                scheduledFixtureDurationMinutes +
                profile.venueChangeoverMinutes,
        }
    }
}