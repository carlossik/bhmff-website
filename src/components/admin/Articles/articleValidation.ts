// src/components/admin/Articles/articleValidation.ts

import type {
    ArticleCategory,
    ArticleStatus,
} from "../../../data/festivalData";

export type ArticleFormState = {
    title: string;
    slug: string;
    category: ArticleCategory;
    status: ArticleStatus;
    summary: string;
    hero: string;
    readTime: string;
    body: string;
    author: string;
    publishedAt: string;
    featured: boolean;
    imageUrl: string;
    imageAlt: string;
    tags: string;
    actions: string;
};

export function validateArticle(
    form: ArticleFormState,
    organisationId: string | null,
): string | null {
    if (!organisationId) {
        return "Select an organisation before saving an article.";
    }

    if (!form.title.trim()) {
        return "Article title is required.";
    }

    if (!form.slug.trim()) {
        return "Article slug is required.";
    }

    if (!form.summary.trim()) {
        return "Article summary is required.";
    }

    if (!form.hero.trim()) {
        return "Article introduction is required.";
    }

    if (!form.body.trim()) {
        return "Article body is required.";
    }

    if (!form.author.trim()) {
        return "Article author is required.";
    }

    return null;
}