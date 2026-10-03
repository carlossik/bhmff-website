import { useNavigate } from 'react-router-dom'
import { usePublicArticles } from '../../hooks/usePublicArticles'
import { ArticlePage } from '../../components/ArticlePage'

export function PublicArticlePage({ articleKey, basePath }: { articleKey: string; basePath: string }) {
    const { articles, loading, error } = usePublicArticles()
    const navigate = useNavigate()
    if (loading) return <main className="container" role="status">Loading article...</main>
    if (error) return <main className="container" role="alert">{error}</main>
    const article = articles.find(item => item.id === articleKey || item.slug === articleKey)
    if (!article) return <main className="container"><h1>Article unavailable</h1><p>This article may have been removed or is not published.</p><a href={`${basePath || '/'}#history`}>View published articles</a></main>
    return <ArticlePage article={article} onBack={() => navigate(`${basePath || '/'}#history`)} />
}
