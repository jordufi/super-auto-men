// The invariant the whole save system rests on: a run rebuilt from { seed, actions, opponents }
// must be byte-identical to the run that was played incrementally (ARCHITECTURE.md §4.6).
//
// `run.test.ts` in sim already covers this, but only against a single-unit fake content pack.
// Real drift would come from the real roster: abilities that consume RNG, summons, level-ups,
// statuses and shop rolls. So this fuzzes seeded action sequences against the actual content.
import { describe, expect, it } from 'vitest'
import type { ShopAction, ShopState } from '@sam/sim'
import { applyAction, endTurnAndBattle, makeRng, replayRun, startRun } from '@sam/sim'
import { CONTENT, botTeam } from '../src'

/**
 * A plausible shop action, drawn from its OWN rng so generating it never touches the run's rng.
 * Invalid ones are fine and are the point: `applyAction` must drop them without recording them.
 */
function randomAction(rng: ReturnType<typeof makeRng>): ShopAction {
  switch (rng.int(6)) {
    case 0:
      return { t: 'buyUnit', shopIndex: rng.int(5), slot: rng.int(5) }
    case 1:
      return { t: 'buyFood', shopIndex: rng.int(7), target: rng.int(5) }
    case 2:
      return { t: 'sell', slot: rng.int(5) }
    case 3:
      return { t: 'reorder', from: rng.int(5), to: rng.int(5) }
    case 4:
      return { t: 'freeze', shopIndex: rng.int(7) }
    default:
      return { t: 'roll' }
  }
}

/**
 * One turn played to actually reach the interesting states: random play almost never merges (it
 * needs the same defId twice before the gold runs out), so it would never exercise level-ups.
 * Deterministic given the state, which is all a replay needs.
 */
function greedyAction(state: ShopState): ShopAction | null {
  if (state.gold < 3) return null
  const { team, shop } = state

  // A merge if one is available, so level-ups actually happen.
  for (const [shopIndex, item] of shop.entries()) {
    if (item.kind !== 'unit') continue
    const slot = team.findIndex((u) => u?.defId === item.defId && u.level < 3)
    if (slot >= 0) return { t: 'buyUnit', shopIndex, slot }
  }
  // Otherwise fill the board.
  const empty = team.indexOf(null)
  if (empty >= 0) {
    const shopIndex = shop.findIndex((x) => x.kind === 'unit')
    if (shopIndex >= 0) return { t: 'buyUnit', shopIndex, slot: empty }
  }
  // A full board buys food, so units end up holding statuses.
  const foodIndex = shop.findIndex((x) => x.kind === 'food')
  const target = team.findIndex((u) => u !== null)
  if (foodIndex >= 0 && target >= 0) return { t: 'buyFood', shopIndex: foodIndex, target }
  return null
}

/** Everything about a run that must survive a replay. `rng` is rebuilt, so it is excluded. */
function snapshot(run: { state: ShopState; actions: ShopAction[] }): string {
  return JSON.stringify({ state: run.state, actions: run.actions })
}

describe('replay integrity with the real roster', () => {
  it('60 fuzzed runs replay to a byte-identical state', () => {
    let totalActions = 0
    let sawLevelUp = false
    let sawStatus = false

    for (let seed = 1; seed <= 60; seed++) {
      const scriptRng = makeRng(seed * 7717)
      const run = startRun(seed, CONTENT)

      // Up to 6 turns. Half the runs play greedily (merges, level-ups, food) and half play
      // randomly (odd orderings, refused actions, sells); both must replay identically.
      const greedy = seed % 2 === 0
      for (let turn = 0; turn < 6 && run.state.phase === 'shop'; turn++) {
        if (greedy) {
          for (let i = 0; i < 8; i++) {
            const action = greedyAction(run.state)
            if (!action) break
            applyAction(run, action, CONTENT)
          }
        } else {
          const n = scriptRng.int(9)
          for (let i = 0; i < n; i++) applyAction(run, randomAction(scriptRng), CONTENT)
        }
        endTurnAndBattle(run, botTeam(run.state.turn), CONTENT)
      }

      totalActions += run.actions.length
      sawLevelUp ||= run.state.team.some((u) => u !== null && u.level > 1)
      sawStatus ||= run.state.team.some((u) => u !== null && u.statuses.length > 0)

      const replayed = replayRun(run.seed, run.actions, run.opponents, CONTENT)
      expect(snapshot(replayed), `seed ${seed}`).toBe(snapshot(run))
      expect(replayed.lastBattle, `seed ${seed} battle`).toEqual(run.lastBattle)
    }

    // Guard the guard: if the fuzz stops actually buying and fighting, this test proves nothing.
    expect(totalActions).toBeGreaterThan(200)
    expect(sawLevelUp, 'no run ever levelled a unit up').toBe(true)
    expect(sawStatus, 'no run ever left a unit holding a food').toBe(true)
  })

  it('a replay is stable when it is replayed again', () => {
    const run = startRun(99, CONTENT)
    const rng = makeRng(1234)
    for (let turn = 0; turn < 5 && run.state.phase === 'shop'; turn++) {
      for (let i = 0; i < 6; i++) applyAction(run, randomAction(rng), CONTENT)
      endTurnAndBattle(run, botTeam(run.state.turn), CONTENT)
    }
    const once = replayRun(run.seed, run.actions, run.opponents, CONTENT)
    const twice = replayRun(run.seed, once.actions, once.opponents, CONTENT)
    expect(snapshot(twice)).toBe(snapshot(once))
  })
})
