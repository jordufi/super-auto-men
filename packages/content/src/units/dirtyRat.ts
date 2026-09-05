import type { UnitDef } from '@sam/sim'

/** Token: summoned for the enemy by the Rat. Never appears in the shop. */
export const dirtyRat: UnitDef = {
  id: 'dirtyRat',
  name: 'Dirty Rat',
  tier: 0,
  base: { atk: 1, hp: 1 },
  sprite: 'dirtyRat',
}
