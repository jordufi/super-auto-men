// Abilities and foods that only exist in the shop phase, where a battle golden cannot reach them.
import { describe, expect, it } from 'vitest'
import type { ShopSlot, ShopState } from '@sam/sim'
import { makeInstance, makeRng, newShopState, shopReducer, startTurn } from '@sam/sim'
import { CONTENT } from '../src/registry'

const U = (defId: string): ShopSlot => ({ kind: 'unit', defId, frozen: false })
const F = (defId: string): ShopSlot => ({ kind: 'food', defId, frozen: false })

function state(shop: ShopSlot[], team: [string, number, number][] = [], over: Partial<ShopState> = {}): ShopState {
  const s = newShopState()
  s.shop = shop
  team.forEach(([defId, atk, hp], i) => {
    s.team[i] = makeInstance({ defId, atk, hp }, `u${i + 1}`)
  })
  s.nextIid = team.length + 1
  return Object.assign(s, over)
}
const act = (s: ShopState, a: Parameters<typeof shopReducer>[1], seed = 1) => shopReducer(s, a, makeRng(seed), CONTENT)

describe('shop-phase abilities', () => {
  it('crab copies half the healthiest friend’s health at level 1', () => {
    const s = state([U('crab')], [['fish', 2, 9]])
    const after = act(s, { t: 'buyUnit', shopIndex: 0, slot: 1 }).state
    expect(after.team[1]).toMatchObject({ defId: 'crab', hp: 5 }) // 50% of 9, rounded
  })

  it('crab never lowers its own health when the healthiest friend is weaker', () => {
    // 50% of a 2 hp friend is 1, which is less than the crab's own 3 hp: copying is not a downgrade.
    const s = state([U('crab')], [['fish', 2, 2]])
    const r = act(s, { t: 'buyUnit', shopIndex: 0, slot: 1 })
    expect(r.state.team[1]).toMatchObject({ defId: 'crab', hp: 3 })
    expect(r.events.filter((e) => e.t === 'buff')).toEqual([])
  })

  it('shrimp gives a friend health when sold', () => {
    const s = state([], [['shrimp', 2, 3], ['sloth', 1, 1]])
    const after = act(s, { t: 'sell', slot: 0 }).state
    expect(after.team[1]).toMatchObject({ atk: 1, hp: 2 })
  })

  it('swan pays out at the start of the turn', () => {
    const s = state([], [['swan', 1, 3]])
    const next = startTurn({ ...s, turn: 2 }, makeRng(4), CONTENT).state
    expect(next.gold).toBe(11)
  })

  it('giraffe buffs the friends ahead at the end of the turn', () => {
    const s = state([], [['sloth', 1, 1], ['giraffe', 2, 5]])
    const after = act(s, { t: 'endTurn' }).state
    expect(after.team[0]).toMatchObject({ atk: 2, hp: 2 })
    expect(after.team[1]).toMatchObject({ atk: 2, hp: 5 })
  })

  it('snail only helps a team that lost the last battle', () => {
    const shop = [U('snail')]
    const won = act(state(shop, [['sloth', 1, 1]], { lastResult: 'a' }), { t: 'buyUnit', shopIndex: 0, slot: 1 }).state
    expect(won.team[0]).toMatchObject({ atk: 1, hp: 1 })
    const lost = act(state(shop, [['sloth', 1, 1]], { lastResult: 'b' }), { t: 'buyUnit', shopIndex: 0, slot: 1 }).state
    expect(lost.team[0]).toMatchObject({ atk: 3, hp: 2 })
  })

  it('the peanut is what makes the poison status reachable in a real game', () => {
    const s = state([F('peanut')], [['sloth', 1, 1]])
    const after = act(s, { t: 'buyFood', shopIndex: 0, target: 0 }).state
    expect(after.team[0]!.statuses).toEqual(['poison'])
  })

  it('rabbit adds health to whatever a friend eats', () => {
    const s = state([F('apple')], [['sloth', 1, 1], ['rabbit', 3, 2]])
    const after = act(s, { t: 'buyFood', shopIndex: 0, target: 0 }).state
    expect(after.team[0]).toMatchObject({ atk: 2, hp: 3 }) // apple +1/+1, rabbit +0/+1
  })
})

describe('foods', () => {
  it('cupcake is temporary and startTurn wipes it', () => {
    const s = state([F('cupcake')], [['sloth', 1, 1]])
    const fed = act(s, { t: 'buyFood', shopIndex: 0, target: 0 }).state
    expect(fed.team[0]).toMatchObject({ atk: 1, hp: 1, tmpAtk: 3, tmpHp: 3 })
    const next = startTurn({ ...fed, turn: 2 }, makeRng(1), CONTENT).state
    expect(next.team[0]).toMatchObject({ tmpAtk: 0, tmpHp: 0 })
  })

  it('honey, garlic, melon and the meat bone are held as statuses', () => {
    for (const [food, status] of [
      ['honey', 'honey'],
      ['garlic', 'garlic'],
      ['melon', 'meleeShield'],
      ['meatBone', 'bone'],
    ] as const) {
      const s = state([F(food)], [['sloth', 1, 1]])
      const after = act(s, { t: 'buyFood', shopIndex: 0, target: 0 }).state
      expect(after.team[0]!.statuses, food).toEqual([status])
    }
  })

  it('canned food buffs the units in the shop now and after every later roll', () => {
    const s = state([U('sloth'), F('cannedFood')], [['sloth', 1, 1]])
    const fed = act(s, { t: 'buyFood', shopIndex: 1, target: 0 }).state
    expect(fed.shop[0]).toMatchObject({ defId: 'sloth', atk: 3, hp: 2 }) // 1/1 + 2/1
    expect(fed.shopBuff).toEqual({ atk: 2, hp: 1 })
    const rolled = act(fed, { t: 'roll' }, 12).state
    for (const slot of rolled.shop.filter((x) => x.kind === 'unit')) {
      const base = CONTENT.getUnit(slot.defId).base
      expect(slot, slot.defId).toMatchObject({ atk: base.atk + 2, hp: base.hp + 1 })
    }
  })

  it('salad bowl feeds two random friends', () => {
    const s = state([F('saladBowl')], [['sloth', 1, 1], ['sloth', 1, 1], ['sloth', 1, 1]])
    const after = act(s, { t: 'buyFood', shopIndex: 0, target: 0 }).state
    const buffed = after.team.filter((u) => u && u.atk === 2)
    expect(buffed).toHaveLength(2)
  })
})
