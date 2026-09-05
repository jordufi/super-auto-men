import type { UnitDef } from '@sam/sim'

export const dodo: UnitDef = {
  id: 'dodo',
  name: 'Dodo',
  tier: 2,
  base: { atk: 2, hp: 3 },
  sprite: 'dodo',
  ability: {
    trigger: 'onStartOfBattle',
    text: 'Start of battle: give the friend ahead {percent}% of this attack.',
    effect: { kind: 'custom', fn: 'dodoShare', args: { percent: [50, 100, 150] } },
  },
}
