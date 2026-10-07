// Test-only entry point: all messaging and Meta connections are mocked. No message leaves this page.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { OrganisationProvider } from '../../src/context/OrganisationContext'
import { CommunicationsManager } from '../../src/components/admin/Communications/CommunicationsManager'
import { communicationsService } from '../../src/services/communicationsService'
//import '../../../src/styles.css'
// @ts-ignore
import "../../src/styles.css";


let connected = true
const mockWindow = window as any
mockWindow.FB = {
    init() {},
    login(callback: (response: any) => void, options: any) {
        mockWindow.lastSignup = options
        callback({ authResponse: { code: 'fake-code' } })
        window.dispatchEvent(new MessageEvent('message', { origin: 'https://www.facebook.com',
            data: JSON.stringify({ type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH', data: { waba_id: '100', phone_number_id: '200' } }) }))
    },
}
communicationsService.whatsAppAction = async (_org, action, input) => {
    if (action === 'whatsapp_status') return { connected, ready: connected, setupAvailable: true, canManage: true,
        sender: connected ? { verifiedName: 'Test Club', displayPhoneNumber: '+441234567890', onboardingMode: 'business_app', tokenExpiresAt: null } : null } as any
    if (action === 'whatsapp_begin') return { sessionId: 'fake-session', appId: '123', configId: '456', graphVersion: 'v25.0' } as any
    if (action === 'whatsapp_connect') { connected = true; mockWindow.lastConnection = input; return { connected: true } as any }
    if (action === 'whatsapp_disconnect') { connected = false; return { disconnected: true } as any }
    if (action === 'whatsapp_templates') return { templates: [{ name: 'match_update', language: 'en_GB', category: 'UTILITY', components: [{ type: 'BODY', text: 'Match on {{1}} at {{2}}.' }] }] } as any
    throw new Error('Unexpected mock action')
}
communicationsService.getProviderStatus = async () => [
    { channel: 'email', provider: 'resend', configured: true, dryRun: false, detail: 'Email configured.' },
    { channel: 'whatsapp', provider: connected ? 'meta' : 'unconfigured', configured: connected, dryRun: false, detail: 'Direct messages from Test Club (+441234567890).' },
    { channel: 'sms', provider: 'unconfigured', configured: false, dryRun: false, detail: 'Not configured.' },
]
communicationsService.getHistory = async () => []
communicationsService.getRecipientDirectory = async () => [{ key: 'player-alex', kind: 'player', recipientName: 'Alex',
    email: 'alex@example.invalid', phone: '+447700900001', whatsappPhone: '+447700900001', playerId: null,
    teamId: null, contactId: null, teamNames: ['Test Team'], relationshipLabel: null }]
communicationsService.getTemplates = async () => [{ id: 'general', organisationId: null, code: 'general_operational_message',
    name: 'General message', category: 'general', messageClass: 'service', subjectTemplate: 'Club update',
    bodyTemplate: '{{message_body}}', variables: ['message_body'], providerTemplateRefs: {}, systemDefined: true, active: true }]
communicationsService.send = async (input) => { mockWindow.lastSend = input; return { messageId: 'fake-message',
    requestedRecipients: 1, requestedDeliveries: 1, accepted: 1, skipped: 0, failed: 0, status: 'sent' } }
const profile: any = { currentOrganisation: { id: 'club-a', name: 'Test Club', organisation_type: 'club' },
    currentMembership: { role: 'super_admin' }, organisationAccess: [] }
createRoot(document.getElementById('root')!).render(<OrganisationProvider profile={profile}><div className="mx-auto max-w-7xl p-4"><CommunicationsManager /></div></OrganisationProvider>)
