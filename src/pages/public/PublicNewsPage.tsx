import {
    useMemo,
    useState,
} from "react";

import {
    ArrowRight,
    CalendarDays,
    Newspaper,
    Search,
    Star,
} from "lucide-react";

import type {
    PublicArticle,
} from "../../services/public/organisationPublicService";

type PublicNewsPageProps = {
    organisationName: string;
    articles?: PublicArticle[];
    backgroundColour: string;
    surfaceColour: string;
    textColour: string;
    accentColour: string;
    accentTextColour: string;
    basePath: string;
};

type ArticleViewModel = {
    id: string;
    title: string;
    slug: string;
    summary: string;
    category: string;
    author: string;
    imageUrl: string;
    publishedAt: string;
    featured: boolean;
};

function getString(
    article: PublicArticle,
    keys: string[],
) {
    for (const key of keys) {
        const value =
            article[key];

        if (
            typeof value === "string" &&
            value.trim()
        ) {
            return value.trim();
        }
    }

    return "";
}

function getBoolean(
    article: PublicArticle,
    keys: string[],
) {
    for (const key of keys) {
        const value =
            article[key];

        if (
            typeof value === "boolean"
        ) {
            return value;
        }
    }

    return false;
}

function mapArticle(
    article: PublicArticle,
): ArticleViewModel {
    return {
        id: article.id,
        title:
            getString(article, [
                "title",
            ]) ||
            "Competition update",
        slug:
            getString(article, [
                "slug",
            ]) ||
            article.id,
        summary:
            getString(article, [
                "summary",
                "excerpt",
                "hero",
                "content",
            ]) ||
            "Read the latest update from the competition organiser.",
        category:
            getString(article, [
                "category",
            ]) ||
            "Competition News",
        author:
            getString(article, [
                "author",
            ]) ||
            "Editorial Team",
        imageUrl:
            getString(article, [
                "image_url",
                "featured_image_url",
                "hero_image_url",
            ]),
        publishedAt:
            getString(article, [
                "published_at",
                "created_at",
            ]),
        featured:
            getBoolean(article, [
                "featured",
            ]),
    };
}

function formatDate(
    value: string,
) {
    if (!value) {
        return "Date unavailable";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "Date unavailable";
    }

    return new Intl.DateTimeFormat(
        "en-GB",
        {
            day: "numeric",
            month: "long",
            year: "numeric",
        },
    ).format(date);
}

function createArticleHref(
    basePath: string,
    slug: string,
) {
    return `${basePath}/news/${encodeURIComponent(
        slug,
    )}`;
}

