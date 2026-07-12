import { useEffect, useState } from 'react'

import { supabase } from '../lib/supabaseClient'
import {
    articles as fallbackArticles,
    type Article,
    type ArticleAction,
    type ArticleCategory,
    type ArticleStatus,
} from '../data/festivalData'

type ArticleRow = {
    id: string
    slug: string
    title: string
    category: string
    status: string
    summary: string
    hero: string
    read_time: string
    body: string[] | null
    author: string
    published_at: string | null
    featured: boolean | null
    image_url: string | null
    image_alt: string | null
    tags: string[] | null
    actions: ArticleAction[] | null
}

type UsePublicArticlesResult = {
    articles: Article[]
    loading: boolean
    error: string | null
}

function mapArticleRow(row: ArticleRow): Article {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        category: row.category as ArticleCategory,
        status: row.status as ArticleStatus,
        summary: row.summary,
        hero: row.hero,
        readTime: row.read_time,
        body: row.body ?? [],
        author: row.author,
        publishedAt: row.published_at,
        featured: row.featured ?? false,
        imageUrl: row.image_url ?? undefined,
        imageAlt: row.image_alt ?? undefined,
        tags: row.tags ?? [],
        actions: row.actions ?? [],
    }
}

export function usePublicArticles(): UsePublicArticlesResult {
    const [articles, setArticles] =
        useState<Article[]>(fallbackArticles)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        async function loadArticles() {
            const { data, error: queryError } = await supabase
                .from('articles')
                .select(`
                    id,
                    slug,
                    title,
                    category,
                    status,
                    summary,
                    hero,
                    read_time,
                    body,
                    author,
                    published_at,
                    featured,
                    image_url,
                    image_alt,
                    tags,
                    actions
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
                    'Failed to load public articles:',
                    queryError
                )

                setArticles(
                    fallbackArticles.filter(
                        (article) =>
                            article.status === 'published'
                    )
                )
                setError(
                    'Live articles could not be loaded. Showing the current published content instead.'
                )
                setLoading(false)
                return
            }

            const mappedArticles = (
                (data ?? []) as ArticleRow[]
            ).map(mapArticleRow)

            setArticles(mappedArticles)
            setError(null)
            setLoading(false)
        }

        void loadArticles()

        return () => {
            isMounted = false
        }
    }, [])

    return {
        articles,
        loading,
        error,
    }
}