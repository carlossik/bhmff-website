import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const passes = []

function read(relativePath) {
    const fullPath = path.join(root, relativePath)
    if (!fs.existsSync(fullPath)) {
        failures.push(`Missing file: ${relativePath}`)
        return ''
    }
    return fs.readFileSync(fullPath, 'utf8')
}

function check(name, condition) {
    if (condition) passes.push(name)
    else failures.push(name)
}

const publicService = read('src/services/public/organisationPublicService.ts')
const publicMediaPage = read('src/pages/public/PublicMediaPage.tsx')
const adminPortal = read('src/components/AdminPortal.tsx')
const accessControl = read('src/services/accessControl.ts')

check(
    'Public Media service only requests published rows',
    publicService.includes('.eq("status", "published")') ||
        publicService.includes(".eq('status', 'published')"),
)
check(
    'Club Media is organisation-scoped rather than competition-required',
    publicService.includes('organisation.organisation_type !== "club"'),
)
check(
    'Competition Media remains scoped to published competition ids',
    publicService.includes('competitionIds.length === 0') &&
        publicService.includes('"competition_id"'),
)
check(
    'Public Media page consumes stored YouTube URLs',
    publicMediaPage.includes('"youtube_url"'),
)
check(
    'Public Media page consumes stored embed URLs',
    publicMediaPage.includes('"embed_url"'),
)
check(
    'Public Media page recognises Media category',
    publicMediaPage.includes('"category"'),
)

// Release-level module preservation. These are the visible TournamentHQ modules
// recovered in the current paid-product baseline. The hotfix must not remove any.
const allVisibleModules = [
    'Dashboard',
    'Communications',
    'Organisations',
    'Club Profile & Website',
    'Competitions',
    'Seasons',
    'Squad',
    'Clubs',
    'Teams',
    'Competition Teams',
    'Groups',
    'Venues',
    'Sports Officials',
    'AI Tournament Director',
    'Auto Fixture Generator',
    'Fixtures',
    'Match Centre',
    'Results',
    'Goals',
    'Club Finance',
    'Sponsors',
    'Articles',
    'Media',
    'Enquiries',
    'Platform Operations',
    'User Access',
]

for (const moduleName of allVisibleModules) {
    check(
        `AdminPortal retains ${moduleName}`,
        adminPortal.includes(moduleName),
    )
    check(
        `accessControl retains ${moduleName}`,
        accessControl.includes(moduleName),
    )
}

const sharedJourneyModules = [
    'Dashboard',
    'Communications',
    'Teams',
    'Venues',
    'Sports Officials',
    'Fixtures',
    'Results',
    'Sponsors',
    'Articles',
    'Media',
    'Enquiries',
    'User Access',
]
const competitionJourneyModules = [
    'Competitions',
    'Clubs',
    'Competition Teams',
    'Groups',
    'AI Tournament Director',
    'Auto Fixture Generator',
    'Goals',
]
const clubJourneyModules = [
    'Club Profile & Website',
    'Seasons',
    'Squad',
    'Match Centre',
    'Club Finance',
]

for (const moduleName of [
    ...sharedJourneyModules,
    ...competitionJourneyModules,
    ...clubJourneyModules,
]) {
    check(
        `Journey module wired: ${moduleName}`,
        adminPortal.includes(moduleName) && accessControl.includes(moduleName),
    )
}

console.log(`PASS: ${passes.length}`)
for (const pass of passes) console.log(`  ✓ ${pass}`)

if (failures.length) {
    console.error(`\nFAIL: ${failures.length}`)
    for (const failure of failures) console.error(`  ✗ ${failure}`)
    process.exit(1)
}

console.log('\nTournamentHQ public Media + module regression gate PASSED.')
