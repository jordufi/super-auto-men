import { describe, expect, it } from 'vitest'
import type { PendingTrigger, Side } from '../src/types'
import { sortBatch } from '../src/triggers'

function pending(source: string, atk: number, position: number, side: Side): PendingTrigger {
  return {
    source,
    defId: 'x',
    trigger: 'onFriendSummoned',
    atk,
    ctx: { side, source, level: 1, position },
  }
}

const order = (batch: PendingTrigger[], owner: Side) => sortBatch(batch, owner).map((p) => p.source)

describe('sortBatch (PLAN.md §1.5)', () => {
  it('1. higher attack first', () => {
    expect(order([pending('low', 1, 0, 0), pending('high', 5, 4, 1)], 0)).toEqual(['high', 'low'])
  })

  it('2. tie on attack -> lower board position first', () => {
    expect(order([pending('back', 3, 3, 0), pending('front', 3, 1, 0)], 0)).toEqual(['front', 'back'])
  })

  it('3. tie on attack and position -> the owner side first', () => {
    const batch = [pending('enemy', 2, 0, 1), pending('owner', 2, 0, 0)]
    expect(order(batch, 0)).toEqual(['owner', 'enemy'])
    expect(order(batch, 1)).toEqual(['enemy', 'owner'])
  })

  it('does not mutate its input', () => {
    const batch = [pending('a', 1, 0, 0), pending('b', 2, 0, 0)]
    sortBatch(batch, 0)
    expect(batch.map((p) => p.source)).toEqual(['a', 'b'])
  })
})
