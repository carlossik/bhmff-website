import type { Article } from '../data/festivalData'

type Props = {
    article: Article
    onRead: (id: string) => void
}

export function ArticleCard({
                                article,
                                onRead,
                            }: Props) {
    return (
        <article className="card articleCard">

            {article.imageUrl && (
                <img
                    className="articleCardImage"
                    src={article.imageUrl}
                    alt={article.imageAlt ?? article.title}
                />
            )}

            <span className="badge">
                {article.category}
            </span>

            {article.featured && (
                <span className="featuredBadge">
                    ★ Featured
                </span>
            )}

            <h3>{article.title}</h3>

            <p>{article.summary}</p>

            <div className="articleMeta">

                {article.publishedAt && (
                    <span>
                        {new Date(article.publishedAt).toLocaleDateString(
                            'en-GB',
                            {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            }
                        )}
                    </span>
                )}

                <span>{article.readTime}</span>

                <span>{article.author}</span>

            </div>

            <button
                type="button"
                className="textButton"
                onClick={() => onRead(article.id)}
            >
                Read article →
            </button>

        </article>
    )
}