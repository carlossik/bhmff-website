const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const backend = readFileSync('supabase/functions/communications/index.ts', 'utf8')
const ui = readFileSync('src/components/admin/Communications/WhatsAppConnectionPanel.tsx', 'utf8')
test('token refresh is platform-admin only and never returns token', () => {
  const section = backend.split("if (action === 'whatsapp_refresh_token') {")[1]?.split("if (action === 'whatsapp_disconnect')")[0]
  assert.ok(section, 'refresh handler missing')
  assert.match(section, /!context\.isPlatformAdmin/)
  assert.match(section, /provisionWhatsAppConnection/)
  assert.match(section, /onboardingMode: 'platform'/)
  assert.match(section, /return jsonResponse\(\{ updated: true \}\)/)
})
test('manual renewal available only with server-provided flag', () => {
  assert.match(ui, /status\?\.canRefreshToken && status\.sender\?\.onboardingMode === 'platform'/)
  assert.match(ui, /type="password"/)
  assert.match(ui, /setRenewToken\(''\)/)
})
