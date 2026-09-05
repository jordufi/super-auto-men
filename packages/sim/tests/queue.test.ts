import { describe, expect, it } from 'vitest'
import type { PendingTrigger, Side, UnitDef } from '../src'
import { sortBatch } from '../src/triggers'
import { MAX_TRIGGER_STEPS } from '../src/queue'
import { simulate } from '../src/battle'
import { fakeContent } from './fakeContent'
import { team, u } from './helpers'

function pending(source: string, atk: number, position: number, side: Side): PendingTrigger {
  return {
    source,
    defId: 'x',
    trigger: 'onFriendSummoned',
    atk,
    ctx: { side, source, level: 1, position, atk },
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

describe('drain loop guard', () => {
  // A cycle that frees the slot it fills: on every friendly summon, summon another token and kill
  // the one that just arrived. Nothing in `content` can build this, but without MAX_TRIGGER_STEPS
  // the drain never returns and the tab freezes.
  const looper: UnitDef = {
    id: 'looper',
    name: 'looper',
    tier: 1,
    base: { atk: 1, hp: 99 },
    sprite: 'looper',
    ability: {
      trigger: 'onFriendSummoned',
      text: 'loop',
      effect: {
        kind: 'sequence',
        effects: [
          { kind: 'summon', defId: 'token', count: [1, 1, 1] },
          { kind: 'damage', target: { kind: 'triggerSource' }, amount: [99, 99, 99] },
        ],
      },
    },
  }
  const seeder: UnitDef = {
    id: 'seeder',
    name: 'seeder',
    tier: 1,
    base: { atk: 1, hp: 1 },
    sprite: 'seeder',
    ability: {
      trigger: 'onStartOfBattle',
      text: 'seed',
      effect: { kind: 'summon', defId: 'token', count: [1, 1, 1] },
    },
  }
  const content = fakeContent([looper, seeder, { id: 'token', name: 'token', tier: 1, base: { atk: 1, hp: 1 }, sprite: 'token' }])

  it('abandons a self-feeding trigger cycle instead of hanging, and the battle still ends', () => {
    const log = simulate(
      team([u('looper', 1, 99), u('seeder', 1, 1)], 0),
      team([u('wall', 1, 50)], 1),
      1,
      1,
      content,
    )
    expect(log.events.filter((e) => e.t === 'summon')).toHaveLength(MAX_TRIGGER_STEPS)
    expect(log.events.at(-1)).toEqual({ t: 'end', result: log.result })
  })
})
