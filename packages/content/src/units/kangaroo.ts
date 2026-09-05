import type { UnitDef } from '@sam/sim'

export const kangaroo: UnitDef = {
  id: 'kangaroo',
  name: 'Kangaroo',
  tier: 3,
  base: { atk: 1, hp: 2 },
  sprite: 'kangaroo',
  ability: {
    trigger: 'onFriendAheadAttacks',
    text: 'Friend ahead attacks: gain +{atk}/+{hp}.',
    effect: {
      kind: 'buff',
      target: { kind: 'self' },
      atk: [2, 4, 6],
      hp: [2, 4, 6],
      temporary: false,
    },
  },
}
