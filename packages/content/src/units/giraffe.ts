import type { UnitDef } from '@sam/sim'

export const giraffe: UnitDef = {
  id: 'giraffe',
  name: 'Giraffe',
  tier: 3,
  base: { atk: 2, hp: 5 },
  sprite: 'giraffe',
  ability: {
    trigger: 'onEndOfTurn',
    text: 'End of turn: give the {count} friends ahead +{atk}/+{hp}.',
    effect: {
      kind: 'buff',
      target: { kind: 'friendsAhead', count: [1, 2, 3] },
      atk: [1, 1, 1],
      hp: [1, 1, 1],
      temporary: false,
    },
  },
}
