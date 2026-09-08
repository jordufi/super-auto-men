import { describe, expect, it } from 'vitest'
import type { BattleLog } from '@sam/sim'
import { buildTimeline, groupAt, totalDuration } from '../src/replay/timeline'
import { DURATIONS } from '../src/replay/durations'

const log = (events: BattleLog['events']): BattleLog => ({
  seed: 1,
  teams: [
    { name: 'a', slots: [null, null, null, null, null] },
    { name: 'b', slots: [null, null, null, null, null] },
  ],
  events,
  result: 'draw',
})

const battle = log([
  { t: 'startOfBattle' },
  { t: 'attack', a: 'a1', b: 'b1', dmgToA: 2, dmgToB: 3 },
  { t: 'damage', unit: 'a1', amount: 2, from: 'b1' },
  { t: 'damage', unit: 'b1', amount: 3, from: 'a1' },
  { t: 'faint', unit: 'b1', side: 1, position: 0 },
  { t: 'end', result: 'a' },
])

describe('buildTimeline', () => {
  it('gives every event a step, in order', () => {
    const steps = buildTimeline(battle, 1)
    expect(steps.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5])
    expect(steps.map((s) => s.event.t)).toEqual(['startOfBattle', 'attack', 'damage', 'damage', 'faint', 'end'])
  })

  it('marks damage as parallel with the event that caused it', () => {
    const steps = buildTimeline(battle, 1)
    expect(steps[2]!.parallelWith).toBe(1)
    expect(steps[3]!.parallelWith).toBe(1) // the second damage joins the same attack
    expect(steps[2]!.duration).toBe(0)
    expect(steps[1]!.parallelWith).toBeUndefined()
    expect(steps[4]!.parallelWith).toBeUndefined()
  })

  it('speed 2 halves every duration, instant makes the whole replay free', () => {
    expect(buildTimeline(battle, 1)[1]!.duration).toBe(DURATIONS.attack)
    expect(buildTimeline(battle, 2)[1]!.duration).toBe(DURATIONS.attack / 2)
    expect(totalDuration(buildTimeline(battle, 'instant'))).toBe(0)
    expect(totalDuration(buildTimeline(battle, 1))).toBeGreaterThan(0)
  })

  it('manual waits on no clock at all: the player advances every step', () => {
    expect(totalDuration(buildTimeline(battle, 'manual'))).toBe(0)
  })

  it('1x is slow enough to follow: every visible step lasts at least half a second', () => {
    for (const step of buildTimeline(battle, 1)) {
      // Followers (damage) ride on their head and are deliberately free.
      if (step.parallelWith !== undefined) continue
      if (DURATIONS[step.event.t] === 0) continue
      expect(step.duration).toBeGreaterThanOrEqual(500)
    }
  })
})

describe('groupAt', () => {
  it('returns the head plus the events riding with it', () => {
    const steps = buildTimeline(battle, 1)
    expect(groupAt(steps, 1).map((e) => e.t)).toEqual(['attack', 'damage', 'damage'])
    expect(groupAt(steps, 0).map((e) => e.t)).toEqual(['startOfBattle'])
    expect(groupAt(steps, 4).map((e) => e.t)).toEqual(['faint'])
  })
})
