import { describe, expect, it } from 'vitest'
import type { BattleEvent } from '@sam/sim'
import { simulate } from '@sam/sim'
import { CONTENT, teamFromString } from '@sam/content'
import { buildTimeline, groupAt } from '../src/replay/timeline'
import { projectilesFor } from '../src/replay/projectiles'

const run = (a: string, b: string, seed = 42): ReturnType<typeof simulate> =>
  simulate(teamFromString(a, 0), teamFromString(b, 1), seed, 3, CONTENT)

/** Every projectile a whole battle would draw, in play order. */
const allShots = (log: ReturnType<typeof simulate>): ReturnType<typeof projectilesFor> => {
  const steps = buildTimeline(log, 1)
  return steps.flatMap((_, i) => projectilesFor(steps, i, groupAt(steps, i)))
}

/** A hand-built timeline, so the chain-walking can be tested without hunting for a fixture. */
const timeline = (events: BattleEvent[]): ReturnType<typeof buildTimeline> =>
  buildTimeline({ teams: [{ slots: [] }, { slots: [] }], events, result: 'a', seed: 1 } as never, 1)

describe('projectilesFor', () => {
  it('throws nothing for a melee attack: that is already a lunge', () => {
    const steps = timeline([
      { t: 'attack', a: 'a0', b: 'b0', dmgToA: 1, dmgToB: 1 },
      { t: 'damage', unit: 'b0', amount: 1, from: 'a0' },
    ])
    expect(projectilesFor(steps, 0, groupAt(steps, 0))).toEqual([])
  })

  it('throws a rock for damage dealt by an ability', () => {
    const steps = timeline([
      { t: 'ability', source: 'a0', trigger: 'onStartOfBattle' },
      { t: 'damage', unit: 'b1', amount: 1, from: 'a0' },
    ])
    expect(projectilesFor(steps, 0, groupAt(steps, 0))).toEqual([
      { from: 'a0', to: 'b1', kind: 'damage' },
    ])
  })

  it('throws a green ball from the ability source to the friend it buffs', () => {
    const steps = timeline([
      { t: 'ability', source: 'a0', trigger: 'onFaint' },
      { t: 'buff', unit: 'a1', atk: 1, hp: 1, temporary: false },
    ])
    // The buff is its own step, so the source comes from walking back to the ability.
    expect(projectilesFor(steps, 1, groupAt(steps, 1))).toEqual([
      { from: 'a0', to: 'a1', kind: 'buff' },
    ])
  })

  it('stops walking back at an event that cannot be part of the same ability', () => {
    const steps = timeline([
      { t: 'ability', source: 'a0', trigger: 'onStartOfBattle' },
      { t: 'attack', a: 'a0', b: 'b0', dmgToA: 0, dmgToB: 0 },
      { t: 'buff', unit: 'a1', atk: 1, hp: 1, temporary: false },
    ])
    expect(projectilesFor(steps, 2, groupAt(steps, 2))).toEqual([])
  })

  it('never throws something at the unit that threw it', () => {
    const steps = timeline([
      { t: 'ability', source: 'a0', trigger: 'onHurt' },
      { t: 'buff', unit: 'a0', atk: 2, hp: 0, temporary: false },
    ])
    expect(projectilesFor(steps, 1, groupAt(steps, 1))).toEqual([])
  })

  it('ignores a buff that changes nothing', () => {
    const steps = timeline([
      { t: 'ability', source: 'a0', trigger: 'onFaint' },
      { t: 'buff', unit: 'a1', atk: 0, hp: 0, temporary: false },
    ])
    expect(projectilesFor(steps, 1, groupAt(steps, 1))).toEqual([])
  })

  it('produces well-formed shots across real battles', () => {
    for (const [a, b] of [
      ['ant,cricket', 'pig'],
      ['mosquito,otter', 'horse,duck'],
      ['cricket,hedgehog', 'beaver,fish'],
    ] as const) {
      for (const shot of allShots(run(a, b))) {
        expect(shot.from).not.toBe(shot.to)
        expect(['damage', 'buff']).toContain(shot.kind)
      }
    }
  })
})
