// Shapes of content definitions. They live in sim because sim interprets them (ARCHITECTURE.md §5);
// content validates them with zod against these exact types.
// Optional fields are written `?: T | undefined` so zod's `.optional()` output matches them under
// `exactOptionalPropertyTypes`.
import type { BattleEvent, BattleState, DefId, Status, Trigger, TriggerCtx } from './types'
import type { Rng } from './rng'

/** A numeric field indexed by level: [L1, L2, L3]. */
export type Lvl3 = [number, number, number]

/** Tier 0 = token (summoned only, never in the shop). */
export type Tier = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Target =
  | { kind: 'self' }
  | { kind: 'triggerSource' }
  | { kind: 'ahead' }
  | { kind: 'behind' }
  | { kind: 'adjacent' }
  | { kind: 'frontFriend' }
  | { kind: 'backFriend' }
  | { kind: 'randomFriend'; count: number | Lvl3; excludeSelf?: boolean | undefined }
  | { kind: 'allFriends' }
  | { kind: 'randomEnemy'; count: number | Lvl3 }
  | { kind: 'allEnemies' }
  | { kind: 'frontEnemy' }
  | { kind: 'highestAtkEnemy' }
  | { kind: 'lowestHpEnemy' }
  | { kind: 'lowestHpFriend' }

export type Effect =
  | { kind: 'buff'; target: Target; atk: Lvl3; hp: Lvl3; temporary: boolean }
  | { kind: 'damage'; target: Target; amount: Lvl3 }
  | { kind: 'heal'; target: Target; amount: Lvl3 }
  | {
      kind: 'summon'
      defId: DefId
      count: Lvl3
      stats?: { atk: Lvl3; hp: Lvl3 } | undefined
    }
  | { kind: 'status'; target: Target; status: Status }
  | { kind: 'gold'; amount: Lvl3 }
  | { kind: 'shop'; op: 'buffShopUnits'; atk: Lvl3; hp: Lvl3 }
  | { kind: 'sequence'; effects: Effect[] }
  | { kind: 'custom'; fn: string; args?: Record<string, unknown> | undefined }

export interface AbilityDef {
  trigger: Trigger
  /** Shown in-game. Placeholders {atk} {hp} {amount} {count} are filled from the effect at the unit's level. */
  text: string
  effect: Effect
}

export interface UnitDef {
  id: DefId
  name: string
  tier: Tier
  base: { atk: number; hp: number }
  sprite: string
  ability?: AbilityDef | undefined
}

export interface FoodDef {
  id: DefId
  name: string
  tier: Tier
  sprite: string
  text: string
  /** Applied with ctx.source = the unit that ate it; use target { kind: 'self' } for "this unit". */
  effect: Effect
}

export type CustomFn = (
  s: BattleState,
  ctx: TriggerCtx,
  rng: Rng,
  args?: Record<string, unknown>,
) => BattleEvent[]

/** What the sim needs from content. `content` builds one; sim tests build tiny fakes. */
export interface ContentApi {
  getUnit(id: DefId): UnitDef
  getFood(id: DefId): FoodDef
  custom: Record<string, CustomFn>
  /** Non-token unit ids with 1 <= tier <= maxTier, sorted alphabetically. */
  shopPool(maxTier: number): DefId[]
  /** Food ids with 1 <= tier <= maxTier, sorted alphabetically. */
  foodPool(maxTier: number): DefId[]
}
