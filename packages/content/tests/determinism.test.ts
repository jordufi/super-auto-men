// Same seed twice -> byte-identical logs, with the real roster and abilities firing.
import { describe, expect, it } from 'vitest'
import type { Side } from '@sam/sim'
import { makeRng, simulate } from '@sam/sim'
import { CONTENT, shopPool } from '../src/registry'
import { teamFromSpec } from './golden-helpers'

function randomTeam(seed: number, side: Side) {
  const r = makeRng(seed)
  const pool = shopPool(6)
  const n = 1 + r.int(5)
  return teamFromSpec(
    Array.from({ length: n }, () => `${r.pick(pool)}:${1 + r.int(5)}/${1 + r.int(6)}:L${1 + r.int(3)}`),
    side,
  )
}

describe('determinism with the real roster', () => {
  it('50 seeds, random 1-5 unit teams: identical logs on replay', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const a = randomTeam(seed * 101, 0)
      const b = randomTeam(seed * 211, 1)
      const log1 = simulate(a, b, seed, 1 + (seed % 10), CONTENT)
      const log2 = simulate(a, b, seed, 1 + (seed % 10), CONTENT)
      expect(JSON.stringify(log1)).toBe(JSON.stringify(log2))
    }
  })
})
