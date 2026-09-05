// The trigger queue drain (ARCHITECTURE.md §4.4, P5). Triggers produced while draining are appended
// by `enqueueBatch`; nothing here recurses.
import type { BattleState } from './types'
import type { ContentApi } from './content-types'
import type { Rng } from './rng'
import { findUnit } from './board'
import { isDead } from './instance'
import { apply } from './effects'

export function drain(state: BattleState, rng: Rng, content: ContentApi): void {
  while (state.queue.length > 0) {
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
