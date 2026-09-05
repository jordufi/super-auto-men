import type { UnitDef } from '@sam/sim'

export const peacock: UnitDef = {
  id: 'peacock',
  name: 'Peacock',
  tier: 2,
  base: { atk: 2, hp: 5 },
  sprite: 'peacock',
  ability: {
    trigger: 'onHurt',
    text: 'Hurt: gain +{atk} attack.',
    effect: {
      kind: 'buff',
      target: { kind: 'self' },
      atk: [2, 4, 6],
      hp: [0, 0, 0],
      temporary: false,
    },
  },
}
