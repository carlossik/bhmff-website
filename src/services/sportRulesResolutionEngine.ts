export type SupportedSport =
    | 'football'
    | 'basketball'
    | 'rugby'
    | 'cricket'
    | 'volleyball'
    | 'netball'
    | 'unknown'

export type CompetitionFormat =
    | 'league'
    | 'knockout'

export type RulesDecision =
    | 'pending'
    | 'accepted'
    | 'overridden'

export type RulesOverride = {
    governingBody?: string
    periodCount?: number
    minutesPerPeriod?: number
    extraTimeEnabled?: boolean
    extraTimeMinutes?: number
}

export type ResolvedSportRules = {
    sport: SupportedSport
    sportLabel: string
    countryCode: string
    countryName: string
    governingBody: string
    detectedAge: number | null
    ageLabel: string
    isAdult: boolean
    competitionFormat: CompetitionFormat
    periodCount: number
    minutesPerPeriod: number
    normalMatchDurationMinutes: number
    extraTimeEnabled: boolean
    extraTimeMinutes: number
    scheduledFixtureDurationMinutes: number
    minimumSameVenueStartIntervalMinutes: number
    defaultDaysBetweenRounds: number
}

export type RulesRecommendation = {
    detectedSport: SupportedSport
    detectedAges: number[]
    mixedAgeCategories: boolean
    countryCode: string
    countryName: string
    countrySource: string
    governingBody: string
    confidence: number
    explanation: string[]
    rules: ResolvedSportRules | null
    requiresOverride: boolean
}

const SPORT_PATTERNS: Array<{
    sport: Exclude<SupportedSport, 'unknown'>
    pattern: RegExp
}> = [
    {
        sport: 'football',
        pattern: /\b(football|soccer|futsal)\b/i,
    },
    {
        sport: 'basketball',
        pattern: /\b(basketball|3x3)\b/i,
    },
    {
        sport: 'rugby',
        pattern: /\b(rugby|rugby union|rugby league)\b/i,
    },
    {
        sport: 'cricket',
        pattern: /\b(cricket|t20|twenty20|hundred)\b/i,
    },
    {
        sport: 'volleyball',
        pattern: /\bvolleyball\b/i,
    },
    {
        sport: 'netball',
        pattern: /\bnetball\b/i,
    },
]

const SPORT_LABELS: Record<SupportedSport, string> = {
    football: 'Football',
    basketball: 'Basketball',
    rugby: 'Rugby',
    cricket: 'Cricket',
    volleyball: 'Volleyball',
    netball: 'Netball',
    unknown: 'Unknown sport',
}

type ResolveParams = {
    competitionName?: string | null
    teamNames: string[]
    competitionFormat: CompetitionFormat
    countryCode: string
    countryName: string
    countrySource: string
    governingBody?: string | null
    decision: RulesDecision
    override?: RulesOverride | null
}

type FootballDuration = {
    periodCount: number
    minutesPerPeriod: number
    extraTimeMinutes: number
}

const ENGLAND_FOOTBALL_DURATION_BY_AGE: Array<{
    minimumAge: number
    maximumAge: number
    league: FootballDuration
    knockout: FootballDuration
}> = [
    {
        minimumAge: 7,
        maximumAge: 8,
        league: {
            periodCount: 2,
            minutesPerPeriod: 20,
            extraTimeMinutes: 0,
        },
        knockout: {
            periodCount: 2,
            minutesPerPeriod: 20,
            extraTimeMinutes: 0,
        },
    },
    {
        minimumAge: 9,
        maximumAge: 10,
        league: {
            periodCount: 2,
            minutesPerPeriod: 25,
            extraTimeMinutes: 0,
        },
        knockout: {
            periodCount: 2,
            minutesPerPeriod: 25,
            extraTimeMinutes: 0,
        },
    },
    {
        minimumAge: 11,
        maximumAge: 12,
        league: {
            periodCount: 2,
            minutesPerPeriod: 30,
            extraTimeMinutes: 0,
        },
        knockout: {
            periodCount: 2,
            minutesPerPeriod: 30,
            extraTimeMinutes: 20,
        },
    },
    {
        minimumAge: 13,
        maximumAge: 14,
        league: {
            periodCount: 2,
            minutesPerPeriod: 35,
            extraTimeMinutes: 0,
        },
        knockout: {
            periodCount: 2,
            minutesPerPeriod: 35,
            extraTimeMinutes: 20,
        },
    },
    {
        minimumAge: 15,
        maximumAge: 16,
        league: {
            periodCount: 2,
            minutesPerPeriod: 40,
            extraTimeMinutes: 0,
        },
        knockout: {
            periodCount: 2,
            minutesPerPeriod: 40,
            extraTimeMinutes: 20,
        },
    },
    {
        minimumAge: 17,
        maximumAge: 17,
        league: {
            periodCount: 2,
            minutesPerPeriod: 45,
            extraTimeMinutes: 0,
        },
        knockout: {
            periodCount: 2,
            minutesPerPeriod: 45,
            extraTimeMinutes: 30,
        },
    },
]

