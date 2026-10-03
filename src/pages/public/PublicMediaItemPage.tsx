import { useState } from 'react'
import type { PublicMediaItem } from '../../services/public/organisationPublicService'
import { MediaPlayer } from '../../components/public/MediaPlayer'
import { safeMediaUrl } from '../../utils/publicMedia'
export function PublicMediaItemPage({ item, basePath }: { item?: PublicMediaItem; basePath: string }) {
    const [message, setMessage] = useState('')
    if (!item) return <main className="container py-8"><h1>Media unavailable</h1><p>This item may have been removed or is not published.</p><a href={`${basePath || '/'}#media`}>View published media</a></main>
    const url = `${window.location.origin}${basePath}/media/${item.id}`
    const images = Array.isArray(item.image_urls) ? item.image_urls.filter(safeMediaUrl) : []
    return <main className="container py-8"><a href={`${basePath || '/'}#media`}>← All media</a><h1 className="my-4 text-3xl font-bold">{item.title}</h1><p className="mb-4 whitespace-pre-line">{item.description}</p>
        {item.category === 'Photo Gallery' ? <div className="grid gap-4 sm:grid-cols-2">{(images.length ? images : [item.thumbnail_url || '']).filter(safeMediaUrl).map((src, index) => <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt={`${item.title || 'Gallery'} — photo ${index + 1}`} loading="lazy" className="h-auto w-full" /></a>)}</div> : <MediaPlayer url={item.youtube_url || item.embed_url || ''} thumbnail={item.thumbnail_url || ''} title={item.title || 'Media'} />}
        <div className="my-6 flex flex-wrap gap-4"><button className="btn secondary" onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage('Link copied') } catch { setMessage(`Copy this link: ${url}`) } }}>Copy link</button><a className="btn secondary" href={`https://wa.me/?text=${encodeURIComponent(`${item.title} ${url}`)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a></div><p role="status">{message}</p></main>
}
