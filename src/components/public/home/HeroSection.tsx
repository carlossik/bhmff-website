import type { CSSProperties } from 'react'

import type { Competition } from '../../../types/competitionTypes'
import type { PublicMediaItem } from '../../../services/public/organisationPublicService'
import { Hero } from '../../Hero'
import { TournamentCountdown } from '../TournamentCountdown'
import { useOptionalPublicOrganisation } from '../../../context/PublicOrganisationContext'

type HeroSectionProps = {
    organisationName: string
    backgroundColour: string
    surfaceColour: string
    textColour: string
    accentColour: string
    accentTextColour: string
    basePath: string
    competitions?: Competition[]
    media?: PublicMediaItem[]
}

function getPublicString(
    value: Record<string, unknown>,
    keys: readonly string[],
): string {
    for (const key of keys) {
        const candidate = value[key]

        if (
            typeof candidate === 'string' &&
            candidate.trim()
        ) {
            return candidate.trim()
        }
    }

    return ''
}

function getPublicBoolean(
    value: Record<string, unknown>,
    keys: readonly string[],
): boolean {
    for (const key of keys) {
        const candidate = value[key]

        if (typeof candidate === 'boolean') {
            return candidate
        }
    }

    return false
}

function formatCompetitionStartDate(
    value: string,
): string | null {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return null
    }

    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date)
}

function getOrganisationTitleClasses(
    organisationName: string,
): string {
    const length = organisationName.trim().length

    if (length >= 34) {
        return 'text-3xl sm:text-4xl lg:text-5xl'
    }

    if (length >= 22) {
        return 'text-4xl sm:text-4xl lg:text-5xl'
    }

    return 'text-4xl sm:text-5xl lg:text-5xl xl:text-6xl'
}

