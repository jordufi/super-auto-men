import type { UnitDef } from '@sam/sim'

export const otter: UnitDef = {
  id: 'otter',
  name: 'Otter',
  tier: 1,
  base: { atk: 1, hp: 2 },
  sprite: 'otter',
  ability: {
    trigger: 'onBuy',
    text: 'Buy: give {count} random friends +{atk}/+{hp}.',
    effect: {
      kind: 'buff',
      target: { kind: 'randomFriend', count: [1, 2, 3], excludeSelf: true },
      atk: [1, 1, 1],
      hp: [1, 1, 1],
      temporary: false,
    },
  },
}
