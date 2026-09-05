import { describe, expect, it } from 'vitest'
import { simulate } from '../src/battle'
import { makeRng } from '../src/rng'
import { team, u } from './helpers'
import { NO_ABILITIES } from './fakeContent'

/** A seeded random 1-5 unit team so the check covers many shapes. */
function randomTeam(seed: number, side: 0 | 1) {
  const r = makeRng(seed)
  const n = 1 + r.int(5)
  return team(
    Array.from({ length: n }, (_, i) => u(`u${i}`, 1 + r.int(5), 1 + r.int(6))),
    side,
  )
}

describe('determinism', () => {
  it('same inputs and seed produce byte-identical logs (seeds 1..20)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const a = randomTeam(seed * 7, 0)
      const b = randomTeam(seed * 13, 1)
      const log1 = simulate(a, b, seed, 3, NO_ABILITIES)
      const log2 = simulate(a, b, seed, 3, NO_ABILITIES)
      expect(JSON.stringify(log1)).toBe(JSON.stringify(log2))
    }
  })
})
