import type { PublicMediaItem } from '../../../services/public/organisationPublicService'
import { Section } from '../../Section'
import { usePublicOrganisation } from '../../../context/PublicOrganisationContext'
import { MediaPlayer } from '../MediaPlayer'

export type MediaSectionProps = {
    media: PublicMediaItem[]
    organisationName: string
    accentColour: string
    surfaceColour: string
    textColour: string
}

function getPublicString(
    value: PublicMediaItem,
    keys: readonly string[],
): string {
    const record = value as Record<string, unknown>

    for (const key of keys) {
        const candidate = record[key]

        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim()
        }
    }

    return ''
}

function getPublicBoolean(
    value: PublicMediaItem,
    keys: readonly string[],
): boolean {
    const record = value as Record<string, unknown>

    for (const key of keys) {
        const candidate = record[key]

        if (typeof candidate === 'boolean') {
            return candidate
        }
    }

    return false
}

export function MediaSection({
                                 media,
                                 organisationName,
                                 accentColour,
                                 surfaceColour,
                                 textColour,
                             }: MediaSectionProps) {
    const publicOrganisation = usePublicOrganisation()
    const basePath = publicOrganisation?.basePath || ''
    return (
        <Section
            id="media"
            title="Official Media Coverage"
            intro={`Featured matches, highlights, interviews and organiser updates from ${organisationName}.`}
        >
            {media.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {media.map((item) => {
                        const embedUrl = getPublicString(item, ['embed_url'])
                        const imageUrl = getPublicString(item, [
                            'thumbnail_url',
                            'image_url',
                        ])
                        const title =
                            getPublicString(item, ['title']) ||
                            'Competition media'
                        const description =
                            getPublicString(item, ['description']) ||
                            'Official tournament media coverage.'
                        const mediaType =
                            getPublicString(item, [
                                'media_type',
                                'category',
                            ]) || 'Media'
                        const mediaUrl = getPublicString(item, [
                            'media_url',
                            'url',
                            'youtube_url',
                        ])
                        const featured = getPublicBoolean(item, ['featured'])

                        return (
                            <article
                                key={item.id}
                                className="overflow-hidden rounded-2xl border shadow-sm"
                                style={{
                                    backgroundColor: surfaceColour,
                                    borderColor: featured
                                        ? accentColour
                                        : `${accentColour}30`,
                                    color: textColour,
                                }}
                            >
                                <MediaPlayer url={item.category === 'Photo Gallery' ? '' : mediaUrl || embedUrl} thumbnail={imageUrl} title={title} />
                                <div className="p-5">
                                    <div className="flex flex-wrap gap-2">
                                        <span
                                            className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide"
                                            style={{
                                                backgroundColor: `${accentColour}18`,
                                                color: accentColour,
                                            }}
                                        >
                                            {mediaType}
                                        </span>

                                        {featured && (
                                            <span
                                                className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide"
                                                style={{
                                                    backgroundColor: accentColour,
                                                    color: '#ffffff',
                                                }}
                                            >
                                                Featured
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="mt-4 text-xl font-black leading-tight">
                                        {title}
                                    </h3>

                                    <p className="mt-3 text-sm leading-6 opacity-75">
                                        {description}
                                    </p>

                                    {item.id && (
                                        <a
                                            href={`${basePath}/media/${item.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-5 inline-flex rounded-xl border px-4 py-2 text-sm font-black no-underline transition-opacity hover:opacity-80"
                                            style={{
                                                borderColor: `${accentColour}55`,
                                                color: accentColour,
                                            }}
                                        >
                                            View and share media
                                        </a>
                                    )}
                                </div>
                            </article>
                        )
                    })}
                </div>
            ) : (
                <div
                    className="rounded-2xl border p-8 text-center"
                    style={{
                        backgroundColor: surfaceColour,
                        borderColor: `${accentColour}30`,
                        color: textColour,
                    }}
                >
                    <h3 className="text-lg font-black">
                        Media coverage coming soon
                    </h3>

                    <p className="mt-2 text-sm opacity-70">
                        Published highlights, interviews and livestreams will
                        appear here.
                    </p>
                </div>
            )}
        </Section>
    )
}