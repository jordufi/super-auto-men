import { z } from 'zod'
import type { AbilityDef, Effect, FoodDef, Lvl3, Target, Tier, UnitDef } from '@sam/sim'

export const Lvl3Schema: z.ZodType<Lvl3> = z.tuple([z.number(), z.number(), z.number()])

export const TierSchema: z.ZodType<Tier> = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
])

export const StatusSchema = z.enum(['meleeShield', 'garlic', 'bone', 'honey', 'poison'])

export const TriggerSchema = z.enum([
  'onBuy',
  'onSell',
  'onLevelUp',
  'onEatFood',
  'onFriendEatsFood',
  'onStartOfTurn',
  'onEndOfTurn',
  'onShopRoll',
  'onStartOfBattle',
  'onBeforeAttack',
  'onAfterAttack',
  'onHurt',
  'onFaint',
  'onKnockOut',
  'onFriendFaints',
  'onFriendSummoned',
  'onFriendAheadAttacks',
  'onEnemySummoned',
])

const Count = z.union([z.number().int().min(0), Lvl3Schema])

export const TARGET_KINDS = [
  'self',
  'triggerSource',
  'ahead',
  'behind',
  'adjacent',
  'frontFriend',
  'backFriend',
  'randomFriend',
  'allFriends',
  'friendsAhead',
  'friendsBehind',
  'randomEnemy',
  'allEnemies',
  'frontEnemy',
  'highestAtkEnemy',
  'lowestHpEnemy',
  'lowestHpFriend',
  'allUnits',
] as const

export const TargetSchema: z.ZodType<Target> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('self') }),
  z.object({ kind: z.literal('triggerSource') }),
  z.object({ kind: z.literal('ahead') }),
  z.object({ kind: z.literal('behind') }),
  z.object({ kind: z.literal('adjacent') }),
  z.object({ kind: z.literal('frontFriend') }),
  z.object({ kind: z.literal('backFriend') }),
  z.object({ kind: z.literal('randomFriend'), count: Count, excludeSelf: z.boolean().optional() }),
  z.object({ kind: z.literal('allFriends') }),
  z.object({ kind: z.literal('friendsAhead'), count: Count }),
  z.object({ kind: z.literal('friendsBehind'), count: Count }),
  z.object({ kind: z.literal('randomEnemy'), count: Count }),
  z.object({ kind: z.literal('allEnemies') }),
  z.object({ kind: z.literal('frontEnemy') }),
  z.object({ kind: z.literal('highestAtkEnemy') }),
  z.object({ kind: z.literal('lowestHpEnemy') }),
  z.object({ kind: z.literal('lowestHpFriend') }),
  z.object({ kind: z.literal('allUnits') }),
])

const Id = z.string().regex(/^[a-z][a-zA-Z0-9]*$/, 'ids are camelCase identifiers')

export const EffectSchema: z.ZodType<Effect> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('buff'),
      target: TargetSchema,
      atk: Lvl3Schema,
      hp: Lvl3Schema,
      temporary: z.boolean(),
    }),
    z.object({ kind: z.literal('damage'), target: TargetSchema, amount: Lvl3Schema }),
    z.object({ kind: z.literal('heal'), target: TargetSchema, amount: Lvl3Schema }),
    z.object({
      kind: z.literal('summon'),
      defId: Id,
      count: Lvl3Schema,
      stats: z.object({ atk: Lvl3Schema, hp: Lvl3Schema }).optional(),
    }),
    z.object({ kind: z.literal('status'), target: TargetSchema, status: StatusSchema }),
    z.object({ kind: z.literal('gold'), amount: Lvl3Schema }),
    z.object({
      kind: z.literal('shop'),
      op: z.enum(['buffShopUnits', 'buffShopUnitsPermanent']),
      atk: Lvl3Schema,
      hp: Lvl3Schema,
    }),
    z.object({ kind: z.literal('sequence'), effects: z.array(EffectSchema) }),
    z.object({
      kind: z.literal('custom'),
      fn: z.string().min(1),
      args: z.record(z.string(), z.unknown()).optional(),
    }),
  ]),
)

export const AbilityDefSchema: z.ZodType<AbilityDef> = z.object({
  trigger: TriggerSchema,
  text: z.string().min(1),
  effect: EffectSchema,
})

export const UnitDefSchema: z.ZodType<UnitDef> = z.object({
  id: Id,
  name: z.string().min(1),
  tier: TierSchema,
  base: z.object({ atk: z.number().int().min(0), hp: z.number().int().min(1) }),
  sprite: z.string().min(1),
  ability: AbilityDefSchema.optional(),
})

export const FoodDefSchema: z.ZodType<FoodDef> = z.object({
  id: Id,
  name: z.string().min(1),
  tier: TierSchema,
  sprite: z.string().min(1),
  text: z.string().min(1),
  effect: EffectSchema,
})
