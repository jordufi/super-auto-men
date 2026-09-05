import type { UnitDef } from '@sam/sim'

export const duck: UnitDef = {
  id: 'duck',
  name: 'Duck',
  tier: 1,
  base: { atk: 1, hp: 3 },
  sprite: 'duck',
  ability: {
    trigger: 'onSell',
    text: 'Sell: give shop units +{hp} health.',
    effect: { kind: 'shop', op: 'buffShopUnits', atk: [0, 0, 0], hp: [1, 2, 3] },
  },
}
