// Trigger dispatch and ordering (ARCHITECTURE.md §4.4, PLAN.md §1.5).
import type { BattleState, InstanceId, PendingTrigger, Side, Trigger, UnitInstance } from './types'
import type { ContentApi } from './content-types'
import { findUnit } from './board'
import { effectiveAtk } from './instance'

export interface Responder {
  unit: UnitInstance
  side: Side
  position: number
  trigger: Trigger
  triggerSource?: InstanceId | undefined
}

export interface FireOpts {
  sides: 'both' | Side
  only?: InstanceId | undefined // a single responder
  exclude?: InstanceId | undefined // every unit on the side(s) except this one
  triggerSource?: InstanceId | undefined // the unit the event is about (summoned, bought, ...)
}

/** Collects the units on the board that may respond to `trigger` and queues them as one batch. */
export function fire(state: BattleState, content: ContentApi, trigger: Trigger, opts: FireOpts): void {
  const sides: Side[] = opts.sides === 'both' ? [0, 1] : [opts.sides]
  const responders: Responder[] = []
  for (const side of sides) {
    state.teams[side].slots.forEach((unit, position) => {
      if (!unit) return
      if (opts.only !== undefined && unit.iid !== opts.only) return
      if (opts.exclude !== undefined && unit.iid === opts.exclude) return
      responders.push({ unit, side, position, trigger, triggerSource: opts.triggerSource })
    })
  }
  const owner =
    opts.triggerSource !== undefined
      ? (findUnit(state, opts.triggerSource)?.side ?? sides[0]!)
      : sides[0]!
  enqueueBatch(state, content, responders, owner)
}

/**
 * Keeps only responders whose ability matches their trigger, sorts them by the ordering rule,
 * and appends the whole batch to the end of the queue. Never resolves anything itself.
 */
export function enqueueBatch(
  state: BattleState,
  content: ContentApi,
  responders: Responder[],
  ownerSide: Side,
): void {
  const batch: PendingTrigger[] = []
  for (const r of responders) {
    const ability = content.getUnit(r.unit.defId).ability
    if (!ability || ability.trigger !== r.trigger) continue
    batch.push({
      source: r.unit.iid,
      defId: r.unit.defId,
      trigger: r.trigger,
      atk: effectiveAtk(r.unit),
      ctx: {
        side: r.side,
        source: r.unit.iid,
        level: r.unit.level,
        position: r.position,
        atk: effectiveAtk(r.unit),
        ...(r.triggerSource !== undefined ? { triggerSource: r.triggerSource } : {}),
      },
    })
  }
  state.queue.push(...sortBatch(batch, ownerSide))
}

/**
 * Resolution order when several units respond to the same event (a GAME RULE, PLAN.md §1.5):
 *   1. higher attack first
 *   2. tie -> lower board position (closer to the front) first
 *   3. tie -> the team that owns the event source first
 */
export function sortBatch(batch: readonly PendingTrigger[], ownerSide: Side): PendingTrigger[] {
  const rank = (side: Side) => (side === ownerSide ? 0 : 1)
  return [...batch].sort(
    (x, y) =>
      y.atk - x.atk ||
      x.ctx.position - y.ctx.position ||
      rank(x.ctx.side) - rank(y.ctx.side),
  )
}
