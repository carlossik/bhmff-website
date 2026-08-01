import type {
    ArticleAction,
    ArticleCategory,
    ArticleStatus,
} from "../../../data/festivalData";

export type DbArticle = {
    id: string;
    organisation_id: string;
    slug: string;
    title: string;
    category: ArticleCategory;
    status: ArticleStatus;
    summary: string;
    hero: string;
    read_time: string;
    body: string[] | string | null;
    author: string;
    published_at: string | null;
    featured: boolean;
    image_url: string | null;
    image_alt: string | null;
    tags: string[] | string | null;
    actions: ArticleAction[] | string | null;
    created_at: string;
    updated_at: string;
};

type ArticlesTableProps = {
    loading: boolean;
    organisationName: string;
    articles: DbArticle[];
    onEdit: (article: DbArticle) => void;
    onPublish: (article: DbArticle) => void;
    onUnpublish: (article: DbArticle) => void;
    onArchive: (article: DbArticle) => void;
    onDelete: (article: DbArticle) => void;
};

export default function ArticlesTable({
                                          loading,
                                          organisationName,
                                          articles,
                                          onEdit,
                                          onPublish,
                                          onUnpublish,
                                          onArchive,
                                          onDelete,
                                      }: ArticlesTableProps) {
    return (
        <div className="space-y-4">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">
                    Published Content
                </p>

                <h4 className="mt-1 text-xl font-bold text-white">
                    Current articles for{" "}
                    {organisationName}
                </h4>
            </div>

            {loading ? (
                <div className="rounded-2xl border border-lime-900/50 bg-[#0b150a] p-6 text-slate-400">
                    Loading articles...
                </div>
            ) : articles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-lime-900/60 bg-[#0b150a] p-8 text-center">
                    <h5 className="text-lg font-bold text-white">
                        No articles yet
                    </h5>

                    <p className="mt-2 text-sm text-slate-400">
                        Create the first article for{" "}
                        {organisationName}.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {articles.map((article) => (
                        <article
                            key={article.id}
                            className="grid gap-5 rounded-2xl border border-lime-900/50 bg-[#0b150a] p-5 lg:grid-cols-[140px_1fr_auto]"
                        >
                            <div className="overflow-hidden rounded-xl border border-lime-900/50 bg-black/20">
                                {article.image_url ? (
                                    <img
                                        src={article.image_url}
                                        alt={
                                            article.image_alt ??
                                            article.title
                                        }
                                        className="h-32 w-full object-cover lg:h-full"
                                    />
                                ) : (
                                    <div className="flex h-32 items-center justify-center text-sm text-slate-500 lg:h-full">
                                        No image
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0">
                                <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full border border-lime-800/60 bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-300">
                                        {article.category}
                                    </span>

                                    <span className="rounded-full border border-sky-800/60 bg-sky-400/10 px-3 py-1 text-xs font-bold capitalize text-sky-300">
                                        {article.status}
                                    </span>

                                    {article.featured && (
                                        <span className="rounded-full border border-amber-700/60 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
                                            Featured
                                        </span>
                                    )}
                                </div>

                                <h5 className="mt-4 text-xl font-black text-white">
                                    {article.title}
                                </h5>

                                <p className="mt-1 text-sm text-slate-500">
                                    /{article.slug}
                                </p>

                                <p className="mt-3 text-sm leading-6 text-slate-300">
                                    {article.summary}
                                </p>
                            </div>

                            <div className="flex flex-wrap content-start gap-2 lg:w-36 lg:flex-col">
                                <button
                                    type="button"
                                    onClick={() =>
                                        onEdit(article)
                                    }
                                    className="rounded-xl border border-lime-900/70 px-4 py-2 text-sm font-bold text-white hover:border-lime-400"
                                >
                                    Edit
                                </button>

                                {article.status !==
                                "published" ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onPublish(
                                                article,
                                            )
                                        }
                                        className="rounded-xl border border-lime-900/70 px-4 py-2 text-sm font-bold text-lime-300 hover:border-lime-400"
                                    >
                                        Publish
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onUnpublish(
                                                article,
                                            )
                                        }
                                        className="rounded-xl border border-lime-900/70 px-4 py-2 text-sm font-bold text-lime-300 hover:border-lime-400"
                                    >
                                        Unpublish
                                    </button>
                                )}

                                {article.status !==
                                    "archived" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onArchive(
                                                    article,
                                                )
                                            }
                                            className="rounded-xl border border-lime-900/70 px-4 py-2 text-sm font-bold text-slate-300 hover:border-lime-400"
                                        >
                                            Archive
                                        </button>
                                    )}

                                <button
                                    type="button"
                                    onClick={() =>
                                        onDelete(article)
                                    }
                                    className="rounded-xl border border-red-900/70 px-4 py-2 text-sm font-bold text-red-300 hover:border-red-500"
                                >
                                    Delete
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}