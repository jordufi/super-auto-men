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
  it('200 seeds, random 1-5 unit teams: identical logs on replay', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const a = randomTeam(seed * 101, 0)
      const b = randomTeam(seed * 211, 1)
      const log1 = simulate(a, b, seed, 1 + (seed % 10), CONTENT)
      const log2 = simulate(a, b, seed, 1 + (seed % 10), CONTENT)
      expect(JSON.stringify(log1)).toBe(JSON.stringify(log2))
    }
  })

  it('every shop unit and every status survives a battle without throwing', () => {
    const statuses = ['garlic', 'meleeShield', 'bone', 'honey', 'poison'] as const
    shopPool(6).forEach((id, i) => {
      const status = statuses[i % statuses.length]!
      const a = teamFromSpec([`${id}:L${(i % 3) + 1}`, `sloth:2/4:${status}`], 0)
      const b = teamFromSpec(['pig:4/4', `${id}:3/3`], 1)
      const log = simulate(a, b, 7 + i, 6, CONTENT)
      expect(log.events.length, id).toBeGreaterThan(1)
      expect(log.events.at(-1), id).toEqual({ t: 'end', result: log.result })
    })
  })
})
