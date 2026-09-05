import type { UnitDef } from '@sam/sim'

export const elephant: UnitDef = {
  id: 'elephant',
  name: 'Elephant',
  tier: 2,
  base: { atk: 3, hp: 5 },
  sprite: 'elephant',
  ability: {
    trigger: 'onAfterAttack',
    text: 'After attack: deal {amount} damage to {count} friends behind.',
    effect: { kind: 'custom', fn: 'elephantBehind', args: { amount: [1, 1, 1], count: [1, 2, 3] } },
  },
}
