import {
    extractYouTubeId,
    type MediaCategory,
    type MediaStatus,
} from "./mediaHelpers";

export type MediaFormState = {
    title: string;
    slug: string;
    category: MediaCategory;
    status: MediaStatus;
    description: string;
    youtubeUrl: string;
    embedUrl: string;
    thumbnailUrl: string;
    thumbnailAlt: string;
    featured: boolean;
    publishedAt: string;
};

export function validateMedia(
    form: MediaFormState,
    organisationId: string | null,
    competitionId: string | null,
) {
    if (!organisationId) {
        return "Select an organisation before adding media.";
    }

    if (!competitionId) {
        return "Select a competition before adding media.";
    }

    if (!form.title.trim()) {
        return "Media title is required.";
    }

    if (!form.slug.trim()) {
        return "Media slug is required.";
    }

    if (
        form.category !== "Photo Gallery" &&
        form.category !== "Podcast" &&
        !form.youtubeUrl.trim()
    ) {
        return "A YouTube URL is required for this media category.";
    }

    if (
        form.youtubeUrl.trim() &&
        !extractYouTubeId(
            form.youtubeUrl,
        )
    ) {
        return "Enter a valid YouTube URL.";
    }

    if (
        form.publishedAt &&
        Number.isNaN(
            new Date(
                form.publishedAt,
            ).getTime(),
        )
    ) {
        return "Select a valid publication date and time.";
    }

    return null;
}