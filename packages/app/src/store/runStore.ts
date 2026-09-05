// The ONLY module allowed to call sim mutators (PLAN.md Phase 7, CLAUDE.md project conventions).
// Everything the UI does to the game goes through `dispatch` / `endTurn`.
import { create } from 'zustand'
import type { BattleEvent, BattleLog, ShopAction, ShopState, TurnSnapshot } from '@sam/sim'
import { type RunState, applyAction, endTurnAndBattle, makeRng, replayRun, startRun } from '@sam/sim'
import { CONTENT } from '@sam/content'
import { LocalBots, type OpponentSource } from '../net/opponents'
import { SAVE_VERSION, clearRun, loadRun, saveRun } from './persist'

export interface RunStore {
  run: RunState | null
  /** Mirror of `run.state`. The reducer returns a new object, so this drives re-renders. */
  state: ShopState | null
  /** Events produced by the most recent action, for the debug log. */
  events: BattleEvent[]
  /** Bumped whenever the reducer refused an action, so the UI can flash the gold counter. */
  refused: number
  /** Set when a saved run had to be dropped, so the menu can say so instead of doing nothing. */
  loadError: string | null
  lastBattle: BattleLog | null
  /** The run as it stood when `lastBattle` was fought. The battle screen shows this, not `state`,
   *  so replaying the log does not spoil its own result. */
  battleSnapshot: TurnSnapshot | null
  opponents: OpponentSource
  startRun: (seed: number) => void
  continueRun: () => boolean
  dispatch: (action: ShopAction) => void
  endTurn: () => void
  reset: () => void
}

/** Opponent picking must not touch the run RNG, or a replay would drift from the played run. */
const opponentRng = (seed: number, turn: number): ReturnType<typeof makeRng> => makeRng((seed + turn * 104729) >>> 0)

function persist(run: RunState): void {
  saveRun({ saveVersion: SAVE_VERSION, seed: run.seed, actions: run.actions, opponents: run.opponents })
}

export const useRunStore = create<RunStore>((set, get) => ({
  run: null,
  state: null,
  events: [],
  refused: 0,
  loadError: null,
  lastBattle: null,
  battleSnapshot: null,
  opponents: LocalBots,

  startRun: (seed) => {
    const run = startRun(seed, CONTENT)
    clearRun()
    persist(run)
    set({ run, state: run.state, events: [], lastBattle: null, battleSnapshot: null, refused: 0, loadError: null })
  },

  /**
   * Rebuilds a saved run by replaying it. Returns false if there is nothing to continue, and sets
   * `loadError` when a save existed but had to be dropped — a rules change the save predates, or
   * (from Phase 13) a ghost opponent this build cannot replay. Never fail silently here: this is
   * the one place that can delete someone's run.
   */
  continueRun: () => {
    const { run: saved, error } = loadRun()
    if (!saved) {
      if (error) console.warn(`[sam] saved run dropped: ${error}`)
      set({ loadError: error })
      return false
    }
    try {
      const run = replayRun(saved.seed, saved.actions, saved.opponents, CONTENT)
      // A replayed run resumes in the shop, so there is no battle to show a snapshot for.
      set({ run, state: run.state, events: [], lastBattle: run.lastBattle ?? null, battleSnapshot: null, refused: 0, loadError: null })
      return true
    } catch (err) {
      // A save the current rules can no longer replay is not worth keeping, but losing a run
      // without a word in the console is how this becomes undebuggable in the wild.
      console.error('[sam] could not replay the saved run; dropping it', err)
      clearRun()
      set({ loadError: 'this saved run no longer replays under the current rules' })
      return false
    }
  },

  dispatch: (action) => {
    const { run } = get()
    if (!run) return
    const before = run.state
    const events = applyAction(run, action, CONTENT)
    if (run.state === before) {
      set({ events: [], refused: get().refused + 1 }) // the reducer refused: nothing changed
      return
    }
    persist(run)
    set({ state: run.state, events })
  },

  endTurn: () => {
    const { run, opponents } = get()
    if (!run) return
    const opponent = opponents.pick(run.state.turn, run.state.trophies, opponentRng(run.seed, run.state.turn))
    const result = endTurnAndBattle(run, opponent, CONTENT)
    if (!result) return
    persist(run)
    set({
      state: run.state,
      events: [...result.endEvents, ...result.startEvents],
      lastBattle: result.log,
      battleSnapshot: result.before,
    })
  },

  reset: () => {
    clearRun()
    set({ run: null, state: null, events: [], lastBattle: null, battleSnapshot: null, refused: 0, loadError: null })
  },
}))

/** True when a run is waiting to be continued (used by the menu). */
export function hasSavedRun(): boolean {
  return loadRun().run !== null
}
