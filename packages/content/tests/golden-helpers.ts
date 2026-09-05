// Golden fixture support (ARCHITECTURE.md §10.2, PLAN.md Phase 4 step 6).
// Fixtures live here in `content` (not in `sim`) because they exercise real unit definitions.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BattleEvent } from '@sam/sim'

export { teamFromSpec } from '../src/spec'

export interface GoldenFixture {
  name: string
  seed: number
  turn: number
  a: string[]
  b: string[]
  /** null = not generated yet; run `npm run test:update-golden` and review the result. */
  expectedEvents: BattleEvent[] | null
}

export const UPDATE_GOLDEN = process.env['UPDATE_GOLDEN'] === '1'

export function loadFixtures<T>(dir: string): { file: string; fixture: T }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const file = join(dir, f)
      return { file, fixture: JSON.parse(readFileSync(file, 'utf8')) as T }
    })
}

export function writeFixture(file: string, fixture: unknown): void {
  writeFileSync(file, JSON.stringify(fixture, null, 2) + '\n', 'utf8')
}
