// The shop reducer (ARCHITECTURE.md §4.6, PLAN.md §1.2, §1.4). Pure: returns a new state, or the
// SAME state object (and no events) for any action the player is allowed to attempt but that is
// not possible right now (not enough gold, wrong slot, ...).
import type { BattleEvent, BattleState, ShopAction, ShopSlot, ShopState, Slots, Status, TriggerCtx, UnitInstance } from './types'
import type { ContentApi } from './content-types'
import type { Rng } from './rng'
import { SLOT_COUNT, cloneUnit, emptySlots } from './board'
import { effectiveAtk, makeInstance } from './instance'
import { MAX_EXP, levelFromExp } from './level'
import { apply } from './effects'
import { fire } from './triggers'
import { drain } from './queue'
import {
  FOOD_COST,
  ROLL_COST,
  START_LIVES,
  TURN_GOLD,
  UNIT_COST,
  foodSlotsForTurn,
  maxTierForTurn,
  unitSlotsForTurn,
} from './shopRules'

export interface ShopResult {
  state: ShopState
  events: BattleEvent[]
}

export function newShopState(): ShopState {
  return { turn: 1, gold: TURN_GOLD, lives: START_LIVES, trophies: 0, team: emptySlots(), shop: [], nextIid: 1, phase: 'shop' }
}

export function cloneShopState(s: ShopState): ShopState {
  return { ...s, team: s.team.map((u) => (u ? cloneUnit(u) : null)) as Slots, shop: s.shop.map((x) => ({ ...x })) }
}

export function shopReducer(state: ShopState, action: ShopAction, rng: Rng, content: ContentApi): ShopResult {
  if (state.phase !== 'shop') return { state, events: [] }
  const s = cloneShopState(state)
  const events: BattleEvent[] = []
  const ok = reduce(s, action, rng, content, events)
  return ok ? { state: s, events } : { state, events: [] }
}

/** New turn: 10 gold, temporary buffs gone, a free roll, then onStartOfTurn. */
export function startTurn(state: ShopState, rng: Rng, content: ContentApi): ShopResult {
  const s = cloneShopState(state)
  const events: BattleEvent[] = []
  s.gold = TURN_GOLD
  s.phase = 'shop'
  for (const u of s.team) {
    if (u) {
      u.tmpAtk = 0
      u.tmpHp = 0
    }
  }
  rollShop(s, rng, content)
  withView(s, events, (v) => {
    fire(v, content, 'onStartOfTurn', { sides: 0 })
    drain(v, rng, content)
  })
  return { state: s, events }
}

// ---- actions ----

function reduce(s: ShopState, a: ShopAction, rng: Rng, content: ContentApi, events: BattleEvent[]): boolean {
  switch (a.t) {
    case 'buyUnit':
      return buyUnit(s, a.shopIndex, a.slot, rng, content, events)
    case 'buyFood':
      return buyFood(s, a.shopIndex, a.target, rng, content, events)
    case 'sell':
      return sell(s, a.slot, rng, content, events)
    case 'reorder':
      return reorder(s, a.from, a.to, rng, content, events)
    case 'freeze': {
      const slot = s.shop[a.shopIndex]
      if (!slot) return false
      slot.frozen = !slot.frozen
      return true
    }
    case 'roll':
      if (s.gold < ROLL_COST) return false
      s.gold -= ROLL_COST
      rollShop(s, rng, content)
      withView(s, events, (v) => {
        fire(v, content, 'onShopRoll', { sides: 0 })
        drain(v, rng, content)
      })
      return true
    case 'endTurn':
      withView(s, events, (v) => {
        fire(v, content, 'onEndOfTurn', { sides: 0 })
        drain(v, rng, content)
      })
      s.phase = 'battle'
      return true
  }
}

const validSlot = (i: number) => Number.isInteger(i) && i >= 0 && i < SLOT_COUNT

function buyUnit(s: ShopState, shopIndex: number, slot: number, rng: Rng, content: ContentApi, events: BattleEvent[]): boolean {
  const item = s.shop[shopIndex]
  if (!item || item.kind !== 'unit' || !validSlot(slot) || s.gold < UNIT_COST) return false
  const def = content.getUnit(item.defId)
  const atk = item.atk ?? def.base.atk
  const hp = item.hp ?? def.base.hp
  const target = s.team[slot] ?? null
  let unit: UnitInstance
  let leveled = false
  if (target === null) {
    unit = makeInstance({ defId: item.defId, atk, hp }, `u${s.nextIid++}`)
    s.team[slot] = unit
  } else {
    if (target.defId !== item.defId || target.level === 3) return false
    unit = target
    leveled = mergeInto(target, { atk, hp, exp: 0 })
  }
  s.gold -= UNIT_COST
  s.shop.splice(shopIndex, 1)
  withView(s, events, (v) => {
    fire(v, content, 'onBuy', { sides: 0, only: unit.iid })
    drain(v, rng, content)
  })
  if (leveled) levelUp(s, unit, rng, content, events)
  return true
}

function buyFood(s: ShopState, shopIndex: number, target: number, rng: Rng, content: ContentApi, events: BattleEvent[]): boolean {
  const item = s.shop[shopIndex]
  if (!item || item.kind !== 'food' || !validSlot(target) || s.gold < FOOD_COST) return false
  const unit = s.team[target]
  if (!unit) return false
  const food = content.getFood(item.defId)
  s.gold -= FOOD_COST
  s.shop.splice(shopIndex, 1)
  withView(s, events, (v) => {
    const ctx: TriggerCtx = { side: 0, source: unit.iid, level: unit.level, position: target, atk: effectiveAtk(unit) }
    apply(v, food.effect, ctx, rng, content)
    fire(v, content, 'onEatFood', { sides: 0, only: unit.iid })
    fire(v, content, 'onFriendEatsFood', { sides: 0, exclude: unit.iid, triggerSource: unit.iid })
    drain(v, rng, content)
  })
  return true
}

