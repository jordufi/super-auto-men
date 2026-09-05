import { describe, expect, it } from 'vitest'
import type { ShopSlot, Slots } from '@sam/sim'
import { emptySlots, makeInstance } from '@sam/sim'
import { resolveTap } from '../src/store/interaction'

const shop: ShopSlot[] = [
  { kind: 'unit', defId: 'ant', frozen: false },
  { kind: 'food', defId: 'apple', frozen: false },
]
const team = (): Slots => {
  const s = emptySlots()
  s[0] = makeInstance({ defId: 'ant', atk: 2, hp: 1 }, 'u1')
  return s
}

describe('resolveTap', () => {
  it('selects and deselects a shop slot', () => {
    expect(resolveTap(null, { kind: 'shop', index: 0 }, shop, team()).selection).toEqual({
      kind: 'shop',
      index: 0,
    })
    expect(
      resolveTap({ kind: 'shop', index: 0 }, { kind: 'shop', index: 0 }, shop, team()).selection,
    ).toBeNull()
  })

  it('shop unit + team slot = buyUnit', () => {
    const r = resolveTap({ kind: 'shop', index: 0 }, { kind: 'team', slot: 2 }, shop, team())
    expect(r.action).toEqual({ t: 'buyUnit', shopIndex: 0, slot: 2 })
    expect(r.selection).toBeNull()
  })

  it('shop food + team slot = buyFood', () => {
    const r = resolveTap({ kind: 'shop', index: 1 }, { kind: 'team', slot: 0 }, shop, team())
    expect(r.action).toEqual({ t: 'buyFood', shopIndex: 1, target: 0 })
  })

  it('team + team = reorder; the same slot deselects', () => {
    expect(
      resolveTap({ kind: 'team', slot: 0 }, { kind: 'team', slot: 1 }, shop, team()).action,
    ).toEqual({
      t: 'reorder',
      from: 0,
      to: 1,
    })
    expect(
      resolveTap({ kind: 'team', slot: 0 }, { kind: 'team', slot: 0 }, shop, team()).selection,
    ).toBeNull()
  })

  it('tapping an occupied team slot selects it; an empty one does nothing', () => {
    expect(resolveTap(null, { kind: 'team', slot: 0 }, shop, team()).selection).toEqual({
      kind: 'team',
      slot: 0,
    })
    expect(resolveTap(null, { kind: 'team', slot: 3 }, shop, team()).selection).toBeNull()
  })
})
