// Held-item statuses (PLAN.md §1.6). Pure arithmetic: no board access, no RNG.
import type { Status, UnitInstance } from './types'

export const BONE_ATK = 5
export const MELON_BLOCK = 20
export const GARLIC_REDUCTION = 2
export const GARLIC_MINIMUM = 1

export interface Incoming {
  amount: number
  /** A status that this hit used up and must be removed (melon). */
  consumed: Status | null
}

/**
 * How much of `amount` actually reaches the unit. Melon is checked first and is consumed by the
 * hit; garlic applies to every hit while it is held. Both apply to attack and ability damage.
 */
export function modifyIncoming(target: UnitInstance, amount: number): Incoming {
  if (amount <= 0) return { amount, consumed: null }
  if (target.statuses.includes('meleeShield')) {
    return { amount: Math.max(0, amount - MELON_BLOCK), consumed: 'meleeShield' }
  }
  if (target.statuses.includes('garlic')) {
    return { amount: Math.max(GARLIC_MINIMUM, amount - GARLIC_REDUCTION), consumed: null }
  }
  return { amount, consumed: null }
}

/** Peanut: a hit from this unit that lands at all is lethal. */
export function isPoisonous(attacker: UnitInstance): boolean {
  return attacker.statuses.includes('poison')
}

/** Honey: what this unit leaves behind when it faints. */
export function faintSummon(unit: UnitInstance): string | null {
  return unit.statuses.includes('honey') ? 'bee' : null
}

export function removeStatus(unit: UnitInstance, status: Status): void {
  unit.statuses = unit.statuses.filter((s) => s !== status)
}
