import type { FoodDef } from '@sam/sim'

export const cannedFood: FoodDef = {
  id: 'cannedFood',
  name: 'Canned Food',
  tier: 3,
  sprite: 'cannedFood',
  text: 'Every unit in the shop, now and later, gets +{atk}/+{hp}.',
  effect: {
    kind: 'shop',
    op: 'buffShopUnitsPermanent',
    atk: [2, 2, 2],
    hp: [1, 1, 1],
  },
}
