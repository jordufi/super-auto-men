// Which unit throws what at which unit, for the events playing right now. Pure: no React, no DOM.
//
// A plain attack is a melee lunge and throws nothing. Everything an ABILITY does at range — the
// damage it deals, the stats it hands a friend — travels as a thrown object, which is what makes
// "who just did that to whom" readable while the battle plays.
import type { BattleEvent } from '@sam/sim'
import type { Step } from './timeline'

export interface Projectile {
  from: string
  to: string
  kind: 'damage' | 'buff'
}

/** Events that end an ability's run of effects: past one of these, a buff has a different cause. */
const BREAKS_THE_CHAIN = new Set<BattleEvent['t']>([
  'attack',
  'faint',
  'summon',
  'startOfBattle',
  'end',
])

/**
 * The unit whose ability is causing `steps[i]`. Effects follow their `ability` event contiguously,
 * so walking back over the other effect events finds it, and anything else means there is no
 * ability in play.
 */
function abilitySource(steps: readonly Step[], i: number): string | null {
  for (let j = i; j >= 0; j--) {
    const e = steps[j]?.event
    if (!e) return null
    if (e.t === 'ability') return e.source
    if (BREAKS_THE_CHAIN.has(e.t)) return null
  }
  return null
}

export function projectilesFor(
  steps: readonly Step[],
  i: number,
  group: readonly BattleEvent[],
): Projectile[] {
  // A melee exchange is already animated as a lunge from both sides.
  if (group[0]?.t === 'attack') return []

  const source = abilitySource(steps, i)
  const out: Projectile[] = []
  for (const e of group) {
    if (e.t === 'damage') {
      const from = e.from ?? source
      if (from && from !== e.unit) out.push({ from, to: e.unit, kind: 'damage' })
    } else if (e.t === 'buff' && (e.atk !== 0 || e.hp !== 0)) {
      if (source && source !== e.unit) out.push({ from: source, to: e.unit, kind: 'buff' })
    }
  }
  return out
}
