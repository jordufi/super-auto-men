// Plays a timeline with setTimeout (timers are fine in the app; only sim and content ban them).
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BattleLog } from '@sam/sim'
import type { Speed } from '../store/urlParams'
import { type Step, buildTimeline } from './timeline'

export interface Replay {
  steps: Step[]
  /** Index of the step being shown; equals steps.length when the replay is over. */
  cursor: number
  done: boolean
  /** Number of events applied to the board, for `boardAt`. */
  applied: number
  skip: () => void
  /** Advances one step. Only meaningful at speed 'manual', where nothing advances on its own. */
  next: () => void
}

/** Group heads only: the steps that consume time. Followers (damage) ride along with their head. */
function headsOf(steps: readonly Step[]): number[] {
  return steps.map((s, i) => (s.parallelWith === undefined ? i : -1)).filter((i) => i >= 0)
}

export function useReplay(log: BattleLog | null, speed: Speed): Replay {
  const steps = useMemo(() => (log ? buildTimeline(log, speed) : []), [log, speed])
  const heads = useMemo(() => headsOf(steps), [steps])
  const [head, setHead] = useState(0)

  // A new log restarts the replay (React's "adjust state during render" pattern).
  const [shownLog, setShownLog] = useState(log)
  if (shownLog !== log) {
    setShownLog(log)
    setHead(0)
  }

  const instant = speed === 'instant'
  // In manual mode the player is the clock: no timer is ever armed.
  const manual = speed === 'manual'

  useEffect(() => {
    if (instant || manual || head >= heads.length) return
    const wait = steps[heads[head]!]!.duration
    const t = window.setTimeout(() => setHead((h) => h + 1), wait)
    return () => window.clearTimeout(t)
  }, [head, heads, steps, instant, manual])

  const skip = useCallback(() => setHead(heads.length), [heads.length])
  const next = useCallback(() => setHead((h) => Math.min(h + 1, heads.length)), [heads.length])

  const at = instant ? heads.length : head
  const done = at >= heads.length
  const cursor = done ? steps.length : heads[at]!
  // Everything up to and including the current step's group is applied to the board.
  const applied = done ? steps.length : (heads[at + 1] ?? steps.length)

  return { steps, cursor, done, applied, skip, next }
}
