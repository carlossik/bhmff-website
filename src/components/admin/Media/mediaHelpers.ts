export const mediaCategories = [
    "Match Highlights",
    "Full Match Replay",
    "Player Interview",
    "Coach Interview",
    "Livestream",
    "Competition Trailer",
    "Behind the Scenes",
    "Photo Gallery",
    "Podcast",
    "Sponsor Feature",
] as const;

export const mediaStatuses = [
    "draft",
    "review",
    "scheduled",
    "published",
    "archived",
] as const;

export type MediaCategory =
    (typeof mediaCategories)[number];

export type MediaStatus =
    (typeof mediaStatuses)[number];

export function createSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function extractYouTubeId(
    value: string,
) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return null;
    }

    try {
        const url = new URL(trimmedValue);

        if (
            url.hostname.includes("youtu.be")
        ) {
            return (
                url.pathname
                    .replace("/", "")
                    .split("/")[0] || null
            );
        }

        if (
            url.hostname.includes(
                "youtube.com",
            )
        ) {
            if (
                url.pathname.startsWith(
                    "/embed/",
                )
            ) {
                return (
                    url.pathname
                        .split("/embed/")[1]
                        ?.split("/")[0] ??
                    null
                );
            }
            if (url.pathname.startsWith("/live/")) {
                return (
                    url.pathname
                        .split("/live/")[1]
                        ?.split("/")[0] ?? null
                );
            }

            if (
                url.pathname.startsWith(
                    "/shorts/",
                )
            ) {
                return (
                    url.pathname
                        .split("/shorts/")[1]
                        ?.split("/")[0] ??
                    null
                );
            }

            return url.searchParams.get("v");
        }
    } catch {
        return null;
    }

    return null;
}

export function createEmbedUrl(
    youtubeUrl: string,
) {
    const videoId =
        extractYouTubeId(youtubeUrl);

    return videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : "";
}

export function createThumbnailUrl(
    youtubeUrl: string,
) {
    const videoId =
        extractYouTubeId(youtubeUrl);

    return videoId
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : "";
}

export function toDateTimeLocal(
    value: string | null,
) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const offset =
        date.getTimezoneOffset();

    const localDate = new Date(
        date.getTime() -
        offset * 60_000,
    );

    return localDate
        .toISOString()
        .slice(0, 16);
}

export function formatStatusLabel(
    status: MediaStatus,
) {
    return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase(),
        );
}