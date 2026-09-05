import { describe, expect, it } from 'vitest'
import type { Team, UnitDef } from '../src'
import { applyAction, endTurnAndBattle, replayRun, startRun } from '../src/run'
import { unitsOf } from '../src/board'
import { fakeContent } from './fakeContent'
import { team, u } from './helpers'

const mosq: UnitDef = {
  id: 'mosq',
  name: 'Mosq',
  tier: 1,
  base: { atk: 2, hp: 2 },
  sprite: 'mosq',
  ability: {
    trigger: 'onStartOfBattle',
    text: 'sting',
    effect: { kind: 'damage', target: { kind: 'randomEnemy', count: 1 }, amount: [1, 1, 1] },
  },
}
// The shop pool has exactly one unit, so "buy shop slot 0" always yields a mosq.
const content = fakeContent([mosq])
const empty: Team = team([], 1, 'Bot')
const strong: Team = team([u('wall', 50, 50)], 1, 'Bot')

const snapshot = (r: ReturnType<typeof startRun>) => JSON.stringify({ state: r.state, actions: r.actions })

describe('run', () => {
  it('startRun: turn 1, 10 gold, 5 lives, a rolled shop; same seed -> same state', () => {
    const r = startRun(42, content)
    expect(r.state).toMatchObject({ turn: 1, gold: 10, lives: 5, trophies: 0, phase: 'shop' })
    expect(r.state.shop.filter((x) => x.kind === 'unit')).toHaveLength(3)
    expect(snapshot(startRun(42, content))).toBe(snapshot(r))
  })

  it('a scripted 3-turn run tracks trophies, lives and turn', () => {
    const r = startRun(1, content)
    applyAction(r, { t: 'buyUnit', shopIndex: 0, slot: 0 }, content)
    const t1 = endTurnAndBattle(r, empty, content)!
    expect(t1.log.result).toBe('a')
    expect(r.state).toMatchObject({ turn: 2, trophies: 1, lives: 5, gold: 10, phase: 'shop', lastResult: 'a' })

    const t2 = endTurnAndBattle(r, strong, content)!
    expect(t2.log.result).toBe('b')
    expect(r.state).toMatchObject({ turn: 3, trophies: 1, lives: 4 })

    const t3 = endTurnAndBattle(r, team([u('mosq', 2, 2)], 1, 'Bot'), content)!
    expect(['a', 'b', 'draw']).toContain(t3.log.result)
    expect(r.state.turn).toBe(4)
    expect(r.actions.filter((a) => a.t === 'endTurn')).toHaveLength(3)
    expect(r.opponents).toHaveLength(3)
  })

  it('invalid actions are ignored and not recorded', () => {
    const r = startRun(1, content)
    expect(applyAction(r, { t: 'buyUnit', shopIndex: 9, slot: 0 }, content)).toEqual([])
    expect(applyAction(r, { t: 'endTurn' }, content)).toEqual([])
    expect(r.actions).toEqual([])
  })

  it('replayRun reproduces an incrementally played run exactly', () => {
    const r = startRun(7, content)
    applyAction(r, { t: 'roll' }, content)
    applyAction(r, { t: 'buyUnit', shopIndex: 0, slot: 1 }, content)
    endTurnAndBattle(r, empty, content)
    applyAction(r, { t: 'buyUnit', shopIndex: 1, slot: 0 }, content)
    applyAction(r, { t: 'freeze', shopIndex: 0 }, content)
    endTurnAndBattle(r, team([u('x', 1, 1)], 1, 'Bot'), content)
    applyAction(r, { t: 'sell', slot: 0 }, content)
    const replay = replayRun(r.seed, r.actions, r.opponents, content)
    expect(snapshot(replay)).toBe(snapshot(r))
  })

  it('5 losses -> lost; 10 wins -> won; no actions accepted afterwards', () => {
    const lose = startRun(3, content)
    for (let i = 0; i < 5; i++) endTurnAndBattle(lose, strong, content)
    expect(lose.state).toMatchObject({ phase: 'lost', lives: 0, turn: 5 })
    expect(endTurnAndBattle(lose, strong, content)).toBeNull()

    const win = startRun(3, content)
    applyAction(win, { t: 'buyUnit', shopIndex: 0, slot: 0 }, content)
    for (let i = 0; i < 10; i++) endTurnAndBattle(win, empty, content)
    expect(win.state).toMatchObject({ phase: 'won', trophies: 10, turn: 10 })
  })

  it('the battle seed is decoupled from shop RNG use: an extra roll changes the shop, not the battle', () => {
    const a = startRun(11, content)
    applyAction(a, { t: 'buyUnit', shopIndex: 0, slot: 0 }, content)
    const b = startRun(11, content)
    applyAction(b, { t: 'roll' }, content)
    applyAction(b, { t: 'buyUnit', shopIndex: 0, slot: 0 }, content)
    expect(unitsOf(a.state.team).map((x) => x.defId)).toEqual(['mosq'])
    expect(unitsOf(b.state.team).map((x) => x.defId)).toEqual(['mosq'])
    const opp = team([u('s1', 1, 1), u('s2', 1, 1), u('s3', 1, 1)], 1, 'Bot')
    const la = endTurnAndBattle(a, opp, content)!.log
    const lb = endTurnAndBattle(b, opp, content)!.log
    expect(la.seed).toBe(lb.seed)
    expect(JSON.stringify(la.events)).toBe(JSON.stringify(lb.events))
    // ...while the shops after the new turn differ because b consumed more shop RNG
    expect(a.state.gold).toBe(b.state.gold)
  })

  it('temporary buffs are cleared for the next shop phase', () => {
    const r = startRun(5, content)
    applyAction(r, { t: 'buyUnit', shopIndex: 0, slot: 0 }, content)
    r.state.team[0]!.tmpAtk = 4 // as if a temporary buff happened in the shop
    endTurnAndBattle(r, empty, content)
    expect(r.state.team[0]!.tmpAtk).toBe(0)
  })
})
