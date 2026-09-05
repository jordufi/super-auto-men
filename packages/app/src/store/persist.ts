// A saved run is just {seed, actions, opponents}: replaying it rebuilds the state exactly
// (ARCHITECTURE.md §4.6). No ShopState is ever serialized, so a rules change cannot load a
// half-valid board — it either replays or the save is dropped.
//
// `localStorage` is a trust boundary: the player can edit it, and from Phase 13 the opponents in
// it are ghost teams that came from other people's devices. Everything read back is validated
// before it can reach the sim, and a save that is dropped says WHY — silently deleting someone's
// run with nothing in the console is not debuggable.
import type { ShopAction, Team } from '@sam/sim'
import { safeParseTeams } from '@sam/content'

const KEY = 'sam.run.v1'
export const SAVE_VERSION = 1

export interface SavedRun {
  saveVersion: number
  seed: number
  actions: ShopAction[]
  /** The opponent fought on each turn, index turn-1. */
  opponents: Team[]
}

export interface LoadResult {
  run: SavedRun | null
  /** Why the save was dropped. `null` when there simply was not one. */
  error: string | null
}

const NONE: LoadResult = { run: null, error: null }

export function saveRun(run: SavedRun): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(run))
  } catch {
    // Private mode or a full quota: playing on without a save is better than crashing.
  }
}

/** Drops and reports an unreadable save rather than letting it reach the sim. */
export function loadRun(): LoadResult {
  let raw: string | null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return NONE // storage blocked (private mode): behave as if there were no save
  }
  if (!raw) return NONE

  let parsed: Partial<SavedRun>
  try {
    parsed = JSON.parse(raw) as Partial<SavedRun>
  } catch {
    return dropped('the saved run is not valid JSON')
  }

  if (parsed.saveVersion !== SAVE_VERSION) {
    return dropped(`the save is version ${String(parsed.saveVersion)}, this build reads version ${SAVE_VERSION}`)
  }
  if (typeof parsed.seed !== 'number' || !Number.isFinite(parsed.seed)) {
    return dropped('the saved run has no usable seed')
  }
  if (!Array.isArray(parsed.actions)) return dropped('the saved run has no action list')

  const opponents = safeParseTeams(parsed.opponents)
  if (!opponents) return dropped('the saved run has an opponent team this build cannot read')

  return { run: { saveVersion: SAVE_VERSION, seed: parsed.seed, actions: parsed.actions, opponents }, error: null }
}

function dropped(error: string): LoadResult {
  clearRun()
  return { run: null, error }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
