import { ArticleCard } from '../../ArticleCard'
import { Section } from '../../Section'
import type { Article } from '../../../data/festivalData'
import type { PublicArticle } from '../../../services/public/organisationPublicService'

export type ArticlesSectionProps = {
    isBhmff: boolean
    organisationName: string
    basePath: string
    articles: PublicArticle[]
    publicArticles: Article[]
    articlesLoading: boolean
    articlesError: string | null
    onReadArticle: (articleId: string) => void
    surfaceColour: string
    textColour: string
    accentColour: string
}

function getPublicString(
    value: PublicArticle,
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

export function ArticlesSection({
                                    isBhmff,
                                    organisationName,
                                    basePath,
                                    articles,
                                    publicArticles,
                                    articlesLoading,
                                    articlesError,
                                    onReadArticle,
                                    surfaceColour,
                                    textColour,
                                    accentColour,
                                }: ArticlesSectionProps) {
    const sectionTitle = isBhmff ? 'Black History Hub' : 'News & Updates'

    const sectionIntro = isBhmff
        ? 'Connecting the football festival to Black History Month through articles, community stories and learning content.'
        : `Latest news, announcements and community updates from ${organisationName}.`

    return (
        <Section
            id="history"
            title={sectionTitle}
            intro={sectionIntro}
        >
            {isBhmff ? (
                <>
                    {articlesLoading && (
                        <div
                            className="rounded-2xl border p-8 text-center"
                            style={{
                                backgroundColor: surfaceColour,
                                borderColor: `${accentColour}30`,
                                color: textColour,
                            }}
                        >
                            <p className="text-sm font-semibold opacity-75">
                                Loading articles...
                            </p>
                        </div>
                    )}

                    {articlesError && (
                        <div
                            className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm font-semibold text-red-700"
                            role="alert"
                        >
                            {articlesError}
                        </div>
                    )}

                    {!articlesLoading &&
                        !articlesError &&
                        publicArticles.length > 0 && (
                            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                                {publicArticles.map((article) => (
                                    <ArticleCard
                                        key={article.id}
                                        article={article}
                                        onRead={onReadArticle}
                                    />
                                ))}
                            </div>
                        )}

                    {!articlesLoading &&
                        !articlesError &&
                        publicArticles.length === 0 && (
                            <div
                                className="rounded-2xl border p-8 text-center"
                                style={{
                                    backgroundColor: surfaceColour,
                                    borderColor: `${accentColour}30`,
                                    color: textColour,
                                }}
                            >
                                <h3 className="text-lg font-black">
                                    Articles coming soon
                                </h3>

                                <p className="mt-2 text-sm opacity-70">
                                    Published stories and learning content will
                                    appear here.
                                </p>
                            </div>
                        )}
                </>
            ) : articles.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {articles.map((article) => {
                        const title =
                            getPublicString(article, ['title']) ||
                            'Competition update'

                        const summary =
                            getPublicString(article, ['summary', 'excerpt']) ||
                            'Read the latest update from the organiser.'

                        const category =
                            getPublicString(article, ['category']) || 'News'

                        const imageUrl = getPublicString(article, [
                            'image_url',
                            'hero',
                        ])

                        const imageAlt =
                            getPublicString(article, ['image_alt']) || title

                        return (
                            <article
                                key={article.id}
                                className="overflow-hidden rounded-2xl border shadow-sm"
                                style={{
                                    backgroundColor: surfaceColour,
                                    borderColor: `${accentColour}30`,
                                    color: textColour,
                                }}
                            >
                                {imageUrl && (
                                    <img
                                        src={imageUrl}
                                        alt={imageAlt}
                                        className="aspect-[16/10] w-full object-cover"
                                        loading="lazy"
                                    />
                                )}

                                <div className="p-5">
                                    <span
                                        className="inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide"
                                        style={{
                                            backgroundColor: `${accentColour}18`,
                                            color: accentColour,
                                        }}
                                    >
                                        {category}
                                    </span>

                                    <h3 className="mt-4 text-xl font-black leading-tight">
                                        {title}
                                    </h3>

                                    <p className="mt-3 text-sm leading-6 opacity-75">
                                        {summary}
                                    </p>

                                    <a
                                        href={`${basePath}/news`}
                                        className="mt-5 inline-flex text-sm font-black no-underline transition-opacity hover:opacity-75"
                                        style={{ color: accentColour }}
                                    >
                                        Read article →
                                    </a>
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
                    <h3 className="text-lg font-black">News coming soon</h3>

                    <p className="mt-2 text-sm opacity-70">
                        Published articles and organiser updates will appear
                        here.
                    </p>
                </div>
            )}
        </Section>
    )
}