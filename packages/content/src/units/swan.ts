import type { UnitDef } from '@sam/sim'

export const swan: UnitDef = {
  id: 'swan',
  name: 'Swan',
  tier: 2,
  base: { atk: 1, hp: 3 },
  sprite: 'swan',
  ability: {
    trigger: 'onStartOfTurn',
    text: 'Start of turn: gain {amount} gold.',
    effect: { kind: 'gold', amount: [1, 2, 3] },
  },
}
