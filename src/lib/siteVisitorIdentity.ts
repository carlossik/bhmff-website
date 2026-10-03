type StorageLike = Pick<Storage, 'getItem' | 'setItem'>
let currentPage: { key: string; id: string } | null = null
export function getVisitorIdentity(storage: StorageLike, organisationId: string, uuid: () => string): string {
    const key = `thq-site-visitor:${organisationId}`
    let id = storage.getItem(key)
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) { id = uuid(); storage.setItem(key, id) }
    return id
}
export function getPageEventIdentity(storage: StorageLike, organisationId: string, navigationKey: string, path: string, reload: boolean, uuid: () => string): string {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const key = `${organisationId}:${navigationKey}:${path}:${day}`
    if (currentPage?.key === key) return currentPage.id
    const storageKey = `thq-site-last-page:${organisationId}`
    let previous: { path: string; id: string; day: string } | null = null
    try { previous = JSON.parse(storage.getItem(storageKey) || 'null') } catch { /* reset malformed storage */ }
    const id = !currentPage && reload && previous?.path === path && previous.day === day && /^[0-9a-f-]{36}$/i.test(previous.id) ? previous.id : uuid()
    currentPage = { key, id }
    storage.setItem(storageKey, JSON.stringify({ path, id, day }))
    return id
}
