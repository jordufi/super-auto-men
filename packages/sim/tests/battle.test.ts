import { describe, expect, it } from 'vitest'
import { simulate } from '../src/battle'
import { team, u } from './helpers'
import { NO_ABILITIES } from './fakeContent'

const events = (log: ReturnType<typeof simulate>, t: string) => log.events.filter((e) => e.t === t)
const run = (a: ReturnType<typeof team>, b: ReturnType<typeof team>) =>
  simulate(a, b, 1, 1, NO_ABILITIES)

describe('simulate (no abilities)', () => {
  it('2/1 vs 2/2: both faint in one exchange -> draw', () => {
    const log = run(team([u('x', 2, 1)], 0), team([u('y', 2, 2)], 1))
    expect(log.result).toBe('draw')
    expect(events(log, 'attack')).toHaveLength(1)
    expect(events(log, 'faint')).toHaveLength(2)
    expect(log.events.at(-1)).toEqual({ t: 'end', result: 'draw' })
  })

  it('1/5 vs 1/1: B faints, A survives with 4 hp -> a wins', () => {
    const log = run(team([u('x', 1, 5)], 0), team([u('y', 1, 1)], 1))
    expect(log.result).toBe('a')
    expect(events(log, 'attack')).toHaveLength(1)
    expect(events(log, 'faint')).toEqual([{ t: 'faint', unit: '1-0-y', side: 1, position: 0 }])
    expect(events(log, 'damage')).toEqual([
      { t: 'damage', unit: '0-0-x', amount: 1, from: '1-0-y' },
      { t: 'damage', unit: '1-0-y', amount: 1, from: '0-0-x' },
    ])
  })

  it('2v1: the first friend faints before the second attacks', () => {
    const log = run(team([u('front', 1, 1), u('back', 3, 3)], 0), team([u('tank', 1, 4)], 1))
    expect(log.result).toBe('a')
    const seq = log.events.filter((e) => e.t === 'attack' || e.t === 'faint')
    expect(seq.map((e) => (e.t === 'attack' ? `attack:${e.a}` : `faint:${e.unit}`))).toEqual([
      'attack:0-0-front',
      'faint:0-0-front',
      'attack:0-1-back',
      'faint:1-0-tank',
    ])
  })

  it('empty vs non-empty -> b wins with no attacks; empty vs empty -> draw', () => {
    const log1 = run(team([], 0), team([u('y', 1, 1)], 1))
    expect(log1.result).toBe('b')
    expect(events(log1, 'attack')).toHaveLength(0)
    const log2 = run(team([], 0), team([], 1))
    expect(log2.result).toBe('draw')
  })

  it('loop guard: two 0-attack units -> draw after 1000 rounds, in under a second', { timeout: 1000 }, () => {
    const log = run(team([u('x', 0, 1)], 0), team([u('y', 0, 1)], 1))
    expect(log.result).toBe('draw')
    expect(events(log, 'attack')).toHaveLength(1000)
  })

  it('does not mutate its inputs and returns the starting snapshot', () => {
    const a = team([u('x', 2, 3)], 0)
    const b = team([u('y', 1, 1)], 1)
    const aBefore = JSON.stringify(a)
    const bBefore = JSON.stringify(b)
    const log = run(a, b)
    expect(JSON.stringify(a)).toBe(aBefore)
    expect(JSON.stringify(b)).toBe(bBefore)
    expect(JSON.stringify(log.teams[0])).toBe(aBefore)
    expect(log.teams[0]).not.toBe(a)
  })

  it('compacts empty slots so the front unit attacks first', () => {
    const a = team([u('x', 1, 1)], 0)
    a.slots = [null, null, a.slots[0], null, null]
    const log = run(a, team([u('y', 1, 1)], 1))
    expect(events(log, 'attack')[0]).toMatchObject({ a: '0-0-x', b: '1-0-y' })
  })
})
