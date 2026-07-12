import {
    ArrowLeft,
    ExternalLink,
} from 'lucide-react'
import type { Article } from '../data/festivalData'

type ArticlePageProps = {
    article: Article
    onBack: () => void
}

export function ArticlePage({
                                article,
                                onBack,
                            }: ArticlePageProps) {
    const paragraphs = Array.isArray(
        article.body
    )
        ? article.body
        : []

    const tags = Array.isArray(
        article.tags
    )
        ? article.tags
        : []

    const actions = Array.isArray(
        article.actions
    )
        ? article.actions
        : []

    return (
        <main className="articlePage">
            <div className="container">
                <button
                    className="backButton"
                    type="button"
                    onClick={onBack}
                >
                    <ArrowLeft size={18} />
                    Back to festival site
                </button>

                <article className="articleShell">
                    <div className="articleBadgeRow">
                        <span className="badge">
                            {article.category}
                        </span>

                        {article.featured && (
                            <span className="badge featuredBadge">
                                Featured
                            </span>
                        )}
                    </div>

                    <h1>{article.title}</h1>

                    <p className="articleHero">
                        {article.hero}
                    </p>

                    <div className="articleMeta">
                        <span>
                            {article.author}
                        </span>

                        <span>
                            {article.readTime}
                        </span>

                        {article.publishedAt && (
                            <span>
                                {new Date(
                                    article.publishedAt
                                ).toLocaleDateString(
                                    'en-GB',
                                    {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    }
                                )}
                            </span>
                        )}
                    </div>

                    {article.imageUrl && (
                        <img
                            className="articleHeroImage"
                            src={article.imageUrl}
                            alt={
                                article.imageAlt ??
                                article.title
                            }
                        />
                    )}

                    <div className="articleBody">
                        {paragraphs.length ? (
                            paragraphs.map(
                                (
                                    paragraph,
                                    index
                                ) => (
                                    <p
                                        key={`${article.id}-${index}`}
                                    >
                                        {paragraph}
                                    </p>
                                )
                            )
                        ) : (
                            <p>
                                Article content is
                                currently unavailable.
                            </p>
                        )}
                    </div>

                    {tags.length > 0 && (
                        <section className="articleTags">
                            <h2>Topics</h2>

                            <div className="tagList">
                                {tags.map((tag) => (
                                    <span
                                        className="articleTag"
                                        key={tag}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {actions.length > 0 && (
                        <section className="articleActions">
                            <h2>
                                Further reading
                            </h2>

                            <div className="articleActionLinks">
                                {actions.map(
                                    (action) => (
                                        <a
                                            key={
                                                action.href
                                            }
                                            className="btn secondary"
                                            href={
                                                action.href
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {
                                                action.label
                                            }

                                            <ExternalLink
                                                size={
                                                    16
                                                }
                                            />
                                        </a>
                                    )
                                )}
                            </div>
                        </section>
                    )}
                </article>
            </div>
        </main>
    )
}