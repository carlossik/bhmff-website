export type CountryResolutionSource =
    | 'organisation'
    | 'competition'
    | 'venue'
    | 'browser'
    | 'ip'
    | 'fallback'

export type CountryResolution = {
    countryCode: string
    countryName: string
    governingBody: string | null
    source: CountryResolutionSource
    confidence: number
}

type ResolveCountryParams = {
    organisation?: unknown
    competition?: unknown
    venues?: unknown[]
}

const COUNTRY_NAME_BY_CODE: Record<string, string> = {
    GB: 'United Kingdom',
    IE: 'Ireland',
    US: 'United States',
    CA: 'Canada',
    AU: 'Australia',
    NZ: 'New Zealand',
    GH: 'Ghana',
    NG: 'Nigeria',
    ZA: 'South Africa',
}

const FOOTBALL_GOVERNING_BODY_BY_CODE: Record<string, string> = {
    GB: 'The Football Association',
    IE: 'Football Association of Ireland',
    US: 'US Soccer',
    CA: 'Canada Soccer',
    AU: 'Football Australia',
    NZ: 'New Zealand Football',
    GH: 'Ghana Football Association',
    NG: 'Nigeria Football Federation',
    ZA: 'South African Football Association',
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {}
}

function normaliseCountryCode(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }

    const trimmed = value.trim()

    if (/^[A-Za-z]{2}$/.test(trimmed)) {
        return trimmed.toUpperCase()
    }

    const lowered = trimmed.toLowerCase()

    const aliases: Record<string, string> = {
        england: 'GB',
        uk: 'GB',
        'united kingdom': 'GB',
        britain: 'GB',
        'great britain': 'GB',
        ireland: 'IE',
        'united states': 'US',
        usa: 'US',
        canada: 'CA',
        australia: 'AU',
        'new zealand': 'NZ',
        ghana: 'GH',
        nigeria: 'NG',
        'south africa': 'ZA',
    }

    return aliases[lowered] ?? null
}

function findCountryCode(value: unknown): string | null {
    const record = asRecord(value)

    const directCandidates = [
        record.country_code,
        record.countryCode,
        record.country,
        record.country_name,
        record.countryName,
    ]

    for (const candidate of directCandidates) {
        const countryCode = normaliseCountryCode(candidate)

        if (countryCode) {
            return countryCode
        }
    }

    const address = asRecord(record.address)

    return (
        normaliseCountryCode(address.country_code) ??
        normaliseCountryCode(address.countryCode) ??
        normaliseCountryCode(address.country)
    )
}

function createResolution(
    countryCode: string,
    source: CountryResolutionSource,
    confidence: number,
    countryName?: string
): CountryResolution {
    return {
        countryCode,
        countryName:
            countryName ??
            COUNTRY_NAME_BY_CODE[countryCode] ??
            countryCode,
        governingBody:
            FOOTBALL_GOVERNING_BODY_BY_CODE[countryCode] ??
            null,
        source,
        confidence,
    }
}

export class CompetitionCountryResolver {
    static async resolve({
                             organisation,
                             competition,
                             venues = [],
                         }: ResolveCountryParams): Promise<CountryResolution> {
        const organisationCountry =
            findCountryCode(organisation)

        if (organisationCountry) {
            return createResolution(
                organisationCountry,
                'organisation',
                0.99
            )
        }

        const competitionCountry =
            findCountryCode(competition)

        if (competitionCountry) {
            return createResolution(
                competitionCountry,
                'competition',
                0.98
            )
        }

        for (const venue of venues) {
            const venueCountry =
                findCountryCode(venue)

            if (venueCountry) {
                return createResolution(
                    venueCountry,
                    'venue',
                    0.95
                )
            }
        }

        const browserLocale =
            typeof navigator !== 'undefined'
                ? navigator.language
                : ''

        const localeCountry =
            browserLocale
                .split('-')[1]
                ?.toUpperCase()

        if (
            localeCountry &&
            /^[A-Z]{2}$/.test(localeCountry)
        ) {
            return createResolution(
                localeCountry,
                'browser',
                0.7
            )
        }

        try {
            const response = await fetch(
                'https://ipapi.co/json/',
                {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                    },
                }
            )

            if (response.ok) {
                const data =
                    await response.json() as {
                        country_code?: string
                        country_name?: string
                    }

                const countryCode =
                    normaliseCountryCode(
                        data.country_code
                    )

                if (countryCode) {
                    return createResolution(
                        countryCode,
                        'ip',
                        0.85,
                        data.country_name
                    )
                }
            }
        } catch (error) {
            console.warn(
                'IP country detection was unavailable.',
                error
            )
        }

        // TournamentHQ currently operates from the UK. This fallback is
        // clearly labelled and still requires a one-click confirmation.
        return createResolution(
            'GB',
            'fallback',
            0.4
        )
    }
}