export function HeroSection({
                                organisationName,
                                backgroundColour,
                                surfaceColour,
                                textColour,
                                accentColour,
                                accentTextColour,
                                basePath,
                                competitions = [],
                                media = [],
                            }: HeroSectionProps) {
    const publicOrganisation =
        useOptionalPublicOrganisation()

    const organisationSlug =
        publicOrganisation?.organisationSlug
            ?.trim()
            .toLowerCase() ?? ''

    const isBhmff = organisationSlug === 'bhmff'

    if (isBhmff) {
        return (
            <>
                <TournamentCountdown />
                <Hero />
            </>
        )
    }

    const primaryCompetition =
        competitions[0] as
            | (Competition & Record<string, unknown>)
            | undefined

    const competitionName =
        primaryCompetition &&
        typeof primaryCompetition.name === 'string' &&
        primaryCompetition.name.trim()
            ? primaryCompetition.name.trim()
            : organisationName

    const competitionDescription =
        primaryCompetition &&
        typeof primaryCompetition.description === 'string' &&
        primaryCompetition.description.trim()
            ? primaryCompetition.description.trim()
            : `Welcome to the official ${organisationName} competition website. Follow teams, fixtures, results, tables, news and media as they are published.`

    const competitionStartDate =
        primaryCompetition &&
        typeof primaryCompetition.start_date === 'string'
            ? formatCompetitionStartDate(
                primaryCompetition.start_date,
            )
            : null

    const featuredMedia =
        media.find((item) =>
            getPublicBoolean(item, ['featured']),
        ) ?? media[0]

    const featuredEmbedUrl = featuredMedia
        ? getPublicString(featuredMedia, ['embed_url'])
        : ''

    const featuredImageUrl = featuredMedia
        ? getPublicString(featuredMedia, [
            'thumbnail_url',
            'image_url',
        ])
        : ''

    const featuredTitle = featuredMedia
        ? getPublicString(featuredMedia, ['title']) ||
        `${organisationName} featured media`
        : `${organisationName} featured media`

    const hasFeaturedMedia = Boolean(
        featuredEmbedUrl || featuredImageUrl,
    )

    const titleClasses =
        getOrganisationTitleClasses(
            organisationName,
        )

    return (
        <>
            {competitionStartDate && (
                <section
                    className="border-b py-6 text-center sm:py-8 lg:py-9"
                    style={{
                        background: `linear-gradient(90deg, ${accentColour}18, ${accentColour}30, ${accentColour}18)`,
                        borderColor: `${accentColour}35`,
                        color: textColour,
                    }}
                    aria-labelledby="upcoming-competition-title"
                >
                    <div className="mx-auto w-[min(1180px,calc(100%-2rem))]">
                        <p
                            className="text-[0.68rem] font-black uppercase tracking-[0.2em] sm:text-xs"
                            style={{ color: accentColour }}
                        >
                            Upcoming competition
                        </p>

                        <h2
                            id="upcoming-competition-title"
                            className="mt-2 break-words text-2xl font-black uppercase tracking-[-0.03em] sm:mt-3 sm:text-3xl lg:text-4xl"
                        >
                            {competitionName}
                        </h2>

                        <p className="mt-2 text-xs opacity-75 sm:mt-3 sm:text-sm">
                            Starts {competitionStartDate}
                        </p>
                    </div>
                </section>
            )}

            <section
                className="border-b py-11 sm:py-14 lg:py-16 xl:py-20"
                style={{
                    background: `radial-gradient(circle at 78% 30%, ${accentColour}20, transparent 30%), ${backgroundColour}`,
                    borderColor: `${accentColour}25`,
                    color: textColour,
                }}
                aria-labelledby="public-home-hero-title"
            >
                <div
                    className={[
                        'mx-auto w-[min(1180px,calc(100%-2rem))] items-center',
                        hasFeaturedMedia
                            ? 'grid gap-9 lg:grid-cols-2 lg:gap-12'
                            : 'max-w-5xl',
                    ].join(' ')}
                >
                    <div>
                        <p
                            className="text-[0.68rem] font-black uppercase tracking-[0.2em] sm:text-xs"
                            style={{ color: accentColour }}
                        >
                            Official competition website
                        </p>

                        <h1
                            id="public-home-hero-title"
                            className={[
                                'mt-4 max-w-[15ch] break-words font-normal uppercase leading-[0.98] tracking-[-0.025em]',
                                titleClasses,
                            ].join(' ')}
                        >
                            {organisationName}
                        </h1>

                        <p
                            className="mt-4 text-[0.68rem] font-black uppercase tracking-[0.18em] sm:text-xs"
                            style={{ color: accentColour }}
                        >
                            Powered by TournamentHQ
                        </p>

                        <p
                            className={[
                                'mt-6 text-base leading-7 opacity-75 sm:text-lg sm:leading-8',
                                hasFeaturedMedia
                                    ? 'max-w-2xl'
                                    : 'max-w-3xl',
                            ].join(' ')}
                        >
                            {competitionDescription}
                        </p>

                        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            <a
                                href={`${basePath}#teams`}
                                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-black uppercase no-underline transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
                                style={{
                                    background: accentColour,
                                    color: accentTextColour,
                                    '--tw-ring-color': accentColour,
                                    '--tw-ring-offset-color': backgroundColour,
                                } as CSSProperties}
                            >
                                View Teams
                            </a>

                            <a
                                href={`${basePath}#fixtures`}
                                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border px-5 py-3 text-sm font-black uppercase no-underline transition-colors duration-200 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
                                style={{
                                    borderColor: `${accentColour}55`,
                                    color: textColour,
                                    '--tw-ring-color': accentColour,
                                    '--tw-ring-offset-color': backgroundColour,
                                } as CSSProperties}
                            >
                                Fixtures
                            </a>
                        </div>
                    </div>

                    {hasFeaturedMedia && (
                        <article
                            className="overflow-hidden rounded-2xl border p-2 shadow-sm sm:p-3"
                            style={{
                                background: surfaceColour,
                                borderColor: `${accentColour}35`,
                            }}
                            aria-label="Featured competition media"
                        >
                            {featuredEmbedUrl ? (
                                <iframe
                                    className="aspect-video w-full rounded-xl"
                                    src={featuredEmbedUrl}
                                    title={featuredTitle}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    loading="lazy"
                                />
                            ) : (
                                <img
                                    className="aspect-video w-full rounded-xl object-cover"
                                    src={featuredImageUrl}
                                    alt={featuredTitle}
                                    loading="eager"
                                    decoding="async"
                                />
                            )}
                        </article>
                    )}
                </div>
            </section>
        </>
    )
}