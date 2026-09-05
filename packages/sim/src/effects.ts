// The effect interpreter (ARCHITECTURE.md §5.4). Pushes events straight onto `state.log` so that
// cascades (damage -> faint -> summon) keep their natural order.
import type { BattleState, Level, TriggerCtx } from './types'
import type { ContentApi, Effect, Lvl3 } from './content-types'
import type { Rng } from './rng'
import { resolveTarget } from './targets'
import { dealDamage } from './faint'
import { summonUnit } from './summon'

export function at(x: Lvl3, level: Level): number {
  return x[level - 1]!
}

export function apply(state: BattleState, e: Effect, ctx: TriggerCtx, rng: Rng, content: ContentApi): void {
  switch (e.kind) {
    case 'buff': {
      const atk = at(e.atk, ctx.level)
      const hp = at(e.hp, ctx.level)
      for (const t of resolveTarget(state, e.target, ctx, rng)) {
        if (e.temporary) {
          t.tmpAtk += atk
          t.tmpHp += hp
        } else {
          t.atk += atk
          t.hp += hp
        }
        state.log.push({ t: 'buff', unit: t.iid, atk, hp, temporary: e.temporary })
      }
      return
    }
    case 'damage': {
      const amount = at(e.amount, ctx.level)
      // Resolve every target before dealing damage: kills change the board.
      for (const t of resolveTarget(state, e.target, ctx, rng)) dealDamage(state, content, t, amount, ctx.source)
      return
    }
    case 'heal': {
      const amount = at(e.amount, ctx.level)
      for (const t of resolveTarget(state, e.target, ctx, rng)) {
        t.hp += amount
        state.log.push({ t: 'buff', unit: t.iid, atk: 0, hp: amount, temporary: false })
      }
      return
    }
    case 'summon': {
      const n = at(e.count, ctx.level)
      const stats = e.stats ? { atk: at(e.stats.atk, ctx.level), hp: at(e.stats.hp, ctx.level) } : undefined
      for (let i = 0; i < n; i++) summonUnit(state, content, ctx.side, ctx.position, e.defId, stats)
      return
    }
    case 'status': {
      for (const t of resolveTarget(state, e.target, ctx, rng)) {
        if (!t.statuses.includes(e.status)) t.statuses.push(e.status)
        state.log.push({ t: 'status', unit: t.iid, status: e.status, applied: true })
      }
      return
    }
    case 'gold': {
      if (!state.shop) throw new Error('gold effect is shop-only')
      const amount = at(e.amount, ctx.level)
      state.shop.gold += amount
      state.log.push({ t: 'gold', amount })
      return
    }
    case 'shop': {
      if (!state.shop) throw new Error('shop effect is shop-only')
      const atk = at(e.atk, ctx.level)
      const hp = at(e.hp, ctx.level)
      for (const slot of state.shop.shop) {
        if (slot.kind !== 'unit') continue
        const base = content.getUnit(slot.defId).base
        slot.atk = (slot.atk ?? base.atk) + atk
        slot.hp = (slot.hp ?? base.hp) + hp
      }
      if (e.op === 'buffShopUnitsPermanent') {
        // Canned food: every unit rolled from now on carries the bonus too.
        const prev = state.shop.buff ?? { atk: 0, hp: 0 }
        state.shop.buff = { atk: prev.atk + atk, hp: prev.hp + hp }
      }
      state.log.push({ t: 'shop', op: e.op, atk, hp })
      return
    }
    case 'sequence':
      for (const sub of e.effects) apply(state, sub, ctx, rng, content)
      return
    case 'custom': {
      const fn = content.custom[e.fn]
      if (!fn) throw new Error(`unknown custom effect "${e.fn}"`)
      state.log.push(...fn(state, ctx, rng, content, e.args))
      return
    }
  }
}
