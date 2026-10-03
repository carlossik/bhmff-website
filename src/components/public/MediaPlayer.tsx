import { directVideoUrl, safeMediaUrl } from '../../utils/publicMedia'
import { createEmbedUrl } from '../admin/Media/mediaHelpers'
export function MediaPlayer({ url = '', thumbnail = '', title }: { url?: string; thumbnail?: string; title: string }) {
    const embed = createEmbedUrl(url)
    if (embed) return <iframe className="aspect-video w-full border-0" src={embed} title={title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
    if (directVideoUrl(url)) return <video className="aspect-video w-full" controls playsInline preload="metadata" poster={safeMediaUrl(thumbnail) ? thumbnail : undefined}><source src={url} type="video/mp4" /></video>
    return <div>{safeMediaUrl(thumbnail) && <img className="w-full object-contain" src={thumbnail} alt={title} />}{safeMediaUrl(url) && <a className="btn secondary" href={url} target="_blank" rel="noreferrer">Open hosted media ↗</a>}</div>
}
