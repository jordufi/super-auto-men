import type { FoodDef } from '@sam/sim'

export const honey: FoodDef = {
  id: 'honey',
  name: 'Honey',
  tier: 1,
  sprite: 'honey',
  text: 'Faint: summon a 1/1 Bee.',
  effect: { kind: 'status', target: { kind: 'self' }, status: 'honey' },
}
