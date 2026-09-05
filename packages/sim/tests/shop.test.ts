import { describe, expect, it } from 'vitest'
import type { FoodDef, ShopAction, ShopSlot, ShopState, UnitDef } from '../src'
import { makeRng } from '../src/rng'
import { newShopState, shopReducer, startTurn } from '../src/shop'
import { makeInstance } from '../src/instance'
import { fakeContent } from './fakeContent'

// Minimal look-alikes of the M0 roster so these tests do not depend on the content package.
const unit = (id: string, atk: number, hp: number, ability?: UnitDef['ability'], tier: UnitDef['tier'] = 1): UnitDef => ({
  id,
  name: id,
  tier,
  base: { atk, hp },
  sprite: id,
  ability,
})
const otter = unit('otter', 1, 2, {
  trigger: 'onBuy',
  text: 'buy',
  effect: { kind: 'buff', target: { kind: 'randomFriend', count: [1, 2, 3], excludeSelf: true }, atk: [1, 1, 1], hp: [1, 1, 1], temporary: false },
})
const pig = unit('pig', 3, 1, { trigger: 'onSell', text: 'sell', effect: { kind: 'gold', amount: [1, 2, 3] } })
const duck = unit('duck', 1, 3, { trigger: 'onSell', text: 'sell', effect: { kind: 'shop', op: 'buffShopUnits', atk: [0, 0, 0], hp: [1, 2, 3] } })
const fish = unit('fish', 2, 3, {
  trigger: 'onLevelUp',
  text: 'lvl',
  effect: { kind: 'buff', target: { kind: 'allFriends' }, atk: [0, 1, 2], hp: [0, 1, 2], temporary: false },
})
const sloth = unit('sloth', 1, 1)
const big = unit('big', 5, 5, undefined, 2)
const apple: FoodDef = {
  id: 'apple',
  name: 'Apple',
  tier: 1,
  sprite: 'apple',
  text: '+1/+1',
  effect: { kind: 'buff', target: { kind: 'self' }, atk: [1, 1, 1], hp: [1, 1, 1], temporary: false },
}
const content = fakeContent([otter, pig, duck, fish, sloth, big], [apple])

const U = (defId: string): ShopSlot => ({ kind: 'unit', defId, frozen: false })
const F = (defId: string): ShopSlot => ({ kind: 'food', defId, frozen: false })

function state(over: Partial<ShopState> & { units?: [string, number, number, number?][] } = {}): ShopState {
  const s = newShopState()
  s.shop = [U('sloth'), U('pig'), U('otter'), F('apple')]
  const { units, ...rest } = over
  Object.assign(s, rest)
  units?.forEach(([id, atk, hp, exp], i) => {
    s.team[i] = makeInstance({ defId: id, atk, hp, exp }, `u${i + 1}`)
  })
  s.nextIid = (units?.length ?? 0) + 1
  return s
}
const act = (s: ShopState, a: ShopAction, seed = 1) => shopReducer(s, a, makeRng(seed), content)

