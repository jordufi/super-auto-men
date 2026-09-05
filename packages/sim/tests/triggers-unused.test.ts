// onKnockOut, onEnemySummoned and onShopRoll are fully implemented but no unit in `content` uses
// them yet, so nothing else in the suite reaches them. An implemented path with no test is where
// the next bug hides: these lock the behaviour now, while it is known good.
import { describe, expect, it } from 'vitest'
import type { Lvl3, Trigger, UnitDef } from '../src'
import { makeRng } from '../src/rng'
import { simulate } from '../src/battle'
import { newShopState, shopReducer } from '../src/shop'
import { makeInstance } from '../src/instance'
import { emptySlots } from '../src/board'
import { fakeContent } from './fakeContent'
import { team, u } from './helpers'

const THREE: Lvl3 = [3, 3, 3]
const ZERO: Lvl3 = [0, 0, 0]

const body = (id: string, atk: number, hp: number, ability?: UnitDef['ability']): UnitDef => ({
  id,
  name: id,
  tier: 1,
  base: { atk, hp },
  sprite: id,
  ability,
})

/** Gains +3 attack when `trigger` fires, so the buff event proves the trigger reached it. */
const reactor = (id: string, atk: number, hp: number, trigger: Trigger): UnitDef =>
  body(id, atk, hp, {
    trigger,
    text: String(trigger),
    effect: { kind: 'buff', target: { kind: 'self' }, atk: THREE, hp: ZERO, temporary: false },
  })

describe('triggers with no content using them yet', () => {
  it('onKnockOut fires on the killer, not the victim', () => {
    const content = fakeContent([reactor('killer', 5, 9, 'onKnockOut'), body('victim', 1, 1)])
    const log = simulate(team([u('killer', 5, 9)], 0), team([u('victim', 1, 1)], 1), 1, 1, content)
    const fired = log.events.filter((e) => e.t === 'ability')
    expect(fired).toEqual([{ t: 'ability', source: '0-0-killer', trigger: 'onKnockOut' }])
    expect(log.events).toContainEqual({ t: 'buff', unit: '0-0-killer', atk: 3, hp: 0, temporary: false })
  })

  it('onKnockOut does not fire when the killer dies in the same exchange', () => {
    // Both die trading blows, so there is no living killer to respond.
    const content = fakeContent([reactor('killer', 5, 1, 'onKnockOut'), body('victim', 5, 1)])
    const log = simulate(team([u('killer', 5, 1)], 0), team([u('victim', 5, 1)], 1), 1, 1, content)
    expect(log.events.filter((e) => e.t === 'ability')).toEqual([])
    expect(log.result).toBe('draw')
  })

  it('onEnemySummoned fires across the board, onFriendSummoned on the summoner’s own side', () => {
    const summoner = body('summoner', 1, 1, {
      trigger: 'onFaint',
      text: 'summon',
      effect: { kind: 'summon', defId: 'token', count: [1, 1, 1] },
    })
    const content = fakeContent([
      summoner,
      body('token', 1, 1),
      reactor('watcher', 4, 9, 'onEnemySummoned'),
      reactor('mate', 2, 9, 'onFriendSummoned'),
    ])
    const log = simulate(
      team([u('summoner', 1, 1), u('mate', 2, 9)], 0),
      team([u('watcher', 4, 9)], 1),
      1,
      1,
      content,
    )
    const fired = log.events.filter((e) => e.t === 'ability').map((e) => (e.t === 'ability' ? e.trigger : ''))
    expect(fired).toContain('onEnemySummoned')
    expect(fired).toContain('onFriendSummoned')
    // Higher attack goes first within the batch (PLAN.md 1.5), and the watcher has 4 to the mate's 2.
    expect(fired.indexOf('onEnemySummoned')).toBeLessThan(fired.indexOf('onFriendSummoned'))
  })

  it('onShopRoll fires on a paid roll, and not on any other shop action', () => {
    const content = fakeContent([reactor('roller', 1, 1, 'onShopRoll')])
    const base = newShopState()
    base.team = emptySlots()
    base.team[0] = makeInstance({ defId: 'roller', atk: 1, hp: 1 }, 'u1')

    const rolled = shopReducer(base, { t: 'roll' }, makeRng(5), content)
    expect(rolled.events).toContainEqual({ t: 'ability', source: 'u1', trigger: 'onShopRoll' })
    expect(rolled.state.team[0]).toMatchObject({ atk: 4 })
    expect(rolled.state.gold).toBe(9) // the roll still cost its gold

    const frozen = shopReducer(base, { t: 'freeze', shopIndex: 0 }, makeRng(5), content)
    expect(frozen.events.filter((e) => e.t === 'ability')).toEqual([])
  })

  it('a roll refused for lack of gold fires nothing', () => {
    const content = fakeContent([reactor('roller', 1, 1, 'onShopRoll')])
    const broke: ReturnType<typeof newShopState> = { ...newShopState(), gold: 0 }
    broke.team = emptySlots()
    broke.team[0] = makeInstance({ defId: 'roller', atk: 1, hp: 1 }, 'u1')
    const r = shopReducer(broke, { t: 'roll' }, makeRng(5), content)
    expect(r.state).toBe(broke)
    expect(r.events).toEqual([])
  })
})
