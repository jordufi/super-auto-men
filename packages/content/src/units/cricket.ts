import type { UnitDef } from '@sam/sim'

export const cricket: UnitDef = {
  id: 'cricket',
  name: 'Cricket',
  tier: 1,
  base: { atk: 1, hp: 2 },
  sprite: 'cricket',
  ability: {
    trigger: 'onFaint',
    text: 'Faint: summon one {atk}/{hp} Zombie Cricket.',
    effect: {
      kind: 'summon',
      defId: 'zombieCricket',
      count: [1, 1, 1],
      stats: { atk: [1, 2, 3], hp: [1, 2, 3] },
    },
  },
}
