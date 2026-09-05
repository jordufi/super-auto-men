// Target selector resolution (ARCHITECTURE.md §5.3). The ONLY place that consumes RNG for targeting.
import type { BattleState, TriggerCtx, UnitInstance } from './types'
import type { Lvl3, Target } from './content-types'
import type { Rng } from './rng'
import { findUnit, otherSide, positionOf, unitsOf } from './board'
import { effectiveAtk, effectiveHp, isDead } from './instance'

function count(c: number | Lvl3, ctx: TriggerCtx): number {
  return typeof c === 'number' ? c : c[ctx.level - 1]!
}

/** Living units on a side, front first. */
function alive(state: BattleState, side: 0 | 1): UnitInstance[] {
  return unitsOf(state.teams[side].slots).filter((u) => !isDead(u))
}

export function resolveTarget(state: BattleState, target: Target, ctx: TriggerCtx, rng: Rng): UnitInstance[] {
  const ownSlots = state.teams[ctx.side].slots
  const friends = alive(state, ctx.side)
  const others = friends.filter((u) => u.iid !== ctx.source)
  const enemies = alive(state, otherSide(ctx.side))
  const pos = (u: UnitInstance) => positionOf(ownSlots, u.iid)

  switch (target.kind) {
    case 'self': {
      const loc = findUnit(state, ctx.source)
      return loc && !isDead(loc.unit) ? [loc.unit] : []
    }
    case 'triggerSource': {
      if (ctx.triggerSource === undefined) return []
      const loc = findUnit(state, ctx.triggerSource)
      return loc && !isDead(loc.unit) ? [loc.unit] : []
    }
    case 'ahead': {
      const u = others.filter((f) => pos(f) < ctx.position).at(-1)
      return u ? [u] : []
    }
    case 'behind': {
      const u = others.find((f) => pos(f) > ctx.position)
      return u ? [u] : []
    }
    case 'adjacent':
      return [
        ...resolveTarget(state, { kind: 'ahead' }, ctx, rng),
        ...resolveTarget(state, { kind: 'behind' }, ctx, rng),
      ]
    case 'frontFriend':
      return others.length ? [others[0]!] : []
    case 'backFriend':
      return others.length ? [others.at(-1)!] : []
    case 'randomFriend': {
      const pool = target.excludeSelf ? others : friends
      return rng.shuffle(pool).slice(0, count(target.count, ctx))
    }
    case 'allFriends':
      return others
    case 'randomEnemy':
      return rng.shuffle(enemies).slice(0, count(target.count, ctx))
    case 'allEnemies':
      return enemies
    case 'frontEnemy':
      return enemies.length ? [enemies[0]!] : []
    case 'highestAtkEnemy':
      return best(enemies, (u) => -effectiveAtk(u))
    case 'lowestHpEnemy':
      return best(enemies, effectiveHp)
    case 'lowestHpFriend':
      return best(others, effectiveHp)
  }
}

/** The unit with the lowest key; ties go to the one closer to the front. */
function best(units: UnitInstance[], key: (u: UnitInstance) => number): UnitInstance[] {
  let winner: UnitInstance | undefined
  for (const u of units) if (!winner || key(u) < key(winner)) winner = u
  return winner ? [winner] : []
}
