import type { UnitDef } from '@sam/sim'

export const ox: UnitDef = {
  id: 'ox',
  name: 'Ox',
  tier: 3,
  base: { atk: 1, hp: 4 },
  sprite: 'ox',
  ability: {
    trigger: 'onFriendFaints',
    text: 'Friend faints: gain melon armor and +{atk} attack.',
    effect: {
      kind: 'sequence',
      effects: [
        { kind: 'status', target: { kind: 'self' }, status: 'meleeShield' },
        {
          kind: 'buff',
          target: { kind: 'self' },
          atk: [2, 4, 6],
          hp: [0, 0, 0],
          temporary: false,
        },
      ],
    },
  },
}
