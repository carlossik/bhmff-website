import { channelDryRunEnabled, getProviderStatuses, sendWithProvider } from '../../supabase/functions/_shared/communicationsProviders.ts'
Deno.test('email and WhatsApp override global dry-run; disabled SMS refuses delivery', async () => {
 const keys = ['THQ_COMMUNICATIONS_DRY_RUN','THQ_EMAIL_DRY_RUN','THQ_WHATSAPP_DRY_RUN','THQ_SMS_ENABLED']
 const before = keys.map(key => Deno.env.get(key))
 try {
  Deno.env.set('THQ_COMMUNICATIONS_DRY_RUN','true')
  Deno.env.set('THQ_EMAIL_DRY_RUN','false')
  Deno.env.set('THQ_WHATSAPP_DRY_RUN','false')
  Deno.env.set('THQ_SMS_ENABLED','false')
  if (channelDryRunEnabled('email') || channelDryRunEnabled('whatsapp')) throw new Error('Live channel overrides ignored')
  if (getProviderStatuses().find(p=>p.channel==='sms')?.configured) throw new Error('Disabled SMS advertised')
  let rejected=false
  try { await sendWithProvider({channel:'sms',recipientName:'Test',email:null,phone:'+441234567890',subject:null,body:'Test',senderName:'Test',replyToEmail:null,providerTemplateRef:null,variables:{}}) } catch { rejected=true }
  if (!rejected) throw new Error('Disabled SMS accepted')
  Deno.env.delete('THQ_WHATSAPP_DRY_RUN')
  if (!channelDryRunEnabled('whatsapp')) throw new Error('Global fallback lost')
 } finally { keys.forEach((key,i)=>before[i]===undefined?Deno.env.delete(key):Deno.env.set(key,before[i]!)) }
})
