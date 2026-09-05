import type { UnitDef } from '@sam/sim'

export const ant: UnitDef = {
  id: 'ant',
  name: 'Ant',
  tier: 1,
  base: { atk: 2, hp: 1 },
  sprite: 'ant',
  ability: {
    trigger: 'onFaint',
    text: 'Faint: give one random friend +{atk}/+{hp}.',
    effect: {
      kind: 'buff',
      target: { kind: 'randomFriend', count: 1, excludeSelf: true },
      atk: [2, 4, 6],
      hp: [1, 2, 3],
      temporary: false,
    },
  },
}
