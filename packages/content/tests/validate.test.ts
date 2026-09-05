import { describe, expect, it } from 'vitest'
import type { Effect } from '@sam/sim'
import { CUSTOM } from '../src/custom'
import { FOODS, UNITS, foodPool, shopPool } from '../src/registry'
import { UnitDefSchema } from '../src/schema'

const units = Object.values(UNITS)

function* walkEffects(e: Effect): Generator<Effect> {
  yield e
  if (e.kind === 'sequence') for (const sub of e.effects) yield* walkEffects(sub)
}

describe('content registry', () => {
  it('parses every definition (import would have thrown otherwise)', () => {
    expect(units.length).toBeGreaterThanOrEqual(11)
    expect(Object.keys(FOODS)).toContain('apple')
  })

  it('ids are unique and match export names', () => {
    const ids = units.map((u) => u.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const [key, def] of Object.entries(UNITS)) expect(def.id).toBe(key)
  })

  it('every summon references a real unit and every custom fn exists', () => {
    const defs = [...units.flatMap((u) => (u.ability ? [u.ability.effect] : [])), ...Object.values(FOODS).map((f) => f.effect)]
    for (const root of defs) {
      for (const e of walkEffects(root)) {
        if (e.kind === 'summon') expect(UNITS[e.defId], `summon target ${e.defId}`).toBeDefined()
        if (e.kind === 'custom') expect(CUSTOM, `custom fn ${e.fn}`).toHaveProperty(e.fn)
      }
    }
  })

  it('tiers are within 0-6; tokens are tier 0 and never in the shop pool', () => {
    for (const u of units) {
      expect(u.tier).toBeGreaterThanOrEqual(0)
      expect(u.tier).toBeLessThanOrEqual(6)
    }
    expect(UNITS['zombieCricket']?.tier).toBe(0)
    expect(shopPool(6)).not.toContain('zombieCricket')
  })

  it('shopPool(1) is exactly the 10 tier-1 M0 units, alphabetical', () => {
    expect(shopPool(1)).toEqual([
      'ant',
      'beaver',
      'cricket',
      'duck',
      'fish',
      'horse',
      'mosquito',
      'otter',
      'pig',
      'sloth',
    ])
    expect(foodPool(1)).toEqual(['apple'])
  })

  it('rejects an invalid unit with a readable error', () => {
    const broken = { id: 'x', name: 'X', tier: 1, base: { atk: 1 }, sprite: 'x' }
    expect(() => UnitDefSchema.parse(broken)).toThrow()
    const badTier = { ...UNITS['ant'], tier: 9 }
    expect(() => UnitDefSchema.parse(badTier)).toThrow()
  })
})
