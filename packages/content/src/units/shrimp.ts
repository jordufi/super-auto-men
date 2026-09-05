import type { UnitDef } from '@sam/sim'

export const shrimp: UnitDef = {
  id: 'shrimp',
  name: 'Shrimp',
  tier: 2,
  base: { atk: 2, hp: 3 },
  sprite: 'shrimp',
  ability: {
    trigger: 'onSell',
    text: 'Sell: give a random friend +{hp} health.',
    effect: {
      kind: 'buff',
      target: { kind: 'randomFriend', count: 1, excludeSelf: true },
      atk: [0, 0, 0],
      hp: [1, 2, 3],
      temporary: false,
    },
  },
}
