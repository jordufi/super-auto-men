// Core sim types. See ARCHITECTURE.md §4 and PLAN.md Phase 1.

export type DefId = string // content id, e.g. 'ant'
export type InstanceId = string // runtime id, unique within a run

export type Level = 1 | 2 | 3

export type Status = 'meleeShield' | 'garlic' | 'bone' | 'honey' | 'poison'

export interface UnitInstance {
  iid: InstanceId
  defId: DefId
  atk: number
  hp: number
  level: Level
  exp: number // 0-5, drives level
  tmpAtk: number // temporary buffs, dropped at end of battle
  tmpHp: number
  perk?: DefId // held food item
  statuses: Status[]
}

/** Fixed length 5. Index 0 is the FRONT (attacks first). null = empty slot. */
export type Slots = [
  UnitInstance | null,
  UnitInstance | null,
  UnitInstance | null,
  UnitInstance | null,
  UnitInstance | null,
]

export interface Team {
  name: string
  slots: Slots
}

export type Side = 0 | 1

export type Trigger =
  // shop phase
  | 'onBuy'
  | 'onSell'
  | 'onLevelUp'
  | 'onEatFood'
  | 'onFriendEatsFood'
  | 'onStartOfTurn'
  | 'onEndOfTurn'
  | 'onShopRoll'
  // battle phase
  | 'onStartOfBattle'
  | 'onBeforeAttack'
  | 'onAfterAttack'
  | 'onHurt'
  | 'onFaint'
  | 'onKnockOut'
  | 'onFriendFaints'
  | 'onFriendSummoned'
  | 'onFriendAheadAttacks'
  | 'onEnemySummoned'

export interface TriggerCtx {
  side: Side // side of the unit whose ability is firing
  source: InstanceId // the unit whose ability is firing
  level: Level // its level
  triggerSource?: InstanceId // e.g. the unit that was summoned / fainted / bought
  position: number // board index of `source` when the trigger was queued
}

export interface PendingTrigger {
  source: InstanceId
  defId: DefId // kept so onFaint abilities can resolve after the unit left the board
  trigger: Trigger
  atk: number // effective attack when queued; the ordering key (PLAN.md §1.5)
  ctx: TriggerCtx
}

export type BattleResult = 'a' | 'b' | 'draw'

export type BattleEvent =
  | { t: 'startOfBattle' }
  | { t: 'ability'; source: InstanceId; trigger: Trigger }
  | { t: 'attack'; a: InstanceId; b: InstanceId; dmgToA: number; dmgToB: number }
  | { t: 'damage'; unit: InstanceId; amount: number; from?: InstanceId }
  | { t: 'buff'; unit: InstanceId; atk: number; hp: number; temporary: boolean }
  | { t: 'status'; unit: InstanceId; status: Status; applied: boolean }
  | { t: 'summon'; unit: UnitInstance; side: Side; position: number }
  | { t: 'faint'; unit: InstanceId; side: Side; position: number }
  | { t: 'levelUp'; unit: InstanceId; level: 2 | 3 }
  | { t: 'gold'; amount: number }
  | { t: 'shop'; op: string; atk: number; hp: number }
  | { t: 'end'; result: BattleResult }

/** Shop-phase context visible to effects (gold, shop ops). Only present during the shop phase. */
export interface ShopCtx {
  gold: number
  shop: ShopSlot[]
}

export interface BattleState {
  teams: [Team, Team]
  turn: number // run turn number, for scaling abilities
  log: BattleEvent[]
  queue: PendingTrigger[]
  summonCounter: number // for unique summon instance ids
  shop?: ShopCtx | undefined
}

// ---- Shop phase (ARCHITECTURE.md §4.6, PLAN.md §1.2) ----

export interface ShopSlot {
  kind: 'unit' | 'food'
  defId: DefId
  frozen: boolean
  atk?: number | undefined // shop-buffed stats (e.g. duck); base stats when absent
  hp?: number | undefined
}

export type RunPhase = 'shop' | 'battle' | 'won' | 'lost'

export interface ShopState {
  turn: number
  gold: number
  lives: number
  trophies: number
  team: Slots
  shop: ShopSlot[] // units first, then foods
  nextIid: number
  phase: RunPhase
  lastResult?: BattleResult | undefined
}

export type ShopAction =
  | { t: 'buyUnit'; shopIndex: number; slot: number }
  | { t: 'buyFood'; shopIndex: number; target: number }
  | { t: 'sell'; slot: number }
  | { t: 'reorder'; from: number; to: number }
  | { t: 'freeze'; shopIndex: number }
  | { t: 'roll' }
  | { t: 'endTurn' }

export interface BattleLog {
  seed: number
  teams: [Team, Team] // starting snapshot — makes the log self-contained
  events: BattleEvent[]
  result: BattleResult
}
