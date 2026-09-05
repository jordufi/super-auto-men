import { describe, expect, it } from 'vitest'
import type { Effect, TriggerCtx, UnitDef } from '../src'
import { newBattleState } from '../src/battle'
import { apply } from '../src/effects'
import { makeRng } from '../src/rng'
import { drain } from '../src/queue'
import { dealDamage } from '../src/faint'
import { makeInstance } from '../src/instance'
import { fakeContent } from './fakeContent'
import { team, u } from './helpers'

const token: UnitDef = { id: 'tok', name: 'Token', tier: 0, base: { atk: 1, hp: 1 }, sprite: 'tok' }
const content = fakeContent([token])
const ctx: TriggerCtx = { side: 0, source: '0-0-x', level: 2, position: 0, atk: 1 }
const run = (state: ReturnType<typeof newBattleState>, e: Effect) => {
  apply(state, e, ctx, makeRng(1), content)
  return state
}
const board = () => newBattleState(team([u('x', 2, 2), u('y', 1, 1)], 0), team([u('e', 1, 3)], 1), 1)

describe('apply', () => {
  it('buff: permanent changes atk/hp, temporary changes tmpAtk/tmpHp; uses the level index', () => {
    const s = run(board(), { kind: 'buff', target: { kind: 'self' }, atk: [1, 5, 9], hp: [1, 6, 9], temporary: false })
    expect(s.teams[0].slots[0]).toMatchObject({ atk: 7, hp: 8, tmpAtk: 0, tmpHp: 0 })
    run(s, { kind: 'buff', target: { kind: 'self' }, atk: [1, 2, 3], hp: [0, 0, 0], temporary: true })
    expect(s.teams[0].slots[0]).toMatchObject({ atk: 7, tmpAtk: 2 })
    expect(s.log).toEqual([
      { t: 'buff', unit: '0-0-x', atk: 5, hp: 6, temporary: false },
      { t: 'buff', unit: '0-0-x', atk: 2, hp: 0, temporary: true },
    ])
  })

  it('damage: kills at exactly 0 and emits damage then faint', () => {
    const s = run(board(), { kind: 'damage', target: { kind: 'frontEnemy' }, amount: [1, 3, 5] })
    expect(s.teams[1].slots[0]).toBeNull()
    expect(s.log).toEqual([
      { t: 'damage', unit: '1-0-e', amount: 3, from: '0-0-x' },
      { t: 'faint', unit: '1-0-e', side: 1, position: 0 },
    ])
  })

  it('damage: a unit left at 1 hp survives', () => {
    const s = run(board(), { kind: 'damage', target: { kind: 'frontEnemy' }, amount: [2, 2, 2] })
    expect(s.teams[1].slots[0]).toMatchObject({ hp: 1 })
    expect(s.log.some((e) => e.t === 'faint')).toBe(false)
  })

  it('summon: fills the given position, then the nearest free slot, and refuses when full', () => {
    const s = board()
    s.teams[0].slots[0] = null // x is gone, position 0 is free
    run(s, { kind: 'summon', defId: 'tok', count: [1, 1, 1], stats: { atk: [1, 2, 3], hp: [1, 2, 3] } })
    expect(s.teams[0].slots[0]).toMatchObject({ defId: 'tok', atk: 2, hp: 2, iid: '0-s0-tok' })
    expect(s.log[0]).toMatchObject({ t: 'summon', side: 0, position: 0 })

    run(s, { kind: 'summon', defId: 'tok', count: [1, 1, 1] }) // position 0 taken -> next free is 2
    expect(s.teams[0].slots[2]).toMatchObject({ defId: 'tok', atk: 1, hp: 1 })

    run(s, { kind: 'summon', defId: 'tok', count: [5, 5, 5] }) // fills 3 and 4, then stops
    expect(s.teams[0].slots.every((slot) => slot !== null)).toBe(true)
    expect(s.log.filter((e) => e.t === 'summon')).toHaveLength(4)
  })

  it('sequence: applies sub-effects in order', () => {
    const s = run(board(), {
      kind: 'sequence',
      effects: [
        { kind: 'buff', target: { kind: 'self' }, atk: [1, 1, 1], hp: [0, 0, 0], temporary: false },
        { kind: 'damage', target: { kind: 'self' }, amount: [1, 1, 1] },
      ],
    })
    expect(s.log.map((e) => e.t)).toEqual(['buff', 'damage'])
    expect(s.teams[0].slots[0]).toMatchObject({ atk: 3, hp: 1 })
  })

  it('custom: calls the registered function and appends its events; unknown fn throws', () => {
    const c = fakeContent([token])
    c.custom['noop'] = () => [{ t: 'gold', amount: 0 }]
    const s = board()
    apply(s, { kind: 'custom', fn: 'noop' }, ctx, makeRng(1), c)
    expect(s.log).toEqual([{ t: 'gold', amount: 0 }])
    expect(() => apply(s, { kind: 'custom', fn: 'missing' }, ctx, makeRng(1), c)).toThrow(/missing/)
  })

  it('gold and shop effects are refused in battle', () => {
    expect(() => run(board(), { kind: 'gold', amount: [1, 1, 1] })).toThrow(/shop-only/)
  })

  it('drain: a faint cascade (damage -> faint -> summon) is queued, not recursed', () => {
    const cricketLike: UnitDef = {
      id: 'cr',
      name: 'Cr',
      tier: 1,
      base: { atk: 1, hp: 1 },
      sprite: 'cr',
      ability: {
        trigger: 'onFaint',
        text: 'summon',
        effect: { kind: 'summon', defId: 'tok', count: [1, 1, 1] },
      },
    }
    const c = fakeContent([token, cricketLike])
    const s = newBattleState(team([u('x', 2, 2)], 0), team([u('cr', 1, 1)], 1), 1)
    apply(s, { kind: 'damage', target: { kind: 'frontEnemy' }, amount: [1, 1, 1] }, ctx, makeRng(1), c)
    expect(s.queue).toHaveLength(1) // the onFaint is pending, nothing recursed
    expect(s.log.map((e) => e.t)).toEqual(['damage', 'faint'])
    drain(s, makeRng(1), c)
    expect(s.log.map((e) => e.t)).toEqual(['damage', 'faint', 'ability', 'summon'])
    expect(s.teams[1].slots[0]).toMatchObject({ defId: 'tok' })
  })
})

describe('dealDamage board guard', () => {
  // `apply` resolves every target BEFORE dealing damage, so a target can already have died and
  // left the board by the time its turn comes. Damaging it would log phantom damage against a
  // unit nobody can see and fire onHurt on a corpse.
  it('ignores a unit that is not on the board', () => {
    const state = newBattleState(team([u('a', 1, 5)], 0), team([u('b', 1, 5)], 1), 1)
    const ghost = makeInstance({ defId: 'tok', atk: 1, hp: 5 }, 'ghost') // never placed
    dealDamage(state, content, ghost, 3, '0-0-a')
    expect(state.log).toEqual([])
    expect(ghost.hp).toBe(5)
  })

  it('ignores a unit that is on the board but already dead', () => {
    const state = newBattleState(team([u('a', 1, 5)], 0), team([u('b', 1, 5)], 1), 1)
    const victim = state.teams[1].slots[0]!
    victim.hp = 0
    dealDamage(state, content, victim, 3, '0-0-a')
    expect(state.log).toEqual([])
    expect(victim.hp).toBe(0)
  })
})