export function PublicNewsPage({
                                   organisationName,
                                   articles = [],
                                   backgroundColour,
                                   surfaceColour,
                                   textColour,
                                   accentColour,
                                   accentTextColour,
                                   basePath,
                               }: PublicNewsPageProps) {
    const [searchTerm, setSearchTerm] =
        useState("");

    const [
        selectedCategory,
        setSelectedCategory,
    ] = useState("all");

    const articleModels =
        useMemo(
            () =>
                articles
                    .map(
                        mapArticle,
                    )
                    .sort(
                        (
                            first,
                            second,
                        ) =>
                            new Date(
                                second.publishedAt,
                            ).getTime() -
                            new Date(
                                first.publishedAt,
                            ).getTime(),
                    ),
            [articles],
        );

    const categories =
        useMemo(
            () => [
                "all",
                ...Array.from(
                    new Set(
                        articleModels.map(
                            (
                                article,
                            ) =>
                                article.category,
                        ),
                    ),
                ),
            ],
            [articleModels],
        );

    const filteredArticles =
        useMemo(() => {
            const normalisedSearch =
                searchTerm
                    .trim()
                    .toLowerCase();

            return articleModels.filter(
                (article) => {
                    const categoryMatches =
                        selectedCategory ===
                        "all" ||
                        article.category ===
                        selectedCategory;

                    const searchMatches =
                        !normalisedSearch ||
                        article.title
                            .toLowerCase()
                            .includes(
                                normalisedSearch,
                            ) ||
                        article.summary
                            .toLowerCase()
                            .includes(
                                normalisedSearch,
                            ) ||
                        article.author
                            .toLowerCase()
                            .includes(
                                normalisedSearch,
                            );

                    return (
                        categoryMatches &&
                        searchMatches
                    );
                },
            );
        }, [
            articleModels,
            searchTerm,
            selectedCategory,
        ]);

    const featuredArticle =
        useMemo(
            () =>
                articleModels.find(
                    (article) =>
                        article.featured,
                ) ??
                articleModels[0] ??
                null,
            [articleModels],
        );

    const remainingArticles =
        useMemo(
            () =>
                filteredArticles.filter(
                    (article) =>
                        article.id !==
                        featuredArticle?.id,
                ),
            [
                filteredArticles,
                featuredArticle,
            ],
        );

    const pageWidth =
        "min(1180px, calc(100% - 2rem))";

    return (
        <div
            className="min-h-screen"
            style={{
                background:
                backgroundColour,
                color:
                textColour,
            }}
        >
            <section
                className="border-b py-16"
                style={{
                    borderColor:
                        `${accentColour}30`,
                    background: `radial-gradient(circle at 75% 20%, ${accentColour}20, transparent 35%), ${backgroundColour}`,
                }}
            >
                <div
                    className="mx-auto"
                    style={{
                        width:
                        pageWidth,
                    }}
                >
                    <p
                        className="text-xs font-black uppercase tracking-[0.2em]"
                        style={{
                            color:
                            accentColour,
                        }}
                    >
                        Latest Updates
                    </p>

                    <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
                        Competition News
                    </h1>

                    <p className="mt-5 max-w-3xl text-base leading-7 opacity-75 sm:text-lg">
                        Follow official announcements,
                        match reports, community stories
                        and important updates from{" "}
                        <strong>
                            {
                                organisationName
                            }
                        </strong>
                        .
                    </p>
                </div>
            </section>

            <section className="py-10">
                <div
                    className="mx-auto"
                    style={{
                        width:
                        pageWidth,
                    }}
                >
                    <div
                        className="flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between"
                        style={{
                            background:
                            surfaceColour,
                            borderColor:
                                `${accentColour}35`,
                        }}
                    >
                        <div className="relative w-full lg:max-w-md">
                            <Search
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
                            />

                            <input
                                type="search"
                                value={
                                    searchTerm
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setSearchTerm(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Search news..."
                                className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-current"
                                style={{
                                    color:
                                    textColour,
                                }}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {categories.map(
                                (
                                    category,
                                ) => (
                                    <button
                                        key={
                                            category
                                        }
                                        type="button"
                                        onClick={() =>
                                            setSelectedCategory(
                                                category,
                                            )
                                        }
                                        className="rounded-full px-4 py-2 text-sm font-bold transition"
                                        style={{
                                            background:
                                                selectedCategory ===
                                                category
                                                    ? accentColour
                                                    : `${accentColour}12`,
                                            color:
                                                selectedCategory ===
                                                category
                                                    ? accentTextColour
                                                    : textColour,
                                        }}
                                    >
                                        {category ===
                                        "all"
                                            ? "All"
                                            : category}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {featuredArticle &&
            selectedCategory === "all" &&
            !searchTerm.trim() ? (
                <section className="pb-10">
                    <div
                        className="mx-auto"
                        style={{
                            width:
                            pageWidth,
                        }}
                    >
                        <article
                            className="grid overflow-hidden rounded-2xl border lg:grid-cols-[1.15fr_1fr]"
                            style={{
                                background:
                                surfaceColour,
                                borderColor:
                                    `${accentColour}35`,
                            }}
                        >
                            <div
                                className="min-h-[320px]"
                                style={{
                                    background:
                                        featuredArticle.imageUrl
                                            ? `url("${featuredArticle.imageUrl}") center/cover no-repeat`
                                            : `radial-gradient(circle, ${accentColour}30, transparent 42%), ${backgroundColour}`,
                                }}
                            >
                                {!featuredArticle.imageUrl && (
                                    <div className="grid h-full min-h-[320px] place-items-center">
                                        <Newspaper
                                            size={64}
                                            color={
                                                accentColour
                                            }
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col justify-center p-7 sm:p-10">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span
                                        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider"
                                        style={{
                                            background:
                                                `${accentColour}18`,
                                            color:
                                            accentColour,
                                        }}
                                    >
                                        <Star
                                            size={14}
                                        />
                                        Featured
                                    </span>

                                    <span className="text-xs font-bold uppercase tracking-wider opacity-55">
                                        {
                                            featuredArticle.category
                                        }
                                    </span>
                                </div>

                                <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                                    {
                                        featuredArticle.title
                                    }
                                </h2>

                                <p className="mt-4 text-base leading-7 opacity-75">
                                    {
                                        featuredArticle.summary
                                    }
                                </p>

                                <div className="mt-5 flex flex-wrap gap-4 text-sm opacity-65">
                                    <span className="inline-flex items-center gap-2">
                                        <CalendarDays
                                            size={16}
                                        />
                                        {formatDate(
                                            featuredArticle.publishedAt,
                                        )}
                                    </span>

                                    <span>
                                        By{" "}
                                        {
                                            featuredArticle.author
                                        }
                                    </span>
                                </div>

                                <a
                                    href={createArticleHref(
                                        basePath,
                                        featuredArticle.slug,
                                    )}
                                    className="mt-7 inline-flex w-fit items-center gap-2 rounded-xl px-5 py-3 font-black transition hover:opacity-90"
                                    style={{
                                        background:
                                        accentColour,
                                        color:
                                        accentTextColour,
                                        textDecoration:
                                            "none",
                                    }}
                                >
                                    Read Full Article
                                    <ArrowRight
                                        size={18}
                                    />
                                </a>
                            </div>
                        </article>
                    </div>
                </section>
            ) : null}

            <section className="pb-14">
                <div
                    className="mx-auto"
                    style={{
                        width:
                        pageWidth,
                    }}
                >
                    {filteredArticles.length ===
                    0 ? (
                        <div
                            className="rounded-2xl border p-12 text-center"
                            style={{
                                background:
                                surfaceColour,
                                borderColor:
                                    `${accentColour}35`,
                            }}
                        >
                            <Newspaper
                                size={42}
                                className="mx-auto"
                                color={
                                    accentColour
                                }
                            />

                            <h2 className="mt-5 text-2xl font-black">
                                No news found
                            </h2>

                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 opacity-70">
                                No published articles match
                                the selected filters.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {(selectedCategory ===
                                "all" &&
                                !searchTerm.trim()
                                    ? remainingArticles
                                    : filteredArticles
                            ).map(
                                (
                                    article,
                                ) => (
                                    <article
                                        key={
                                            article.id
                                        }
                                        className="flex min-h-[440px] flex-col overflow-hidden rounded-2xl border transition hover:-translate-y-0.5"
                                        style={{
                                            background:
                                            surfaceColour,
                                            borderColor:
                                                `${accentColour}35`,
                                        }}
                                    >
                                        <div
                                            className="min-h-[210px]"
                                            style={{
                                                background:
                                                    article.imageUrl
                                                        ? `url("${article.imageUrl}") center/cover no-repeat`
                                                        : `radial-gradient(circle, ${accentColour}25, transparent 45%), ${backgroundColour}`,
                                            }}
                                        >
                                            {!article.imageUrl && (
                                                <div className="grid min-h-[210px] place-items-center">
                                                    <Newspaper
                                                        size={42}
                                                        color={
                                                            accentColour
                                                        }
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-1 flex-col p-6">
                                            <div className="flex items-center justify-between gap-3">
                                                <span
                                                    className="text-xs font-black uppercase tracking-[0.16em]"
                                                    style={{
                                                        color:
                                                        accentColour,
                                                    }}
                                                >
                                                    {
                                                        article.category
                                                    }
                                                </span>

                                                <span className="text-xs opacity-55">
                                                    {formatDate(
                                                        article.publishedAt,
                                                    )}
                                                </span>
                                            </div>

                                            <h2 className="mt-4 text-2xl font-black leading-tight">
                                                {
                                                    article.title
                                                }
                                            </h2>

                                            <p className="mt-3 text-sm leading-6 opacity-72">
                                                {
                                                    article.summary
                                                }
                                            </p>

                                            <div className="mt-auto pt-6">
                                                <a
                                                    href={createArticleHref(
                                                        basePath,
                                                        article.slug,
                                                    )}
                                                    className="inline-flex items-center gap-2 text-sm font-black no-underline"
                                                    style={{
                                                        color:
                                                        accentColour,
                                                    }}
                                                >
                                                    Read Article
                                                    <ArrowRight
                                                        size={16}
                                                    />
                                                </a>
                                            </div>
                                        </div>
                                    </article>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}