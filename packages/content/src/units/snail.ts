import type { UnitDef } from '@sam/sim'

export const snail: UnitDef = {
  id: 'snail',
  name: 'Snail',
  tier: 3,
  base: { atk: 2, hp: 2 },
  sprite: 'snail',
  ability: {
    trigger: 'onBuy',
    text: 'Buy: if you lost the last battle, give all friends +{atk}/+{hp}.',
    effect: { kind: 'custom', fn: 'snailBuff', args: { atk: [2, 2, 2], hp: [1, 1, 1] } },
  },
}
