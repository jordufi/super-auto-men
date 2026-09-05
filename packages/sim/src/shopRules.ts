// Shop economy constants (PLAN.md §1.1, §1.2). Changing any of these is a rules change: update goldens.

export const START_LIVES = 5
export const WIN_TROPHIES = 10
export const TURN_GOLD = 10
export const UNIT_COST = 3
export const FOOD_COST = 3
export const ROLL_COST = 1

export function unitSlotsForTurn(turn: number): number {
  return turn <= 4 ? 3 : turn <= 8 ? 4 : 5
}

export function foodSlotsForTurn(turn: number): number {
  return turn <= 2 ? 1 : 2
}

/** Tier 1 from turn 1, tier 2 from turn 3, tier 3 from turn 5 ... tier 6 from turn 11. */
export function maxTierForTurn(turn: number): number {
  return Math.min(6, Math.floor((turn + 1) / 2))
}
