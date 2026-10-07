import { createClient } from 'npm:@supabase/supabase-js@^2'
import { metaEnvironment, provisionWhatsAppConnection, listWhatsAppTemplates, loadWhatsAppConnection } from '../supabase/functions/_shared/clubWhatsApp.ts'

// Explicitly invoked by the platform operator, never served as an endpoint.
// Reads secrets from a local env file, sends no messages and never prints tokens.
try {
    const organisationId = metaEnvironment('THQ_DEMO_ORGANISATION_ID')
    const userId = metaEnvironment('THQ_DEMO_ADMIN_USER_ID')
    const admin = createClient(metaEnvironment('SUPABASE_URL'), metaEnvironment('SUPABASE_SERVICE_ROLE_KEY'),
        { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: org, error: orgError } = await admin.from('organisations').select('id,organisation_type').eq('id', organisationId).single()
    if (orgError || org?.organisation_type !== 'club') throw new Error('Choose an existing demo club organisation.')
    const { data: member, error: memberError } = await admin.from('organisation_memberships').select('user_id,role')
        .eq('organisation_id', organisationId).eq('user_id', userId).eq('active', true).maybeSingle()
    if (memberError || !member || !['super_admin', 'competition_manager'].includes(member.role)) throw new Error('Choose an active administrator of the demo club.')
    await provisionWhatsAppConnection(admin, organisationId, userId, {
        token: metaEnvironment('THQ_DEMO_META_ACCESS_TOKEN'), wabaId: metaEnvironment('THQ_DEMO_WABA_ID'),
        phoneNumberId: metaEnvironment('THQ_DEMO_PHONE_NUMBER_ID'), onboardingMode: 'platform',
    })
    const connection = await loadWhatsAppConnection(admin, organisationId)
    if (!connection) throw new Error('The saved connection could not be read.')
    const templates = await listWhatsAppTemplates(connection)
    console.log('Sender saved with encrypted credentials. No message was sent.')
    console.log('Meta-reported sender:', connection.verified_name, connection.display_phone_number)
    console.log('Approved supported Utility templates:', templates.map(t => `${t.name} (${t.language})`).join(', ') || 'None — check template review in Meta.')
    console.log('Display-name review and delivery remain subject to Meta. Verify both before claiming live readiness.')
} catch (error) {
    console.error(error instanceof Error ? error.message : 'Unable to configure the sender.')
    Deno.exit(1)
}
