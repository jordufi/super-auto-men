import type { UnitDef } from '@sam/sim'

export const beaver: UnitDef = {
  id: 'beaver',
  name: 'Beaver',
  tier: 1,
  base: { atk: 2, hp: 2 },
  sprite: 'beaver',
  ability: {
    trigger: 'onSell',
    text: 'Sell: give two random friends +{hp} health.',
    effect: {
      kind: 'buff',
      target: { kind: 'randomFriend', count: 2, excludeSelf: true },
      atk: [0, 0, 0],
      hp: [1, 2, 3],
      temporary: false,
    },
  },
}
