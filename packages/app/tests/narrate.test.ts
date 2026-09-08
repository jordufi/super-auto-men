import { describe, expect, it } from 'vitest'
import { simulate } from '@sam/sim'
import { CONTENT, teamFromString } from '@sam/content'
import { buildTimeline, groupAt } from '../src/replay/timeline'
import { abilityCallout, narrate, unitIndex } from '../src/replay/narrate'

const run = (a: string, b: string, seed = 42): ReturnType<typeof simulate> =>
  simulate(teamFromString(a, 0), teamFromString(b, 1), seed, 3, CONTENT)

/** Every group in a log, in play order — what the battle screen walks through. */
const groups = (log: ReturnType<typeof simulate>): ReturnType<typeof groupAt>[] => {
  const steps = buildTimeline(log, 1)
  return steps.map((_, i) => groupAt(steps, i))
}

describe('unitIndex', () => {
  it('covers the starting teams and anything summoned mid-battle', () => {
    const log = run('cricket', 'pig')
    const units = unitIndex(log)
    for (const team of log.teams) {
      for (const u of team.slots) if (u) expect(units.has(u.iid)).toBe(true)
    }
    for (const e of log.events) {
      if (e.t === 'summon') expect(units.get(e.unit.iid)?.defId).toBe(e.unit.defId)
    }
  })
})

describe('abilityCallout', () => {
  it('describes the unit whose ability is firing', () => {
    const log = run('ant,cricket', 'pig')
    const units = unitIndex(log)
    const callouts = groups(log)
      .map((g) => abilityCallout(g, units))
      .filter((c) => c !== null)
    expect(callouts.length).toBeGreaterThan(0)
    for (const c of callouts) {
      expect(c.name).not.toBe('')
      expect(c.text).not.toBe('')
      expect(c.tier).toBeGreaterThanOrEqual(1)
      // The sprite is looked up by unit id (assets/units/index.ts).
      expect(CONTENT.getUnit(c.defId).name).toBe(c.name)
    }
  })

  it('is null for everything that is not an ability', () => {
    const units = unitIndex(run('ant', 'pig'))
    expect(abilityCallout([{ t: 'startOfBattle' }], units)).toBeNull()
    expect(abilityCallout([], units)).toBeNull()
  })
})

describe('narrate', () => {
  it('announces the start of the battle', () => {
    const units = unitIndex(run('ant', 'pig'))
    expect(narrate([{ t: 'startOfBattle' }], units)).toBe('Battle start!')
  })

  it('names both sides of an attack and the unit that faints', () => {
    const log = run('ant', 'pig')
    const units = unitIndex(log)
    const lines = groups(log)
      .map((g) => narrate(g, units))
      .filter((m) => m !== null)
    expect(lines).toContain('Battle start!')
    expect(lines.some((l) => /attacks/.test(l))).toBe(true)
    expect(lines.some((l) => /faints\.$/.test(l))).toBe(true)
  })

  it('announces summons', () => {
    const log = run('cricket', 'pig')
    const units = unitIndex(log)
    const lines = groups(log)
      .map((g) => narrate(g, units))
      .filter((m) => m !== null)
    expect(lines.some((l) => /is summoned\.$/.test(l))).toBe(true)
  })

  it('stays quiet for the events that are already shown as floating numbers', () => {
    const units = unitIndex(run('ant', 'pig'))
    expect(narrate([{ t: 'damage', unit: 'a0', amount: 2 }], units)).toBeNull()
    expect(narrate([{ t: 'buff', unit: 'a0', atk: 1, hp: 1, temporary: false }], units)).toBeNull()
    // An ability gets the card instead, and 'end' is covered by the result overlay.
    expect(narrate([{ t: 'ability', source: 'a0', trigger: 'onFaint' }], units)).toBeNull()
    expect(narrate([{ t: 'end', result: 'a' }], units)).toBeNull()
  })
})
