export const IMAGE_LIMIT = 10 * 1024 * 1024
export const VIDEO_LIMIT = 50 * 1024 * 1024
export function validateMediaFile(file: { type: string; size: number }): string | null {
    const image = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!image && file.type !== 'video/mp4') return 'Choose JPG, PNG, WebP or MP4 files.'
    if (file.size <= 0) return 'This file is empty.'
    if (file.size > (image ? IMAGE_LIMIT : VIDEO_LIMIT)) return image
        ? 'Images must be 10 MB or smaller.'
        : 'Videos must be 50 MB or smaller. Upload larger videos to YouTube or cloud storage and paste a public viewing URL.'
    return null
}
export function safeMediaUrl(value: string): boolean {
    try { return new URL(value).protocol === 'https:' } catch { return false }
}
export function directVideoUrl(value: string): boolean {
    try { return /\.mp4$/i.test(new URL(value).pathname) && safeMediaUrl(value) } catch { return false }
}
export function selectFeaturedMatch<T extends { category?: string | null; homepage_featured?: boolean | null; status?: string | null; published_at?: string | null; id: string }>(items: T[]): T | null {
    return items.filter(item => item.homepage_featured && item.category !== 'Photo Gallery' && (!item.status || item.status === 'published'))
        .sort((a,b) => (b.published_at || '').localeCompare(a.published_at || '') || a.id.localeCompare(b.id))[0] || null
}
