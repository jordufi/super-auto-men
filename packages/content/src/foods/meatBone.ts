import type { FoodDef } from '@sam/sim'

export const meatBone: FoodDef = {
  id: 'meatBone',
  name: 'Meat Bone',
  tier: 2,
  sprite: 'meatBone',
  text: 'Attack +5.',
  effect: { kind: 'status', target: { kind: 'self' }, status: 'bone' },
}
