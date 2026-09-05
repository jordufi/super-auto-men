import { describe, expect, it } from 'vitest'
import type { Effect, Target } from '@sam/sim'
import { makeRng, newBattleState, resolveTarget } from '@sam/sim'
import { CUSTOM } from '../src/custom'
import { describeAbility, describeFood } from '../src/describe'
import { FOODS, UNITS, foodPool, shopPool } from '../src/registry'
import { TARGET_KINDS, UnitDefSchema } from '../src/schema'
import { teamFromSpec } from '../src/spec'

const units = Object.values(UNITS)

function* walkEffects(e: Effect): Generator<Effect> {
  yield e
  if (e.kind === 'sequence') for (const sub of e.effects) yield* walkEffects(sub)
}

describe('content registry', () => {
  it('parses every definition (import would have thrown otherwise)', () => {
    expect(units.length).toBe(34) // 30 shop units + 4 tokens
    expect(Object.keys(FOODS)).toHaveLength(8)
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
    expect(foodPool(1)).toEqual(['apple', 'honey'])
  })

  it('shopPool(3) is exactly the 30 non-token units, ten per tier', () => {
    const pool = shopPool(3)
    expect(pool).toHaveLength(30)
    expect(new Set(pool).size).toBe(30)
    for (const tier of [1, 2, 3] as const) {
      expect(pool.filter((id) => UNITS[id]!.tier === tier)).toHaveLength(10)
    }
    expect([...pool].sort()).toEqual(pool) // alphabetical
    for (const token of ['zombieCricket', 'dirtyRat', 'ram', 'bee']) {
      expect(UNITS[token]!.tier).toBe(0)
      expect(pool).not.toContain(token)
    }
  })

  it('every ability text renders with no placeholder left at any level', () => {
    for (const unit of units) {
      if (!unit.ability) continue
      for (const level of [1, 2, 3] as const) {
        const text = describeAbility(unit.ability, level)
        expect(text, `${unit.id} L${level}`).not.toMatch(/\{\w+\}/)
      }
    }
    for (const food of Object.values(FOODS)) {
      expect(describeFood(food), food.id).not.toMatch(/\{\w+\}/)
    }
  })

  it('every target kind in the schema resolves without throwing', () => {
    const state = newBattleState(teamFromSpec(['ant', 'sloth', 'pig'], 0), teamFromSpec(['duck', 'fish'], 1), 3)
    const ctx = { side: 0 as const, source: '0-1-sloth', level: 1 as const, position: 1, atk: 1, triggerSource: '1-0-duck' }
    for (const kind of TARGET_KINDS) {
      const target = { kind, count: 1 } as Target
      expect(() => resolveTarget(state, target, ctx, makeRng(1)), kind).not.toThrow()
    }
  })

  it('rejects an invalid unit with a readable error', () => {
    const broken = { id: 'x', name: 'X', tier: 1, base: { atk: 1 }, sprite: 'x' }
    expect(() => UnitDefSchema.parse(broken)).toThrow()
    const badTier = { ...UNITS['ant'], tier: 9 }
    expect(() => UnitDefSchema.parse(badTier)).toThrow()
  })
})
