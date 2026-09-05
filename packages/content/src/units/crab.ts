import type { UnitDef } from '@sam/sim'

export const crab: UnitDef = {
  id: 'crab',
  name: 'Crab',
  tier: 2,
  base: { atk: 3, hp: 3 },
  sprite: 'crab',
  ability: {
    trigger: 'onBuy',
    text: 'Buy: copy {percent}% of the healthiest friend’s health.',
    effect: { kind: 'custom', fn: 'copyHighestHp', args: { percent: [50, 100, 150] } },
  },
}
