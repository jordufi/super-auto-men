import type { UnitDef } from '@sam/sim'

export const blowfish: UnitDef = {
  id: 'blowfish',
  name: 'Blowfish',
  tier: 3,
  base: { atk: 3, hp: 5 },
  sprite: 'blowfish',
  ability: {
    trigger: 'onHurt',
    text: 'Hurt: deal {amount} damage to a random enemy.',
    effect: { kind: 'damage', target: { kind: 'randomEnemy', count: 1 }, amount: [2, 4, 6] },
  },
}
