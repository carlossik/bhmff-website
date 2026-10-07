import { whatsAppReadinessDetail, type WhatsAppConnection } from '../../supabase/functions/_shared/clubWhatsApp.ts'
Deno.test('readiness describes the actual missing setup and expired token without exposing secrets', () => {
 const keys=['THQ_META_APP_ID','THQ_META_APP_SECRET','THQ_META_GRAPH_VERSION','THQ_WHATSAPP_ENCRYPTION_KEY','THQ_META_WEBHOOK_VERIFY_TOKEN']
 const old=keys.map(key=>Deno.env.get(key))
 const connection={verified_name:'Club',display_phone_number:'+15550000000',token_expires_at:'2000-01-01T00:00:00Z'} as WhatsAppConnection
 try {
  if (!whatsAppReadinessDetail(null).includes('No WhatsApp sender')) throw new Error('Missing sender not described')
  keys.forEach(key=>Deno.env.set(key,'private-value'))
  Deno.env.delete('THQ_META_APP_SECRET')
  const missing=whatsAppReadinessDetail(connection)
  if (!missing.includes('THQ_META_APP_SECRET') || missing.includes('private-value')) throw new Error('Missing configuration not safely described')
  Deno.env.set('THQ_META_APP_SECRET','private-value')
  if (!whatsAppReadinessDetail(connection).includes('expired')) throw new Error('Expiry not described')
  connection.token_expires_at='2099-01-01T00:00:00Z'
  if (!whatsAppReadinessDetail(connection).includes('Direct messages from Club')) throw new Error('Ready sender not described')
 } finally { keys.forEach((key,i)=>old[i]===undefined?Deno.env.delete(key):Deno.env.set(key,old[i]!)) }
})