export class SportRulesResolutionEngine {
    static detectSport(
        values: string[]
    ): SupportedSport {
        const combined =
            values.join(' ')

        for (const candidate of SPORT_PATTERNS) {
            if (
                candidate.pattern.test(combined)
            ) {
                return candidate.sport
            }
        }

        return 'football'
    }

    static detectAges(
        values: string[]
    ): number[] {
        const ages =
            new Set<number>()

        const patterns = [
            /\bu\s*-?\s*(\d{1,2})s?\b/gi,
            /\bunder\s*-?\s*(\d{1,2})s?\b/gi,
        ]

        for (const value of values) {
            for (const pattern of patterns) {
                pattern.lastIndex = 0

                let match:
                    RegExpExecArray | null

                while (
                    (
                        match =
                            pattern.exec(value)
                    ) !== null
                    ) {
                    const age =
                        Number(match[1])

                    if (
                        Number.isInteger(age) &&
                        age >= 5 &&
                        age <= 99
                    ) {
                        ages.add(age)
                    }
                }
            }
        }

        return [...ages].sort(
            (first, second) =>
                first - second
        )
    }

    static recommend({
                         competitionName,
                         teamNames,
                         competitionFormat,
                         countryCode,
                         countryName,
                         countrySource,
                         governingBody,
                         decision,
                         override,
                     }: ResolveParams): RulesRecommendation {
        const sourceValues = [
            competitionName ?? '',
            ...teamNames,
        ]

        const detectedSport =
            SportRulesResolutionEngine
                .detectSport(sourceValues)

        const detectedAges =
            SportRulesResolutionEngine
                .detectAges(sourceValues)

        const mixedAgeCategories =
            detectedAges.length > 1

        const detectedAge =
            detectedAges.length === 1
                ? detectedAges[0]
                : null

        const isAdult =
            detectedAge === null ||
            detectedAge >= 18

        const resolvedGoverningBody =
            override?.governingBody?.trim() ||
            governingBody?.trim() ||
            'Local competition rules'

        const explanation: string[] = [
            `${SPORT_LABELS[detectedSport]} was inferred from the competition and team information.`,
            detectedAge === null
                ? 'No youth age marker was detected, so senior rules are recommended.'
                : `The AI detected an Under-${detectedAge} competition.`,
            `${countryName} was inferred from ${countrySource}.`,
        ]

        if (
            decision === 'overridden' &&
            override &&
            Number.isInteger(
                override.periodCount
            ) &&
            Number.isInteger(
                override.minutesPerPeriod
            ) &&
            (override.periodCount ?? 0) > 0 &&
            (override.minutesPerPeriod ?? 0) > 0
        ) {
            const periodCount =
                override.periodCount as number

            const minutesPerPeriod =
                override.minutesPerPeriod as number

            const normalMatchDurationMinutes =
                periodCount *
                minutesPerPeriod

            const extraTimeEnabled =
                competitionFormat === 'knockout' &&
                Boolean(
                    override.extraTimeEnabled
                )

            const extraTimeMinutes =
                extraTimeEnabled
                    ? Math.max(
                        0,
                        override.extraTimeMinutes ?? 0
                    )
                    : 0

            explanation.push(
                'The organiser has overridden the recommended rules.'
            )

            return {
                detectedSport,
                detectedAges,
                mixedAgeCategories,
                countryCode,
                countryName,
                countrySource,
                governingBody:
                resolvedGoverningBody,
                confidence: 1,
                explanation,
                requiresOverride: false,
                rules: {
                    sport: detectedSport,
                    sportLabel:
                        SPORT_LABELS[detectedSport],
                    countryCode,
                    countryName,
                    governingBody:
                    resolvedGoverningBody,
                    detectedAge,
                    ageLabel:
                        isAdult
                            ? 'Adult'
                            : `Under ${detectedAge}`,
                    isAdult,
                    competitionFormat,
                    periodCount,
                    minutesPerPeriod,
                    normalMatchDurationMinutes,
                    extraTimeEnabled,
                    extraTimeMinutes,
                    scheduledFixtureDurationMinutes:
                        normalMatchDurationMinutes +
                        extraTimeMinutes,
                    minimumSameVenueStartIntervalMinutes:
                        normalMatchDurationMinutes +
                        extraTimeMinutes,
                    defaultDaysBetweenRounds: 7,
                },
            }
        }

        if (mixedAgeCategories) {
            explanation.push(
                'Different youth age categories were detected, so one automatic duration cannot be safely applied.'
            )

            return {
                detectedSport,
                detectedAges,
                mixedAgeCategories,
                countryCode,
                countryName,
                countrySource,
                governingBody:
                resolvedGoverningBody,
                confidence: 0.35,
                explanation,
                requiresOverride: true,
                rules: null,
            }
        }

        if (detectedSport !== 'football') {
            explanation.push(
                'A verified rules profile has not yet been installed for this sport.'
            )

            return {
                detectedSport,
                detectedAges,
                mixedAgeCategories,
                countryCode,
                countryName,
                countrySource,
                governingBody:
                resolvedGoverningBody,
                confidence: 0.35,
                explanation,
                requiresOverride: true,
                rules: null,
            }
        }

        let duration:
            FootballDuration | null = null

        if (isAdult) {
            duration = {
                periodCount: 2,
                minutesPerPeriod: 45,
                extraTimeMinutes:
                    competitionFormat ===
                    'knockout'
                        ? 30
                        : 0,
            }
        } else if (countryCode === 'GB') {
            const profile =
                ENGLAND_FOOTBALL_DURATION_BY_AGE
                    .find(
                        (candidate) =>
                            detectedAge !== null &&
                            detectedAge >=
                            candidate.minimumAge &&
                            detectedAge <=
                            candidate.maximumAge
                    )

            duration =
                profile?.[
                    competitionFormat
                    ] ?? null
        }

        if (!duration) {
            explanation.push(
                'No verified automatic duration profile is available for this country and age combination.'
            )

            return {
                detectedSport,
                detectedAges,
                mixedAgeCategories,
                countryCode,
                countryName,
                countrySource,
                governingBody:
                resolvedGoverningBody,
                confidence: 0.45,
                explanation,
                requiresOverride: true,
                rules: null,
            }
        }

        const normalMatchDurationMinutes =
            duration.periodCount *
            duration.minutesPerPeriod

        const extraTimeEnabled =
            competitionFormat ===
            'knockout' &&
            duration.extraTimeMinutes > 0

        const scheduledFixtureDurationMinutes =
            normalMatchDurationMinutes +
            (
                extraTimeEnabled
                    ? duration.extraTimeMinutes
                    : 0
            )

        explanation.push(
            `${duration.periodCount} × ${duration.minutesPerPeriod} minutes is the recommended normal match duration.`
        )

        if (extraTimeEnabled) {
            explanation.push(
                `${duration.extraTimeMinutes} minutes of possible extra time is reserved for knockout scheduling.`
            )
        }

        return {
            detectedSport,
            detectedAges,
            mixedAgeCategories,
            countryCode,
            countryName,
            countrySource,
            governingBody:
            resolvedGoverningBody,
            confidence:
                countrySource === 'organisation' ||
                countrySource === 'competition' ||
                countrySource === 'venue'
                    ? 0.98
                    : countrySource === 'ip'
                        ? 0.9
                        : 0.78,
            explanation,
            requiresOverride: false,
            rules: {
                sport: detectedSport,
                sportLabel:
                    SPORT_LABELS[detectedSport],
                countryCode,
                countryName,
                governingBody:
                resolvedGoverningBody,
                detectedAge,
                ageLabel:
                    isAdult
                        ? 'Adult'
                        : `Under ${detectedAge}`,
                isAdult,
                competitionFormat,
                periodCount:
                duration.periodCount,
                minutesPerPeriod:
                duration.minutesPerPeriod,
                normalMatchDurationMinutes,
                extraTimeEnabled,
                extraTimeMinutes:
                    extraTimeEnabled
                        ? duration.extraTimeMinutes
                        : 0,
                scheduledFixtureDurationMinutes,
                minimumSameVenueStartIntervalMinutes:
                scheduledFixtureDurationMinutes,
                defaultDaysBetweenRounds: 7,
            },
        }
    }
}