function sell(s: ShopState, slot: number, rng: Rng, content: ContentApi, events: BattleEvent[]): boolean {
  if (!validSlot(slot)) return false
  const unit = s.team[slot]
  if (!unit) return false
  s.gold += unit.level
  events.push({ t: 'gold', amount: unit.level })
  // The ability fires while the unit is still on the board, so it can target its friends.
  withView(s, events, (v) => {
    fire(v, content, 'onSell', { sides: 0, only: unit.iid })
    drain(v, rng, content)
  })
  s.team[slot] = null
  return true
}

function reorder(s: ShopState, from: number, to: number, rng: Rng, content: ContentApi, events: BattleEvent[]): boolean {
  if (!validSlot(from) || !validSlot(to) || from === to) return false
  const mover = s.team[from]
  if (!mover) return false
  const target = s.team[to]
  if (!target) {
    s.team[to] = mover
    s.team[from] = null
    return true
  }
  if (target.defId === mover.defId) {
    if (target.level === 3 || mover.level === 3) return false
    s.team[from] = null
    if (mergeInto(target, mover)) levelUp(s, target, rng, content, events)
    return true
  }
  s.team[to] = mover
  s.team[from] = target
  return true
}

// ---- helpers ----

/**
 * PLAN.md §1.4. Returns true if the merge crossed a level threshold. The survivor keeps its own
 * statuses and inherits any the other unit held that it lacks, so a merge never destroys a held
 * item. A shop slot carries no statuses, so this only bites on a drag-merge.
 */
function mergeInto(
  target: UnitInstance,
  incoming: { atk: number; hp: number; exp: number; statuses?: readonly Status[] },
): boolean {
  const before = target.level
  target.exp = Math.min(MAX_EXP, target.exp + incoming.exp + 1)
  target.atk = Math.max(target.atk, incoming.atk) + 1
  target.hp = Math.max(target.hp, incoming.hp) + 1
  target.level = levelFromExp(target.exp)
  for (const s of incoming.statuses ?? []) {
    if (!target.statuses.includes(s)) target.statuses.push(s)
  }
  return target.level > before
}

function levelUp(s: ShopState, unit: UnitInstance, rng: Rng, content: ContentApi, events: BattleEvent[]): void {
  events.push({ t: 'levelUp', unit: unit.iid, level: unit.level as 2 | 3 })
  withView(s, events, (v) => {
    fire(v, content, 'onLevelUp', { sides: 0, only: unit.iid })
    drain(v, rng, content)
  })
  // The level-up bonus: one random unit of the next tier appears in the shop.
  const tier = Math.min(6, maxTierForTurn(s.turn) + 1)
  const lower = new Set(content.shopPool(tier - 1))
  const pool = content.shopPool(tier).filter((id) => !lower.has(id))
  if (pool.length === 0) return
  const lastUnit = s.shop.findLastIndex((x) => x.kind === 'unit')
  s.shop.splice(lastUnit + 1, 0, { kind: 'unit', defId: rng.pick(pool), frozen: false })
}

/** Replaces every non-frozen slot. Frozen slots keep their index. */
export function rollShop(s: ShopState, rng: Rng, content: ContentApi): void {
  const maxTier = maxTierForTurn(s.turn)
  const roll = (kind: ShopSlot['kind'], count: number, pool: string[]): ShopSlot[] => {
    const old = s.shop.filter((x) => x.kind === kind)
    const out: ShopSlot[] = []
    for (let i = 0; i < Math.max(count, old.length); i++) {
      const prev = old[i]
      if (prev?.frozen) out.push(prev)
      else if (i < count && pool.length > 0) {
        const slot: ShopSlot = { kind, defId: rng.pick(pool), frozen: false }
        // Canned food keeps buffing units that appear later in the run.
        if (kind === 'unit' && s.shopBuff) {
          const base = content.getUnit(slot.defId).base
          slot.atk = base.atk + s.shopBuff.atk
          slot.hp = base.hp + s.shopBuff.hp
        }
        out.push(slot)
      }
    }
    return out
  }
  s.shop = [
    ...roll('unit', unitSlotsForTurn(s.turn), content.shopPool(maxTier)),
    ...roll('food', foodSlotsForTurn(s.turn), content.foodPool(maxTier)),
  ]
}

/**
 * Runs shop-phase triggers with the battle machinery: the player's team is side 0 of a BattleState
 * whose side 1 is empty. Gold and shop slots are exposed through `view.shop` for gold/shop effects.
 */
function withView(s: ShopState, events: BattleEvent[], fn: (view: BattleState) => void): void {
  const view: BattleState = {
    teams: [
      { name: 'player', slots: s.team },
      { name: 'shop', slots: emptySlots() },
    ],
    turn: s.turn,
    log: [],
    queue: [],
    summonCounter: s.nextIid,
    shop: { gold: s.gold, shop: s.shop, buff: s.shopBuff, lastResult: s.lastResult },
  }
  fn(view)
  s.team = view.teams[0].slots
  s.gold = view.shop!.gold
  s.shop = view.shop!.shop
  s.shopBuff = view.shop!.buff
  s.nextIid = view.summonCounter
  events.push(...view.log)
}
