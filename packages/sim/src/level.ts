import type { Level } from './types'

/** exp runs 0-5. Level 1 = exp 0-1, level 2 = exp 2-4, level 3 = exp 5. (PLAN.md §1.4) */
export const MAX_EXP = 5

export function levelFromExp(exp: number): Level {
  if (exp >= 5) return 3
  if (exp >= 2) return 2
  return 1
}

/** Minimum exp that yields the given level. */
export function expForLevel(level: Level): number {
  return level === 3 ? 5 : level === 2 ? 2 : 0
}
