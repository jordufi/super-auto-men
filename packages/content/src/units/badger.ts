import type { UnitDef } from '@sam/sim'

export const badger: UnitDef = {
  id: 'badger',
  name: 'Badger',
  tier: 3,
  base: { atk: 5, hp: 4 },
  sprite: 'badger',
  ability: {
    trigger: 'onFaint',
    text: 'Faint: deal damage equal to this attack to the units next to it.',
    effect: { kind: 'custom', fn: 'badgerFaint' },
  },
}
