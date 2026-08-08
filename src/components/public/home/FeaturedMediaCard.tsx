import { Camera } from 'lucide-react'

import type { PublicMediaItem } from '../../../services/public/organisationPublicService'

export type FeaturedMediaCardProps = {
    mediaItem?: PublicMediaItem | null
    organisationName: string
    surfaceColour: string
    accentColour: string
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

export function FeaturedMediaCard({
                                      mediaItem,
                                      organisationName,
                                      surfaceColour,
                                      accentColour,
                                  }: FeaturedMediaCardProps) {
    const embedUrl = mediaItem
        ? getPublicString(mediaItem, ['embed_url'])
        : ''

    const imageUrl = mediaItem
        ? getPublicString(mediaItem, ['thumbnail_url', 'image_url'])
        : ''

    const mediaTitle = mediaItem
        ? getPublicString(mediaItem, ['title'])
        : ''

    const accessibleTitle =
        mediaTitle || `${organisationName} featured media`

    return (
        <article
            className="overflow-hidden rounded-2xl border p-3 shadow-sm"
            style={{
                backgroundColor: surfaceColour,
                borderColor: `${accentColour}35`,
            }}
        >
            {embedUrl ? (
                <iframe
                    className="aspect-video w-full rounded-xl border-0"
                    src={embedUrl}
                    title={accessibleTitle}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                />
            ) : imageUrl ? (
                <img
                    className="aspect-video w-full rounded-xl object-cover"
                    src={imageUrl}
                    alt={accessibleTitle}
                    loading="lazy"
                />
            ) : (
                <div
                    className="grid aspect-video w-full place-items-center rounded-xl border px-6 text-center"
                    style={{ borderColor: `${accentColour}25` }}
                >
                    <div>
                        <Camera
                            aria-hidden="true"
                            className="mx-auto h-8 w-8"
                            style={{ color: accentColour }}
                        />

                        <p className="mt-3 text-sm font-bold sm:text-base">
                            Published competition media will appear here.
                        </p>
                    </div>
                </div>
            )}
        </article>
    )
}