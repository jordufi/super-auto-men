import type { UnitDef } from '@sam/sim'

export const hedgehog: UnitDef = {
  id: 'hedgehog',
  name: 'Hedgehog',
  tier: 2,
  base: { atk: 3, hp: 2 },
  sprite: 'hedgehog',
  ability: {
    trigger: 'onFaint',
    text: 'Faint: deal {amount} damage to every unit.',
    effect: { kind: 'damage', target: { kind: 'allUnits' }, amount: [2, 4, 6] },
  },
}
