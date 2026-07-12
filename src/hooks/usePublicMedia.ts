import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export type PublicMediaCategory =
    | 'Match Highlights'
    | 'Full Match Replay'
    | 'Player Interview'
    | 'Coach Interview'
    | 'Livestream'
    | 'Festival Trailer'
    | 'Behind the Scenes'
    | 'Photo Gallery'
    | 'Podcast'
    | 'Sponsor Feature'

export type PublicMediaItem = {
    id: string
    title: string
    slug: string
    category: PublicMediaCategory
    description: string
    youtubeUrl: string | null
    embedUrl: string | null
    thumbnailUrl: string | null
    thumbnailAlt: string | null
    featured: boolean
    publishedAt: string | null
}

type DbMediaItem = {
    id: string
    title: string | null
    slug: string | null
    category: string | null
    description: string | null
    youtube_url: string | null
    embed_url: string | null
    thumbnail_url: string | null
    thumbnail_alt: string | null
    featured: boolean | null
    published_at: string | null
}

type UsePublicMediaResult = {
    media: PublicMediaItem[]
    loading: boolean
    error: string | null
}

function mapDbMediaItem(
    item: DbMediaItem
): PublicMediaItem {
    return {
        id: item.id,
        title: item.title ?? 'Untitled media',
        slug: item.slug ?? item.id,
        category: (
            item.category ?? 'Match Highlights'
        ) as PublicMediaCategory,
        description: item.description ?? '',
        youtubeUrl: item.youtube_url,
        embedUrl: item.embed_url,
        thumbnailUrl: item.thumbnail_url,
        thumbnailAlt: item.thumbnail_alt,
        featured: item.featured ?? false,
        publishedAt: item.published_at,
    }
}

export function usePublicMedia(): UsePublicMediaResult {
    const [media, setMedia] = useState<
        PublicMediaItem[]
    >([])

    const [loading, setLoading] =
        useState(true)

    const [error, setError] =
        useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        async function loadMedia() {
            setLoading(true)
            setError(null)

            const {
                data,
                error: queryError,
            } = await supabase
                .from('media')
                .select(`
                    id,
                    title,
                    slug,
                    category,
                    description,
                    youtube_url,
                    embed_url,
                    thumbnail_url,
                    thumbnail_alt,
                    featured,
                    published_at
                `)
                .eq('status', 'published')
                .order('featured', {
                    ascending: false,
                })
                .order('published_at', {
                    ascending: false,
                    nullsFirst: false,
                })

            if (!isMounted) {
                return
            }

            if (queryError) {
                console.error(
                    'Failed to load public media:',
                    queryError
                )

                setMedia([])
                setError(
                    'Unable to load festival media.'
                )
                setLoading(false)
                return
            }

            setMedia(
                ((data ?? []) as DbMediaItem[]).map(
                    mapDbMediaItem
                )
            )

            setLoading(false)
        }

        void loadMedia()

        return () => {
            isMounted = false
        }
    }, [])

    return {
        media,
        loading,
        error,
    }
}