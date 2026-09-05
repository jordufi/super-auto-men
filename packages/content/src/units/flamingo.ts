import type { UnitDef } from '@sam/sim'

export const flamingo: UnitDef = {
  id: 'flamingo',
  name: 'Flamingo',
  tier: 2,
  base: { atk: 3, hp: 1 },
  sprite: 'flamingo',
  ability: {
    trigger: 'onFaint',
    text: 'Faint: give the {count} friends behind +{atk}/+{hp}.',
    effect: {
      kind: 'buff',
      target: { kind: 'friendsBehind', count: [2, 2, 2] },
      atk: [1, 2, 3],
      hp: [1, 2, 3],
      temporary: false,
    },
  },
}
