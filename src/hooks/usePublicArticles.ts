import {
    useEffect,
    useState,
} from "react";

import { supabase } from "../lib/supabaseClient";

import {
    articles as fallbackArticles,
    type Article,
    type ArticleAction,
    type ArticleCategory,
    type ArticleStatus,
} from "../data/festivalData";

import {
    useOptionalPublicOrganisation,
} from "../context/PublicOrganisationContext";

type DbArticle = {
    id: string;
    organisation_id: string | null;
    slug: string | null;
    title: string | null;
    category: string | null;
    status: string | null;
    summary: string | null;
    hero: string | null;
    read_time: string | null;
    body: unknown;
    author: string | null;
    published_at: string | null;
    featured: boolean | null;
    image_url: string | null;
    image_alt: string | null;
    tags: unknown;
    actions: unknown;
};

type UsePublicArticlesResult = {
    articles: Article[];
    loading: boolean;
    error: string | null;
};

function normaliseStringArray(
    value: unknown,
): string[] {
    if (Array.isArray(value)) {
        return value
            .filter(
                (
                    item,
                ): item is string =>
                    typeof item ===
                    "string",
            )
            .map((item) =>
                item.trim(),
            )
            .filter(Boolean);
    }

    if (
        typeof value !==
        "string"
    ) {
        return [];
    }

    const trimmedValue =
        value.trim();

    if (!trimmedValue) {
        return [];
    }

    try {
        const parsedValue: unknown =
            JSON.parse(
                trimmedValue,
            );

        if (
            Array.isArray(
                parsedValue,
            )
        ) {
            return parsedValue
                .filter(
                    (
                        item,
                    ): item is string =>
                        typeof item ===
                        "string",
                )
                .map((item) =>
                    item.trim(),
                )
                .filter(Boolean);
        }
    } catch {
        // Continue with plain-text parsing.
    }

    if (
        trimmedValue.startsWith(
            "{",
        ) &&
        trimmedValue.endsWith(
            "}",
        )
    ) {
        const innerValue =
            trimmedValue.slice(
                1,
                -1,
            );

        if (
            !innerValue.trim()
        ) {
            return [];
        }

        return innerValue
            .split(
                /","|',\s*'|,\s*/,
            )
            .map((item) =>
                item
                    .replace(
                        /^["']|["']$/g,
                        "",
                    )
                    .replace(
                        /\\"/g,
                        '"',
                    )
                    .trim(),
            )
            .filter(Boolean);
    }

    return trimmedValue
        .split(/\n\s*\n/)
        .map((paragraph) =>
            paragraph.trim(),
        )
        .filter(Boolean);
}

function normaliseActions(
    value: unknown,
): ArticleAction[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (
                    typeof item !==
                    "object" ||
                    item === null
                ) {
                    return null;
                }

                const record =
                    item as Record<
                        string,
                        unknown
                    >;

                if (
                    typeof record.label !==
                    "string" ||
                    typeof record.href !==
                    "string"
                ) {
                    return null;
                }

                return {
                    label:
                    record.label,
                    href:
                    record.href,
                };
            })
            .filter(
                (
                    action,
                ): action is ArticleAction =>
                    action !== null,
            );
    }

    if (
        typeof value ===
        "string"
    ) {
        try {
            return normaliseActions(
                JSON.parse(value),
            );
        } catch {
            return [];
        }
    }

    return [];
}

function mapDbArticle(
    article: DbArticle,
): Article {
    return {
        id: article.id,
        slug:
            article.slug ??
            article.id,
        title:
            article.title ??
            "Untitled article",
        category:
            (
                article.category ??
                "Competition News"
            ) as ArticleCategory,
        status:
            (
                article.status ??
                "draft"
            ) as ArticleStatus,
        summary:
            article.summary ??
            "",
        hero:
            article.hero ??
            "",
        readTime:
            article.read_time ??
            "3 min read",
        body:
            normaliseStringArray(
                article.body,
            ),
        author:
            article.author ??
            "Editorial Team",
        publishedAt:
        article.published_at,
        featured:
            article.featured ??
            false,
        imageUrl:
            article.image_url ??
            undefined,
        imageAlt:
            article.image_alt ??
            undefined,
        tags:
            normaliseStringArray(
                article.tags,
            ),
        actions:
            normaliseActions(
                article.actions,
            ),
    };
}

export function usePublicArticles():
    UsePublicArticlesResult {
    const publicOrganisation =
        useOptionalPublicOrganisation();

    const organisationId =
        publicOrganisation
            ?.organisationId ??
        null;

    const organisationSlug =
        publicOrganisation
            ?.organisationSlug
            .trim()
            .toLowerCase() ??
        "";

    const isBhmff =
        organisationSlug ===
        "bhmff";

    const [
        articles,
        setArticles,
    ] =
        useState<Article[]>(
            isBhmff
                ? fallbackArticles.filter(
                    (article) =>
                        article.status ===
                        "published",
                )
                : [],
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null,
        );

    useEffect(() => {
        let isMounted = true;

        async function loadArticles() {
            if (!organisationId) {
                if (isMounted) {
                    setArticles(
                        isBhmff
                            ? fallbackArticles.filter(
                                (
                                    article,
                                ) =>
                                    article.status ===
                                    "published",
                            )
                            : [],
                    );
                    setLoading(false);
                }

                return;
            }

            setLoading(true);
            setError(null);

            const {
                data,
                error: queryError,
            } = await supabase
                .from("articles")
                .select(`
                    id,
                    organisation_id,
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
                .eq(
                    "organisation_id",
                    organisationId,
                )
                .eq(
                    "status",
                    "published",
                )
                .order(
                    "featured",
                    {
                        ascending:
                            false,
                    },
                )
                .order(
                    "published_at",
                    {
                        ascending:
                            false,
                        nullsFirst:
                            false,
                    },
                );

            if (!isMounted) {
                return;
            }

            if (queryError) {
                console.error(
                    "Failed to load public articles:",
                    queryError,
                );

                setError(
                    "Unable to load the latest articles.",
                );

                setArticles(
                    isBhmff
                        ? fallbackArticles.filter(
                            (
                                article,
                            ) =>
                                article.status ===
                                "published",
                        )
                        : [],
                );

                setLoading(false);
                return;
            }

            const mappedArticles =
                (
                    data ??
                    []
                ).map((row) =>
                    mapDbArticle(
                        row as DbArticle,
                    ),
                );

            setArticles(
                mappedArticles,
            );
            setLoading(false);
        }

        void loadArticles();

        return () => {
            isMounted = false;
        };
    }, [
        isBhmff,
        organisationId,
    ]);

    return {
        articles,
        loading,
        error,
    };
}