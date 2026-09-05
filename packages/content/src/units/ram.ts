import type { UnitDef } from '@sam/sim'

/** Token: summoned by the Sheep. */
export const ram: UnitDef = {
  id: 'ram',
  name: 'Ram',
  tier: 0,
  base: { atk: 2, hp: 2 },
  sprite: 'ram',
}
