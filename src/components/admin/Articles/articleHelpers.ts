// src/components/admin/Articles/articleHelpers.ts

import type { ArticleAction } from "../../../data/festivalData";

export const ARTICLE_IMAGE_BUCKET = "article-images";

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

export function createSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function createSafeFileName(
    fileName: string,
): string {
    const extension = fileName
        .split(".")
        .pop()
        ?.toLowerCase();

    const baseName = fileName
        .replace(/\.[^/.]+$/, "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const safeBaseName =
        baseName || "article-image";

    return extension
        ? `${safeBaseName}.${extension}`
        : safeBaseName;
}

export function toDateTimeLocal(
    value: string | null,
): string {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    const offset =
        date.getTimezoneOffset() * 60000;

    return new Date(
        date.getTime() - offset,
    )
        .toISOString()
        .slice(0, 16);
}

export function normaliseArticleActions(
    value: unknown,
): ArticleAction[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(
        (
            action,
        ): action is ArticleAction =>
            !!action &&
            typeof action === "object" &&
            typeof (action as ArticleAction)
                .label === "string" &&
            typeof (action as ArticleAction)
                .href === "string",
    );
}

export function formatActions(
    actions: ArticleAction[],
): string {
    return actions
        .map(
            action =>
                `${action.label}|${action.href}`,
        )
        .join("\n");
}

export function parseActions(
    value: string,
): ArticleAction[] {
    return value
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            const [label, href] =
                line.split("|");

            return {
                label:
                    label?.trim() ?? "",
                href:
                    href?.trim() ?? "",
            };
        })
        .filter(
            action =>
                action.label.length > 0 &&
                action.href.length > 0,
        );
}

export function parseBody(
    value: string,
): string[] {
    return value
        .split("\n")
        .map(text => text.trim())
        .filter(Boolean);
}

export function parseTags(
    value: string,
): string[] {
    return value
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);
}