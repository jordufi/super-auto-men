import type { UnitDef } from '@sam/sim'

export const spider: UnitDef = {
  id: 'spider',
  name: 'Spider',
  tier: 2,
  base: { atk: 2, hp: 2 },
  sprite: 'spider',
  ability: {
    trigger: 'onFaint',
    text: 'Faint: summon a random tier 3 unit as a {atk}/{hp}.',
    effect: { kind: 'custom', fn: 'spiderSummon', args: { tier: 3, atk: 2, hp: 2 } },
  },
}
