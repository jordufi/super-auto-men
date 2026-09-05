import type { UnitDef } from '@sam/sim'

export const rat: UnitDef = {
  id: 'rat',
  name: 'Rat',
  tier: 2,
  base: { atk: 4, hp: 5 },
  sprite: 'rat',
  ability: {
    trigger: 'onFaint',
    text: 'Faint: summon {count} Dirty Rat for the enemy.',
    effect: { kind: 'custom', fn: 'summonEnemy', args: { defId: 'dirtyRat', count: [1, 2, 3] } },
  },
}
