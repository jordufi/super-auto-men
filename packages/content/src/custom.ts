// Escape-hatch functions for units that do not fit the declarative effect vocabulary
// (ARCHITECTURE.md §5.5). Referenced from data as `{ kind: 'custom', fn: '<key>', args }`.
// Each one is deliberate: prefer a declarative effect whenever one exists.
//
// A custom function may mutate the board and use the sim's own helpers (which log their own
// events); anything it returns is appended to the log afterwards.
import type { BattleEvent, BattleState, CustomFn, TriggerCtx, UnitInstance } from '@sam/sim'
import {
  dealDamage,
  effectiveAtk,
  effectiveHp,
  findUnit,
  isDead,
  otherSide,
  positionOf,
  summonUnit,
  unitsOf,
} from '@sam/sim'

type Args = Record<string, unknown> | undefined

/** Reads a [L1, L2, L3] argument at the firing unit's level. */
function lvl(args: Args, key: string, fallback: number): number {
  const v = args?.[key]
  if (Array.isArray(v) && v.length === 3) return Number(v[0])
  return typeof v === 'number' ? v : fallback
}

function lvlAt(args: Args, key: string, ctx: TriggerCtx, fallback: number): number {
  const v = args?.[key]
  if (Array.isArray(v) && v.length === 3) return Number(v[ctx.level - 1])
  return typeof v === 'number' ? v : fallback
}

const self = (s: BattleState, ctx: TriggerCtx): UnitInstance | null => findUnit(s, ctx.source)?.unit ?? null

function friends(s: BattleState, ctx: TriggerCtx): UnitInstance[] {
  return unitsOf(s.teams[ctx.side].slots).filter((u) => !isDead(u))
}

function buff(s: BattleState, unit: UnitInstance, atk: number, hp: number): BattleEvent {
  unit.atk += atk
  unit.hp += hp
  return { t: 'buff', unit: unit.iid, atk, hp, temporary: false }
}

/**
 * Crab: take a share of the healthiest friend's health. Copying is never a downgrade — a share
 * smaller than what the crab already has leaves it alone (PLAN.md §1.4).
 */
const copyHighestHp: CustomFn = (s, ctx, _rng, _content, args) => {
  const me = self(s, ctx)
  if (!me) return []
  const best = Math.max(0, ...friends(s, ctx).filter((u) => u.iid !== me.iid).map(effectiveHp))
  if (best <= 0) return []
  const target = Math.round((best * lvlAt(args, 'percent', ctx, 100)) / 100)
  const delta = target - effectiveHp(me)
  return delta <= 0 ? [] : [buff(s, me, 0, delta)]
}

/** Dodo: hand a share of its attack to the friend in front. */
const dodoShare: CustomFn = (s, ctx, _rng, _content, args) => {
  const me = self(s, ctx)
  if (!me) return []
  const slots = s.teams[ctx.side].slots
  const ahead = friends(s, ctx)
    .filter((u) => positionOf(slots, u.iid) < ctx.position)
    .at(-1)
  if (!ahead) return []
  const share = Math.round((effectiveAtk(me) * lvlAt(args, 'percent', ctx, 50)) / 100)
  return share > 0 ? [buff(s, ahead, share, 0)] : []
}

/** Elephant: hit the friends standing right behind it. */
const elephantBehind: CustomFn = (s, ctx, _rng, content, args) => {
  const slots = s.teams[ctx.side].slots
  const behind = friends(s, ctx)
    .filter((u) => positionOf(slots, u.iid) > ctx.position)
    .slice(0, lvlAt(args, 'count', ctx, 1))
  for (const u of behind) dealDamage(s, content, u, lvl(args, 'amount', 1), ctx.source)
  return []
}

/** Rat: the enemy gets a dirty rat. */
const summonEnemy: CustomFn = (s, ctx, _rng, content, args) => {
  const side = otherSide(ctx.side)
  const n = lvlAt(args, 'count', ctx, 1)
  const defId = String(args?.['defId'] ?? 'dirtyRat')
  for (let i = 0; i < n; i++) summonUnit(s, content, side, 0, defId)
  return []
}

/** Spider: summon a random tier-3 unit with fixed stats. */
const spiderSummon: CustomFn = (s, ctx, rng, content, args) => {
  const tier = lvl(args, 'tier', 3)
  const pool = content.shopPool(tier).filter((id) => content.getUnit(id).tier === tier)
  if (pool.length === 0) return []
  const atk = lvl(args, 'atk', 2)
  const hp = lvl(args, 'hp', 2)
  summonUnit(s, content, ctx.side, ctx.position, rng.pick(pool), { atk, hp })
  return []
}

/** Badger: its death blast hits whoever stood next to it, friend or enemy. */
const badgerFaint: CustomFn = (s, ctx, _rng, content) => {
  const amount = ctx.atk
  if (amount <= 0) return []
  const slots = s.teams[ctx.side].slots
  const mates = friends(s, ctx)
  const ahead = mates.filter((u) => positionOf(slots, u.iid) < ctx.position).at(-1)
  const behind = mates.find((u) => positionOf(slots, u.iid) > ctx.position)
  const targets: UnitInstance[] = []
  if (ahead) targets.push(ahead)
  else {
    const enemy = unitsOf(s.teams[otherSide(ctx.side)].slots).filter((u) => !isDead(u))[0]
    if (enemy) targets.push(enemy) // it was at the front: the blast reaches the enemy instead
  }
  if (behind) targets.push(behind)
  for (const u of targets) dealDamage(s, content, u, amount, ctx.source)
  return []
}

/** Snail: only shows up for a team that just lost. */
const snailBuff: CustomFn = (s, ctx, _rng, _content, args) => {
  if (s.shop?.lastResult !== 'b') return []
  const atk = lvlAt(args, 'atk', ctx, 2)
  const hp = lvlAt(args, 'hp', ctx, 1)
  return friends(s, ctx)
    .filter((u) => u.iid !== ctx.source)
    .map((u) => buff(s, u, atk, hp))
}

export const CUSTOM = {
  copyHighestHp,
  dodoShare,
  elephantBehind,
  summonEnemy,
  spiderSummon,
  badgerFaint,
  snailBuff,
} satisfies Record<string, CustomFn>

export type CustomFnId = keyof typeof CUSTOM
