import type { UnitDef } from '@sam/sim'

export const fish: UnitDef = {
  id: 'fish',
  name: 'Fish',
  tier: 1,
  base: { atk: 2, hp: 3 },
  sprite: 'fish',
  ability: {
    trigger: 'onLevelUp',
    text: 'Level-up: give all friends +{atk}/+{hp}.',
    effect: {
      kind: 'buff',
      target: { kind: 'allFriends' },
      atk: [0, 1, 2], // L1 entry is unused: a unit cannot level up to level 1
      hp: [0, 1, 2],
      temporary: false,
    },
  },
}
