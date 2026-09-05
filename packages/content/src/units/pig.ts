import type { UnitDef } from '@sam/sim'

export const pig: UnitDef = {
  id: 'pig',
  name: 'Pig',
  tier: 1,
  base: { atk: 3, hp: 1 },
  sprite: 'pig',
  ability: {
    trigger: 'onSell',
    text: 'Sell: gain {amount} gold.',
    effect: { kind: 'gold', amount: [1, 2, 3] },
  },
}
