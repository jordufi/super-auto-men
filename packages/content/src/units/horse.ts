import type { UnitDef } from '@sam/sim'

export const horse: UnitDef = {
  id: 'horse',
  name: 'Horse',
  tier: 1,
  base: { atk: 2, hp: 1 },
  sprite: 'horse',
  ability: {
    trigger: 'onFriendSummoned',
    text: 'Friend summoned: give it +{atk} attack until end of battle.',
    effect: {
      kind: 'buff',
      target: { kind: 'triggerSource' },
      atk: [1, 2, 3],
      hp: [0, 0, 0],
      temporary: true,
    },
  },
}
