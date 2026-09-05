// The ONLY module allowed to call sim mutators (PLAN.md Phase 7, CLAUDE.md project conventions).
// Everything the UI does to the game goes through `dispatch` / `endTurn`.
import { create } from 'zustand'
import type { BattleEvent, BattleLog, ShopAction, ShopState } from '@sam/sim'
import { type RunState, applyAction, endTurnAndBattle, startRun } from '@sam/sim'
import { CONTENT, botTeam } from '@sam/content'

export interface RunStore {
  run: RunState | null
  /** Mirror of `run.state`. The reducer returns a new object, so this drives re-renders. */
  state: ShopState | null
  /** Events produced by the most recent action, for the debug log. */
  events: BattleEvent[]
  /** Bumped whenever the reducer refused an action, so the UI can flash the gold counter. */
  refused: number
  lastBattle: BattleLog | null
  startRun: (seed: number) => void
  dispatch: (action: ShopAction) => void
  endTurn: () => void
  reset: () => void
}

export const useRunStore = create<RunStore>((set, get) => ({
  run: null,
  state: null,
  events: [],
  refused: 0,
  lastBattle: null,

  startRun: (seed) => {
    const run = startRun(seed, CONTENT)
    set({ run, state: run.state, events: [], lastBattle: null, refused: 0 })
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
    set({ state: run.state, events })
  },

  endTurn: () => {
    const { run } = get()
    if (!run) return
    const result = endTurnAndBattle(run, botTeam(run.state.turn), CONTENT)
    if (!result) return
    set({
      state: run.state,
      events: [...result.endEvents, ...result.startEvents],
      lastBattle: result.log,
    })
  },

  reset: () => set({ run: null, state: null, events: [], lastBattle: null, refused: 0 }),
}))
