import type { UnitDef } from '@sam/sim'

export const mosquito: UnitDef = {
  id: 'mosquito',
  name: 'Mosquito',
  tier: 1,
  base: { atk: 2, hp: 2 },
  sprite: 'mosquito',
  ability: {
    trigger: 'onStartOfBattle',
    text: 'Start of battle: deal {amount} damage to {count} random enemies.',
    effect: {
      kind: 'damage',
      target: { kind: 'randomEnemy', count: [1, 2, 3] },
      amount: [1, 1, 1],
    },
  },
}
