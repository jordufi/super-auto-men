// How long each event type is shown, in ms at speed 1 (PLAN.md Phase 10 step 2).
import type { BattleEvent } from '@sam/sim'
import type { Speed } from '../store/urlParams'

export const DURATIONS: Record<BattleEvent['t'], number> = {
  startOfBattle: 1200,
  ability: 1100, // the call-out card has to be readable before it goes
  attack: 900,
  damage: 0, // rides on the attack (or on the ability that caused it)
  buff: 700,
  status: 700,
  summon: 800,
  faint: 700,
  levelUp: 0, // shop-only
  gold: 0,
  shop: 0,
  end: 1200,
}

export function durationOf(event: BattleEvent, speed: Speed): number {
  // Neither waits on a clock: 'instant' skips the replay, 'manual' advances on a tap.
  if (speed === 'instant' || speed === 'manual') return 0
  return DURATIONS[event.t] / speed
}
