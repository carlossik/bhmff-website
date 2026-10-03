import {
    type MediaCategory,
    type MediaStatus,
} from "./mediaHelpers";

import { safeMediaUrl, validateMediaFile } from '../../../utils/publicMedia';

export type MediaFormState = {
    files: File[];
    imageUrls: string[];
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
    isClub = false,
) {
    if (!organisationId) {
        return "Select an organisation before adding media.";
    }

    if (!competitionId && !isClub) {
        return "Select a competition before adding media.";
    }

    if (!form.title.trim()) {
        return "Media title is required.";
    }

    if (!form.slug.trim()) {
        return "Media slug is required.";
    }

    for (const file of form.files) { const error = validateMediaFile(file); if (error) return error; }
    if (form.files.length > 20) return 'Choose no more than 20 files per save.';
    if (form.files.some(file => file.type === 'video/mp4') && (form.files.length !== 1 || form.category === 'Photo Gallery')) return 'Upload one MP4 per video media item. Use separate items for photos.';
    if (form.files.some(file => file.type.startsWith('image/')) && form.category !== 'Photo Gallery') return 'Choose Photo Gallery for image uploads.';
    if (form.youtubeUrl.trim() && !safeMediaUrl(form.youtubeUrl.trim())) return 'Use a public HTTPS video URL.';
    if (form.category !== 'Photo Gallery' && !form.youtubeUrl.trim() && !form.files.length) return 'Add a video URL or upload an MP4.';
    if (form.category === 'Photo Gallery' && !form.files.length && !form.imageUrls.length && !form.thumbnailUrl.trim()) return 'Upload photos or provide an image URL.';
    if (form.thumbnailUrl.trim() && !safeMediaUrl(form.thumbnailUrl.trim())) return 'Use an HTTPS image URL.';
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