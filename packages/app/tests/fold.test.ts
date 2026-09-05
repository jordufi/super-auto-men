import { describe, expect, it } from 'vitest'
import { simulate } from '@sam/sim'
import { CONTENT, teamFromString } from '@sam/content'
import { boardAt, popupsFor } from '../src/replay/fold'

const run = (a: string, b: string, seed = 42): ReturnType<typeof simulate> =>
  simulate(teamFromString(a, 0), teamFromString(b, 1), seed, 3, CONTENT)

describe('boardAt', () => {
  it('starts from the teams stored in the log', () => {
    const log = run('ant,cricket', 'pig')
    const board = boardAt(log, 0)
    expect(board.sides[0].map((u) => u.defId)).toEqual(['ant', 'cricket'])
    expect(board.sides[1].map((u) => u.defId)).toEqual(['pig'])
  })

  it('ends with the winner still standing and the loser empty', () => {
    const log = run('fish:5/5,fish:5/5', 'sloth')
    const end = boardAt(log, log.events.length)
    expect(log.result).toBe('a')
    expect(end.sides[1]).toHaveLength(0)
    expect(end.sides[0].length).toBeGreaterThan(0)
  })

  it('is idempotent: the same index twice gives the same board', () => {
    const log = run('ant,cricket,horse', 'beaver,duck')
    const half = Math.floor(log.events.length / 2)
    expect(boardAt(log, half)).toEqual(boardAt(log, half))
    expect(boardAt(log, log.events.length)).toEqual(boardAt(log, log.events.length + 10))
  })

  it('applies damage from damage events only, never twice from the attack', () => {
    const log = run('sloth:1/9', 'sloth:1/9')
    const attackIndex = log.events.findIndex((e) => e.t === 'attack')
    const after = boardAt(log, attackIndex + 3) // attack + its two damage events
    expect(after.sides[0][0]!.hp).toBe(8)
    expect(after.sides[1][0]!.hp).toBe(8)
  })

  it('summons appear and fainted units disappear', () => {
    const log = run('cricket', 'pig:9/9') // cricket faints and summons a zombie cricket
    const summonAt = log.events.findIndex((e) => e.t === 'summon')
    expect(summonAt).toBeGreaterThan(0)
    const before = boardAt(log, summonAt)
    const after = boardAt(log, summonAt + 1)
    expect(before.sides[0].map((u) => u.defId)).toEqual([])
    expect(after.sides[0].map((u) => u.defId)).toEqual(['zombieCricket'])
  })

  it('buffs change the numbers the screen shows', () => {
    const log = run('ant,sloth', 'pig:9/9') // ant faints and buffs a random friend
    const buffAt = log.events.findIndex((e) => e.t === 'buff')
    expect(buffAt).toBeGreaterThan(0)
    const buff = log.events[buffAt]!
    if (buff.t !== 'buff') throw new Error('expected a buff event')
    const before = boardAt(log, buffAt).sides[0].find((u) => u.iid === buff.unit)!
    const after = boardAt(log, buffAt + 1).sides[0].find((u) => u.iid === buff.unit)!
    expect(after.atk - before.atk).toBe(buff.temporary ? 0 : buff.atk)
    expect(after.tmpAtk - before.tmpAtk).toBe(buff.temporary ? buff.atk : 0)
  })
})

describe('popupsFor', () => {
  it('turns damage, buff and status events into floating text', () => {
    expect(
      popupsFor([
        { t: 'damage', unit: 'u1', amount: 3 },
        { t: 'buff', unit: 'u2', atk: 1, hp: 2, temporary: false },
        { t: 'status', unit: 'u3', status: 'honey', applied: true },
        { t: 'attack', a: 'u1', b: 'u2', dmgToA: 1, dmgToB: 1 },
      ]),
    ).toEqual([
      { iid: 'u1', kind: 'damage', text: '-3' },
      { iid: 'u2', kind: 'buff', text: '+1/+2' },
      { iid: 'u3', kind: 'status', text: 'honey' },
    ])
  })
})
