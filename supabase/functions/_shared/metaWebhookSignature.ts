export async function validMetaSignature(raw: string, signature: string | null, secret: string): Promise<boolean> {
    if (!signature || !/^sha256=[0-9a-f]{64}$/.test(signature)) return false
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const bytes = Uint8Array.from(signature.slice(7).match(/../g)!, (hex) => parseInt(hex, 16))
    return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(raw))
}
