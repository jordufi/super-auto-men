import type { FoodDef } from '@sam/sim'

export const apple: FoodDef = {
  id: 'apple',
  name: 'Apple',
  tier: 1,
  sprite: 'apple',
  text: 'Give one unit +1/+1.',
  effect: {
    kind: 'buff',
    target: { kind: 'self' },
    atk: [1, 1, 1],
    hp: [1, 1, 1],
    temporary: false,
  },
}
