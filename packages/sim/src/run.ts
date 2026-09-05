// A whole run is a fold over { seed, actions[] } plus the opponent teams (ARCHITECTURE.md §4.6).
import type { BattleEvent, BattleLog, ShopAction, ShopState, Team } from './types'
import type { ContentApi } from './content-types'
import { makeRng, type Rng } from './rng'
import { newShopState, shopReducer, startTurn } from './shop'
import { simulate } from './battle'
import { WIN_TROPHIES } from './shopRules'

export interface RunState {
  seed: number
  /** The shop RNG. Not serializable: `replayRun` rebuilds it from `seed` + `actions`. */
  rng: Rng
  state: ShopState
  actions: ShopAction[]
  /** The opponent fought on each turn, index turn-1. Stored so replays never depend on matchmaking. */
  opponents: Team[]
  lastBattle?: BattleLog | undefined
}

export function startRun(seed: number, content: ContentApi): RunState {
  const rng = makeRng(seed)
  const { state } = startTurn(newShopState(), rng, content)
  return { seed, rng, state, actions: [], opponents: [] }
}

/**
 * The battle seed depends only on the run seed and the turn, never on how many shop actions consumed
 * RNG. A player cannot fish for a better battle by rolling, and a battle can be replayed alone.
 */
export function battleSeed(runSeed: number, turn: number): number {
  return makeRng((runSeed + turn * 7919) >>> 0).int(2 ** 31)
}

/** Applies a shop action. Invalid actions are ignored and NOT recorded. `endTurn` goes through `endTurnAndBattle`. */
export function applyAction(run: RunState, action: ShopAction, content: ContentApi): BattleEvent[] {
  if (run.state.phase !== 'shop' || action.t === 'endTurn') return []
  const r = shopReducer(run.state, action, run.rng, content)
  if (r.state === run.state) return []
  run.state = r.state
  run.actions.push(action)
  return r.events
}

/** The run as it stood when the battle was fought, before the result was applied. */
export interface TurnSnapshot {
  turn: number
  gold: number
  lives: number
  trophies: number
}

export interface TurnResult {
  endEvents: BattleEvent[] // from onEndOfTurn abilities
  log: BattleLog
  startEvents: BattleEvent[] // from the next turn's onStartOfTurn abilities (empty if the run ended)
  /**
   * Lives/trophies/turn BEFORE this battle's result was applied. `endTurnAndBattle` advances the
   * run to the next shop turn immediately, so anything replaying the log (the battle screen) must
   * show this instead of the current state or it spoils the result.
   */
  before: TurnSnapshot
}

export function endTurnAndBattle(run: RunState, opponent: Team, content: ContentApi): TurnResult | null {
  if (run.state.phase !== 'shop') return null
  const ended = shopReducer(run.state, { t: 'endTurn' }, run.rng, content)
  run.actions.push({ t: 'endTurn' })
  const s = ended.state
  const before: TurnSnapshot = { turn: s.turn, gold: s.gold, lives: s.lives, trophies: s.trophies }
  const log = simulate({ name: 'You', slots: s.team }, opponent, battleSeed(run.seed, s.turn), s.turn, content)
  run.lastBattle = log
  run.opponents.push(opponent)

  const next: ShopState = { ...s, lastResult: log.result }
  if (log.result === 'a') next.trophies += 1
  if (log.result === 'b') next.lives -= 1

  if (next.trophies >= WIN_TROPHIES) {
    run.state = { ...next, phase: 'won' }
    return { endEvents: ended.events, log, startEvents: [], before }
  }
  if (next.lives <= 0) {
    run.state = { ...next, phase: 'lost' }
    return { endEvents: ended.events, log, startEvents: [], before }
  }
  const started = startTurn({ ...next, turn: next.turn + 1 }, run.rng, content)
  run.state = started.state
  return { endEvents: ended.events, log, startEvents: started.events, before }
}

/** Re-folds a run from scratch. The result must equal the incrementally played run. */
export function replayRun(seed: number, actions: ShopAction[], opponents: Team[], content: ContentApi): RunState {
  const run = startRun(seed, content)
  let turnIndex = 0
  for (const action of actions) {
    if (action.t === 'endTurn') {
      const opponent = opponents[turnIndex++]
      if (!opponent) throw new Error(`replayRun: no opponent recorded for turn ${turnIndex}`)
      endTurnAndBattle(run, opponent, content)
    } else {
      applyAction(run, action, content)
    }
  }
  return run
}
