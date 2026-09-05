import type { UnitDef } from '@sam/sim'

export const dog: UnitDef = {
  id: 'dog',
  name: 'Dog',
  tier: 3,
  base: { atk: 2, hp: 2 },
  sprite: 'dog',
  ability: {
    trigger: 'onFriendSummoned',
    text: 'Friend summoned: gain +{atk}/+{hp}.',
    effect: {
      kind: 'buff',
      target: { kind: 'self' },
      atk: [1, 2, 3],
      hp: [1, 2, 3],
      temporary: false,
    },
  },
}
