import type {
    PublicMediaItem,
} from '../../hooks/usePublicMedia'

type PublicMediaProps = {
    media: PublicMediaItem[]
    loading: boolean
    error: string | null
}

function MediaCard({
                       item,
                   }: {
    item: PublicMediaItem
}) {
    const canEmbed = Boolean(item.embedUrl)

    return (
        <article
            className={
                item.featured
                    ? 'videoCard featuredVideo publicMediaCard'
                    : 'videoCard publicMediaCard'
            }
        >
            {canEmbed ? (
                <iframe
                    className="mediaIframe"
                    src={item.embedUrl ?? ''}
                    title={item.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            ) : item.thumbnailUrl ? (
                <img
                    className="publicMediaThumbnail"
                    src={item.thumbnailUrl}
                    alt={
                        item.thumbnailAlt ??
                        item.title
                    }
                />
            ) : (
                <div className="videoPlaceholder">
                    {item.category}
                </div>
            )}

            <div className="publicMediaCardContent">
                <div className="publicMediaBadges">
                    <span className="badge">
                        {item.category}
                    </span>

                    {item.featured && (
                        <span className="featuredBadge">
                            Featured
                        </span>
                    )}
                </div>

                <h3>{item.title}</h3>

                <p>{item.description}</p>

                {item.youtubeUrl && (
                    <a
                        className="textButton"
                        href={item.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Watch on YouTube →
                    </a>
                )}
            </div>
        </article>
    )
}

export function PublicMedia({
                                media,
                                loading,
                                error,
                            }: PublicMediaProps) {
    if (loading) {
        return (
            <p className="muted">
                Loading festival media...
            </p>
        )
    }

    if (error) {
        return (
            <p className="formError">
                {error}
            </p>
        )
    }

    if (!media.length) {
        return (
            <p className="muted">
                No media has been published yet.
            </p>
        )
    }

    return (
        <div className="cardGrid three">
            {media.map((item) => (
                <MediaCard
                    key={item.id}
                    item={item}
                />
            ))}
        </div>
    )
}