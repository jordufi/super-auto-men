// A BattleLog becomes a list of steps to play. Pure: no timers, no React.
import type { BattleEvent, BattleLog } from '@sam/sim'
import type { Speed } from '../store/urlParams'
import { durationOf } from './durations'

export interface Step {
  /** Index into `log.events`. */
  index: number
  event: BattleEvent
  /** ms to wait before the next step. */
  duration: number
  /** Set when this step plays together with an earlier one: the damage of an attack. */
  parallelWith?: number
}

export function buildTimeline(log: BattleLog, speed: Speed): Step[] {
  const steps: Step[] = []
  log.events.forEach((event, index) => {
    const step: Step = { index, event, duration: durationOf(event, speed) }
    // Damage is never a step of its own: it belongs to whatever caused it (an attack or an
    // ability), so the number pops while that animation plays.
    const prev = steps[steps.length - 1]
    if (event.t === 'damage' && prev) {
      step.duration = 0
      step.parallelWith = prev.parallelWith ?? prev.index
    }
    steps.push(step)
  })
  return steps
}

export function totalDuration(steps: readonly Step[]): number {
  return steps.reduce((sum, s) => sum + s.duration, 0)
}

/** The events that play at the same moment as `steps[i]` — the step itself plus its parallel followers. */
export function groupAt(steps: readonly Step[], i: number): BattleEvent[] {
  const first = steps[i]
  if (!first) return []
  const out = [first.event]
  for (let j = i + 1; j < steps.length && steps[j]!.parallelWith !== undefined; j++) out.push(steps[j]!.event)
  return out
}
