import type { FoodDef } from '@sam/sim'

export const saladBowl: FoodDef = {
  id: 'saladBowl',
  name: 'Salad Bowl',
  tier: 3,
  sprite: 'saladBowl',
  text: 'Give {count} random friends +{atk}/+{hp}.',
  effect: {
    kind: 'buff',
    target: { kind: 'randomFriend', count: [2, 2, 2] },
    atk: [1, 1, 1],
    hp: [1, 1, 1],
    temporary: false,
  },
}
