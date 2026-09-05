import type { FoodDef } from '@sam/sim'

export const cupcake: FoodDef = {
  id: 'cupcake',
  name: 'Cupcake',
  tier: 2,
  sprite: 'cupcake',
  text: 'Give one unit +{atk}/+{hp} until the end of the battle.',
  effect: {
    kind: 'buff',
    target: { kind: 'self' },
    atk: [3, 3, 3],
    hp: [3, 3, 3],
    temporary: true,
  },
}
