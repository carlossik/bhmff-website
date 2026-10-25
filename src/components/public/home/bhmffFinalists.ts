import type { PublicFixture } from '../../FixtureList'
import type { PublicResult } from '../../ResultsList'

export type Finalist = { name: string; confirmed: boolean }
export type BhmffFinalMatch = {
  fixture: PublicFixture | null
  home: Finalist
  away: Finalist
  publishedResult: PublicResult | null
}

// The clocks have returned to GMT by this date. Always use an explicit
// timestamp, never the viewer's browser timezone, for the homepage changeover.
export const FINAL_DAY_PROMOTION_AT = Date.parse('2026-10-26T00:00:00Z')
export const ANNOUNCED_FINAL_KICKOFF = Date.parse('2026-10-31T14:00:00Z')

export function getBhmffSpotlightMode(now: number, semiResultCount: number): 'fixtures' | 'results' | 'final-day' {
  if (now >= FINAL_DAY_PROMOTION_AT) return 'final-day'
  return semiResultCount > 0 ? 'results' : 'fixtures'
}

const stageKey = (stage: string) => stage.toLowerCase().replace(/[^a-z0-9]/g, '')
const kickoffValue = (fixture: PublicFixture) => Date.parse(fixture.kickoffTime ?? '') || 0

export function isBhmffSemiFinal(fixture: PublicFixture): boolean {
  return ['semifinal', 'semifinals'].includes(stageKey(fixture.stage))
}

export function isBhmffChampionshipFinal(fixture: PublicFixture): boolean {
  return ['grandfinal', 'final', 'championshipfinal'].includes(stageKey(fixture.stage))
}

export function isBhmffThirdPlace(fixture: PublicFixture): boolean {
  return ['thirdplace', 'thirdplaceplayoff', 'thirdplacematch', '3rdplace', '3rdplaceplayoff'].includes(stageKey(fixture.stage))
}

function isTeamConfirmed(name: string): boolean {
  const value = name.trim()
  return Boolean(value) && !/\b(tbc|tbd|to be confirmed)\b|^winner\b|^semi.?final winner\b/i.test(value)
}

function winner(fixture: PublicFixture, result: PublicResult | undefined): Finalist | null {
  if (!result || result.fixtureId !== fixture.id) return null
  // The full-time score cannot identify a penalty-shootout winner after a draw.
  if (!Number.isFinite(result.homeScore) || !Number.isFinite(result.awayScore) ||
    result.homeScore === result.awayScore) return null
  const name = result.homeScore > result.awayScore ? fixture.homeTeam : fixture.awayTeam
  return isTeamConfirmed(name) ? { name, confirmed: true } : null
}

export function getBhmffSemifinals(fixtures: PublicFixture[]): PublicFixture[] {
  // The stage is authoritative; use the date fallback ONLY when staging data
  // is incomplete, without pulling an unrelated knockout fixture into the mix.
  const byStage = fixtures.filter(fixture => isBhmffSemiFinal(fixture) && !/cancelled/i.test(fixture.status))
  const onMatchday = fixtures.filter(fixture => {
    if (!fixture.kickoffTime || /cancelled/i.test(fixture.status)) return false
    if (isBhmffChampionshipFinal(fixture) || isBhmffThirdPlace(fixture)) return false
    const date = Date.parse(fixture.kickoffTime)
    return Number.isFinite(date) && date >= Date.parse('2026-10-25T00:00:00Z') && date < FINAL_DAY_PROMOTION_AT
  })
  const unique = new Map<string, PublicFixture>()
  for (const fixture of [...byStage, ...(byStage.length < 2 ? onMatchday : [])]) {
    unique.set(fixture.id, fixture)
  }
  return Array.from(unique.values())
    .sort((a, b) => kickoffValue(a) - kickoffValue(b) || a.id.localeCompare(b.id))
    .slice(0, 2)
}

export function getBhmffFinalMatch(fixtures: PublicFixture[], results: PublicResult[]): BhmffFinalMatch {
  const publishedByFixture = new Map(results.map(result => [result.fixtureId, result]))
  const semifinals = getBhmffSemifinals(fixtures)
  const finalists = [0, 1].map(index => {
    const semi = semifinals[index]
    return (semi && winner(semi, publishedByFixture.get(semi.id))) ?? {
      name: `Winner of Semi-Final ${index + 1}`,
      confirmed: false,
    }
  })

  // Prefer the official final fixture (including its home/away order),
  // particularly when a semi-final was settled on penalties.
  const finalFixture = fixtures.filter(fixture => isBhmffChampionshipFinal(fixture) && !/cancelled/i.test(fixture.status))
    .sort((a, b) => kickoffValue(a) - kickoffValue(b) || a.id.localeCompare(b.id))[0] ?? null
  const resolved = (name: string, fallback: Finalist): Finalist =>
    isTeamConfirmed(name) ? { name: name.trim(), confirmed: true } : fallback
  return {
    fixture: finalFixture,
    home: finalFixture ? resolved(finalFixture.homeTeam, finalists[0]) : finalists[0],
    away: finalFixture ? resolved(finalFixture.awayTeam, finalists[1]) : finalists[1],
    publishedResult: finalFixture ? publishedByFixture.get(finalFixture.id) ?? null : null,
  }
}

export function getBhmffThirdPlace(fixtures: PublicFixture[]): PublicFixture | null {
  return fixtures.filter(fixture => isBhmffThirdPlace(fixture) && !/cancelled/i.test(fixture.status))
    .sort((a, b) => kickoffValue(a) - kickoffValue(b) || a.id.localeCompare(b.id))[0] ?? null
}
