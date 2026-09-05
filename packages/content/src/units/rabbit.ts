import type { UnitDef } from '@sam/sim'

export const rabbit: UnitDef = {
  id: 'rabbit',
  name: 'Rabbit',
  tier: 3,
  base: { atk: 3, hp: 2 },
  sprite: 'rabbit',
  ability: {
    trigger: 'onFriendEatsFood',
    text: 'Friend eats food: give it +{hp} health.',
    effect: {
      kind: 'buff',
      target: { kind: 'triggerSource' },
      atk: [0, 0, 0],
      hp: [1, 2, 3],
      temporary: false,
    },
  },
}
