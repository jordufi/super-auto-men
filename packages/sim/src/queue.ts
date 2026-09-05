// The trigger queue drain (ARCHITECTURE.md §4.4, P5). Triggers produced while draining are appended
// by `enqueueBatch`; nothing here recurses.
import type { BattleState } from './types'
import type { ContentApi } from './content-types'
import type { Rng } from './rng'
import { findUnit } from './board'
import { isDead } from './instance'
import { apply } from './effects'

/**
 * Safety net for a cycle that queues triggers as fast as it drains them — e.g. an ability that
 * kills on summon, where honey frees the slot the next summon fills. Nothing in the current
 * content can reach it (summons are bounded by the 5-slot board), but the failure mode is a
 * frozen tab, so the drain gets the same kind of guard the round loop has (MAX_ROUNDS).
 * Hitting it abandons the rest of the queue; the battle then ends normally, as a draw at worst.
 */
export const MAX_TRIGGER_STEPS = 10000

export function drain(state: BattleState, rng: Rng, content: ContentApi): void {
  let steps = 0
  while (state.queue.length > 0) {
    if (steps++ >= MAX_TRIGGER_STEPS) {
      state.queue.length = 0
      return
    }
    const p = state.queue.shift()!
    const ability = content.getUnit(p.defId).ability
    if (!ability || ability.trigger !== p.trigger) continue
    if (p.trigger !== 'onFaint') {
      // Everything except a faint ability needs its owner alive and on the board.
      const loc = findUnit(state, p.source)
      if (!loc || isDead(loc.unit)) continue
      p.ctx.position = loc.position // the board may have compacted since this was queued
    }
    state.log.push({ t: 'ability', source: p.source, trigger: p.trigger })
    apply(state, ability.effect, p.ctx, rng, content)
  }
}