describe('shopReducer', () => {
  it('buyUnit into an empty slot: -3 gold, base stats, shop slot removed', () => {
    const { state: s, events } = act(state(), { t: 'buyUnit', shopIndex: 0, slot: 2 })
    expect(s.gold).toBe(7)
    expect(s.team[2]).toMatchObject({ defId: 'sloth', atk: 1, hp: 1, level: 1, exp: 0, iid: 'u1' })
    expect(s.shop.map((x) => x.defId)).toEqual(['pig', 'otter', 'apple'])
    expect(events).toEqual([])
  })

  it('buyUnit fires onBuy: otter buffs a friend', () => {
    const { state: s, events } = act(state({ units: [['sloth', 1, 1]] }), { t: 'buyUnit', shopIndex: 2, slot: 1 })
    expect(s.team[0]).toMatchObject({ atk: 2, hp: 2 })
    expect(events.map((e) => e.t)).toEqual(['ability', 'buff'])
  })

  it('buyUnit with too little gold returns the same state and no events', () => {
    const before = state({ gold: 2 })
    const r = act(before, { t: 'buyUnit', shopIndex: 0, slot: 0 })
    expect(r.state).toBe(before)
    expect(r.events).toEqual([])
  })

  it('buyUnit onto a different unit, or a food slot, is refused', () => {
    const before = state({ units: [['pig', 3, 1]] })
    expect(act(before, { t: 'buyUnit', shopIndex: 0, slot: 0 }).state).toBe(before)
    expect(act(before, { t: 'buyUnit', shopIndex: 3, slot: 1 }).state).toBe(before)
  })

  it('sell: +level gold, ability fires before removal (pig gives +1 more)', () => {
    const { state: s, events } = act(state({ units: [['pig', 3, 1]] }), { t: 'sell', slot: 0 })
    expect(s.gold).toBe(12)
    expect(s.team[0]).toBeNull()
    expect(events).toEqual([
      { t: 'gold', amount: 1 },
      { t: 'ability', source: 'u1', trigger: 'onSell' },
      { t: 'gold', amount: 1 },
    ])
  })

  it('sell a level-2 unit gives 2 gold', () => {
    const { state: s } = act(state({ units: [['sloth', 2, 2, 2]] }), { t: 'sell', slot: 0 })
    expect(s.gold).toBe(12)
  })

  it('duck sell buffs the units currently in the shop', () => {
    const { state: s } = act(state({ units: [['duck', 1, 3]] }), { t: 'sell', slot: 0 })
    expect(s.shop[0]).toMatchObject({ defId: 'sloth', atk: 1, hp: 2 })
    expect(s.shop[3]).toMatchObject({ kind: 'food' }) // foods untouched
    const bought = act(s, { t: 'buyUnit', shopIndex: 0, slot: 0 }).state
    expect(bought.team[0]).toMatchObject({ atk: 1, hp: 2 })
  })

  it('roll costs 1 gold and replaces non-frozen slots; frozen slots stay', () => {
    const frozen = state()
    frozen.shop[1]!.frozen = true
    const { state: s } = act(frozen, { t: 'roll' }, 5)
    expect(s.gold).toBe(9)
    expect(s.shop[1]).toMatchObject({ defId: 'pig', frozen: true })
    expect(s.shop).toHaveLength(4) // 3 units + 1 food on turn 1
    expect(act(state({ gold: 0 }), { t: 'roll' }).state.gold).toBe(0)
  })

  it('freeze toggles and survives endTurn + startTurn', () => {
    const { state: f } = act(state(), { t: 'freeze', shopIndex: 2 })
    expect(f.shop[2]!.frozen).toBe(true)
    const { state: ended } = act(f, { t: 'endTurn' })
    expect(ended.phase).toBe('battle')
    const { state: next } = startTurn({ ...ended, turn: 2 }, makeRng(9), content)
    expect(next.gold).toBe(10)
    expect(next.shop[2]).toMatchObject({ defId: 'otter', frozen: true })
    expect(act(f, { t: 'freeze', shopIndex: 2 }).state.shop[2]!.frozen).toBe(false)
  })

  it('merge by buying the same unit: max stats +1, exp +1', () => {
    const { state: s } = act(state({ units: [['sloth', 1, 1]] }), { t: 'buyUnit', shopIndex: 0, slot: 0 })
    expect(s.team[0]).toMatchObject({ atk: 2, hp: 2, exp: 1, level: 1 })
    expect(s.gold).toBe(7)
  })

  it('merge that reaches level 2: levelUp event, onLevelUp fires, next-tier unit added to the shop', () => {
    const two = state({ units: [['fish', 2, 3, 1], ['sloth', 1, 1], ['fish', 2, 3]] })
    const r = act(two, { t: 'reorder', from: 2, to: 0 })
    expect(r.state.team[0]).toMatchObject({ defId: 'fish', atk: 3, hp: 4, exp: 2, level: 2 })
    expect(r.state.team[2]).toBeNull()
    expect(r.state.team[1]).toMatchObject({ atk: 2, hp: 2 }) // fish level-up gave +1/+1
    expect(r.events[0]).toEqual({ t: 'levelUp', unit: 'u1', level: 2 })
    expect(r.events.map((e) => e.t)).toEqual(['levelUp', 'ability', 'buff'])
    const units = r.state.shop.filter((x) => x.kind === 'unit')
    expect(units).toHaveLength(4)
    expect(units[3]).toMatchObject({ defId: 'big' }) // tier 2 bonus
  })

  it('a level-3 unit cannot absorb more copies', () => {
    const before = state({ units: [['sloth', 5, 5, 5]] })
    expect(before.team[0]!.level).toBe(3)
    expect(act(before, { t: 'buyUnit', shopIndex: 0, slot: 0 }).state).toBe(before)
  })

  it('reorder: swap, move to empty, same slot refused', () => {
    const base = state({ units: [['pig', 3, 1], ['sloth', 1, 1]] })
    const swapped = act(base, { t: 'reorder', from: 0, to: 1 }).state
    expect(swapped.team.slice(0, 2).map((u) => u?.defId)).toEqual(['sloth', 'pig'])
    const moved = act(base, { t: 'reorder', from: 0, to: 4 }).state
    expect(moved.team[0]).toBeNull()
    expect(moved.team[4]).toMatchObject({ defId: 'pig' })
    expect(act(base, { t: 'reorder', from: 0, to: 0 }).state).toBe(base)
  })

  it('buyFood: apple gives +1/+1 and costs 3; refused with no target', () => {
    const { state: s, events } = act(state({ units: [['sloth', 1, 1]] }), { t: 'buyFood', shopIndex: 3, target: 0 })
    expect(s.team[0]).toMatchObject({ atk: 2, hp: 2 })
    expect(s.gold).toBe(7)
    expect(events).toEqual([{ t: 'buff', unit: 'u1', atk: 1, hp: 1, temporary: false }])
    const before = state()
    expect(act(before, { t: 'buyFood', shopIndex: 3, target: 0 }).state).toBe(before)
  })

  it('does not mutate the input state', () => {
    const before = state({ units: [['pig', 3, 1]] })
    const snapshot = JSON.stringify(before)
    act(before, { t: 'sell', slot: 0 })
    act(before, { t: 'roll' })
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  it('no action is accepted outside the shop phase', () => {
    const before = state({ phase: 'battle' })
    expect(act(before, { t: 'roll' }).state).toBe(before)
  })
})

describe('startTurn', () => {
  it('sets 10 gold, clears temporary buffs, rolls the right number of slots for the turn', () => {
    const s = state({ gold: 0, units: [['sloth', 1, 1]] })
    s.team[0]!.tmpAtk = 3
    const t1 = startTurn(s, makeRng(1), content).state
    expect(t1.gold).toBe(10)
    expect(t1.team[0]!.tmpAtk).toBe(0)
    expect(t1.shop.filter((x) => x.kind === 'unit')).toHaveLength(3)
    expect(t1.shop.filter((x) => x.kind === 'food')).toHaveLength(1)
    const t5 = startTurn({ ...s, turn: 5 }, makeRng(1), content).state
    expect(t5.shop.filter((x) => x.kind === 'unit')).toHaveLength(4)
    expect(t5.shop.filter((x) => x.kind === 'food')).toHaveLength(2)
    // tier 2 becomes available from turn 3
    expect(t1.shop.some((x) => x.defId === 'big')).toBe(false)
    const t3 = startTurn({ ...s, turn: 3 }, makeRng(3), content).state
    expect(content.shopPool(2)).toContain('big')
    expect(t3.shop.every((x) => x.kind === 'food' || content.shopPool(2).includes(x.defId))).toBe(true)
  })
})
