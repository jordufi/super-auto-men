import type { UnitDef } from '@sam/sim'

/** Token summoned by Cricket. Tier 0: never appears in the shop. */
export const zombieCricket: UnitDef = {
  id: 'zombieCricket',
  name: 'Zombie Cricket',
  tier: 0,
  base: { atk: 1, hp: 1 },
  sprite: 'zombieCricket',
}
