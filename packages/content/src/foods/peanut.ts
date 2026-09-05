import type { FoodDef } from '@sam/sim'

export const peanut: FoodDef = {
  id: 'peanut',
  name: 'Peanut',
  tier: 6,
  sprite: 'peanut',
  text: 'Any hit this unit lands kills its target outright.',
  effect: { kind: 'status', target: { kind: 'self' }, status: 'poison' },
}
