// How long each event type is shown, in ms at speed 1 (PLAN.md Phase 10 step 2).
import type { BattleEvent } from '@sam/sim'
import type { Speed } from '../store/urlParams'

export const DURATIONS: Record<BattleEvent['t'], number> = {
  startOfBattle: 600,
  ability: 500,
  attack: 450,
  damage: 0, // rides on the attack (or on the ability that caused it)
  buff: 350,
  status: 350,
  summon: 400,
  faint: 350,
  levelUp: 0, // shop-only
  gold: 0,
  shop: 0,
  end: 800,
}

export function durationOf(event: BattleEvent, speed: Speed): number {
  if (speed === 'instant') return 0
  return DURATIONS[event.t] / speed
}
