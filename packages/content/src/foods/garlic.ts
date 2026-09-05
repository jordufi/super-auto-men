import type { FoodDef } from '@sam/sim'

export const garlic: FoodDef = {
  id: 'garlic',
  name: 'Garlic',
  tier: 3,
  sprite: 'garlic',
  text: 'Take 2 less damage from every hit, to a minimum of 1.',
  effect: { kind: 'status', target: { kind: 'self' }, status: 'garlic' },
}
