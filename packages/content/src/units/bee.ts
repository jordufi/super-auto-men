import type { UnitDef } from '@sam/sim'

/** Token: left behind by a unit that was holding honey. */
export const bee: UnitDef = {
  id: 'bee',
  name: 'Bee',
  tier: 0,
  base: { atk: 1, hp: 1 },
  sprite: 'bee',
}
