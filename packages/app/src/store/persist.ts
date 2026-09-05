// A saved run is just {seed, actions, opponents}: replaying it rebuilds the state exactly
// (ARCHITECTURE.md §4.6). No ShopState is ever serialized, so a rules change cannot load a
// half-valid board — it either replays or the save is dropped.
import type { ShopAction, Team } from '@sam/sim'

const KEY = 'sam.run.v1'
export const SAVE_VERSION = 1

export interface SavedRun {
  saveVersion: number
  seed: number
  actions: ShopAction[]
  /** The opponent fought on each turn, index turn-1. */
  opponents: Team[]
}

export function saveRun(run: SavedRun): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(run))
  } catch {
    // Private mode or a full quota: playing on without a save is better than crashing.
  }
}

export function loadRun(): SavedRun | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return null // storage blocked (private mode): behave as if there were no save
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<SavedRun>
    if (
      parsed.saveVersion !== SAVE_VERSION ||
      typeof parsed.seed !== 'number' ||
      !Array.isArray(parsed.actions) ||
      !Array.isArray(parsed.opponents)
    ) {
      clearRun()
      return null
    }
    return parsed as SavedRun
  } catch {
    clearRun()
    return null
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
