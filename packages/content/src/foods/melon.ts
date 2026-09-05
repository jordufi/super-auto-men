import type { FoodDef } from '@sam/sim'

export const melon: FoodDef = {
  id: 'melon',
  name: 'Melon Armor',
  tier: 4,
  sprite: 'melon',
  text: 'Block 20 damage from the next hit taken.',
  effect: { kind: 'status', target: { kind: 'self' }, status: 'meleeShield' },
}
