// Pure presentation state. Never holds gameplay state — that lives in runStore.
import { create } from 'zustand'
import type { Screen, Speed } from './urlParams'

/** What the player has tapped and is about to act on. */
export type Selection = { kind: 'shop'; index: number } | { kind: 'team'; slot: number } | null

export interface DragState {
  kind: 'shop' | 'team'
  /** shop index or team slot */
  from: number
  /** pointer position in stage logical coordinates */
  x: number
  y: number
  over: number | null
  overKind: 'team' | 'sell' | null
}

export interface UiStore {
  screen: Screen
  speed: Speed
  /** 'reduced' is forced (dev/e2e param); 'auto' defers to the system setting. */
  motion: 'auto' | 'reduced'
  selected: Selection
  drag: DragState | null
  setScreen: (screen: Screen) => void
  setSpeed: (speed: Speed) => void
  setMotion: (motion: 'auto' | 'reduced') => void
  select: (selection: Selection) => void
  setDrag: (drag: DragState | null) => void
}

export const useUiStore = create<UiStore>((set) => ({
  screen: 'menu',
  speed: 'manual',
  motion: 'auto',
  selected: null,
  drag: null,
  setScreen: (screen) => set({ screen, selected: null }),
  setSpeed: (speed) => set({ speed }),
  setMotion: (motion) => set({ motion }),
  select: (selected) => set({ selected }),
  setDrag: (drag) => set({ drag }),
}))
