import type { UnitDef } from '@sam/sim'

export const sheep: UnitDef = {
  id: 'sheep',
  name: 'Sheep',
  tier: 3,
  base: { atk: 2, hp: 2 },
  sprite: 'sheep',
  ability: {
    trigger: 'onFaint',
    text: 'Faint: summon {count} Rams as {atk}/{hp}.',
    effect: {
      kind: 'summon',
      defId: 'ram',
      count: [2, 2, 2],
      stats: { atk: [2, 4, 6], hp: [2, 4, 6] },
    },
  },
}
