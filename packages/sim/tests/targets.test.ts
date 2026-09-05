import { describe, expect, it } from 'vitest'
import type { Target, TriggerCtx } from '../src'
import { newBattleState } from '../src/battle'
import { makeRng } from '../src/rng'
import { resolveTarget } from '../src/targets'
import { team, u } from './helpers'

// A: a0 3/5 · a1 1/2 · a2 2/9      B: b0 1/1 · b1 5/3 · b2 2/2
const state = () =>
  newBattleState(
    team([u('a0', 3, 5), u('a1', 1, 2), u('a2', 2, 9)], 0),
    team([u('b0', 1, 1), u('b1', 5, 3), u('b2', 2, 2)], 1),
    1,
  )
const ctx: TriggerCtx = { side: 0, source: '0-1-a1', level: 1, position: 1, atk: 3, triggerSource: '1-2-b2' }
const ids = (t: Target, seed = 1) => resolveTarget(state(), t, ctx, makeRng(seed)).map((x) => x.iid)

describe('resolveTarget', () => {
  it.each<[Target, string[]]>([
    [{ kind: 'self' }, ['0-1-a1']],
    [{ kind: 'triggerSource' }, ['1-2-b2']],
    [{ kind: 'ahead' }, ['0-0-a0']],
    [{ kind: 'behind' }, ['0-2-a2']],
    [{ kind: 'adjacent' }, ['0-0-a0', '0-2-a2']],
    [{ kind: 'frontFriend' }, ['0-0-a0']],
    [{ kind: 'backFriend' }, ['0-2-a2']],
    [{ kind: 'allFriends' }, ['0-0-a0', '0-2-a2']],
    [{ kind: 'allEnemies' }, ['1-0-b0', '1-1-b1', '1-2-b2']],
    [{ kind: 'frontEnemy' }, ['1-0-b0']],
    [{ kind: 'highestAtkEnemy' }, ['1-1-b1']],
    [{ kind: 'lowestHpEnemy' }, ['1-0-b0']],
    [{ kind: 'lowestHpFriend' }, ['0-0-a0']],
    [{ kind: 'randomFriend', count: 2, excludeSelf: true }, ['0-0-a0', '0-2-a2']],
    [{ kind: 'randomEnemy', count: [3, 3, 3] }, ['1-0-b0', '1-1-b1', '1-2-b2']],
  ])('%j', (target, expected) => {
    const got = ids(target)
    if (target.kind === 'randomFriend' || target.kind === 'randomEnemy') {
      expect([...got].sort()).toEqual(expected)
    } else {
      expect(got).toEqual(expected)
    }
  })

  it('random selectors are deterministic per seed and honour count / level', () => {
    const one = ids({ kind: 'randomEnemy', count: [1, 2, 3] }, 7)
    expect(one).toHaveLength(1)
    expect(ids({ kind: 'randomEnemy', count: [1, 2, 3] }, 7)).toEqual(one)
    const self = resolveTarget(state(), { kind: 'randomFriend', count: 3 }, ctx, makeRng(1))
    expect(self.map((x) => x.iid).sort()).toEqual(['0-0-a0', '0-1-a1', '0-2-a2'])
  })

  it('ahead/behind skip empty slots and return [] at the edges', () => {
    const s = state()
    s.teams[0].slots = [s.teams[0].slots[0], null, s.teams[0].slots[1], null, s.teams[0].slots[2]]
    const c = { ...ctx, position: 2 }
    expect(resolveTarget(s, { kind: 'ahead' }, c, makeRng(1)).map((x) => x.iid)).toEqual(['0-0-a0'])
    expect(resolveTarget(s, { kind: 'behind' }, c, makeRng(1)).map((x) => x.iid)).toEqual(['0-2-a2'])
    const frontCtx = { ...ctx, source: '0-0-a0', position: 0 }
    expect(resolveTarget(s, { kind: 'ahead' }, frontCtx, makeRng(1))).toEqual([])
  })

  it('self and triggerSource return [] when the unit is gone', () => {
    const s = state()
    s.teams[0].slots[1] = null
    expect(resolveTarget(s, { kind: 'self' }, ctx, makeRng(1))).toEqual([])
    expect(resolveTarget(s, { kind: 'triggerSource' }, { ...ctx, triggerSource: 'nope' }, makeRng(1))).toEqual([])
  })
})
