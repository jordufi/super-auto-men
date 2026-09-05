import type { UnitDef } from '@sam/sim'

export const camel: UnitDef = {
  id: 'camel',
  name: 'Camel',
  tier: 3,
  base: { atk: 2, hp: 5 },
  sprite: 'camel',
  ability: {
    trigger: 'onHurt',
    text: 'Hurt: give the friend behind +{atk}/+{hp}.',
    effect: {
      kind: 'buff',
      target: { kind: 'behind' },
      atk: [1, 2, 3],
      hp: [2, 4, 6],
      temporary: false,
    },
  },
}
