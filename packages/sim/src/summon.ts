// Putting a summoned unit on the board. Its own module because both `effects` and `faint` summon,
// and faint must not depend on the effect interpreter.
import type { BattleState, Side } from './types'
import type { ContentApi } from './content-types'
import { cloneUnit, otherSide, unitsOf, SLOT_COUNT } from './board'
import { makeInstance } from './instance'
import { enqueueBatch, type Responder } from './triggers'

/** Nearest free slot to `position` (that slot first, then toward the back, then toward the front). */
export function findFreeSlot(slots: BattleState['teams'][0]['slots'], position: number): number {
  if (slots[position] === null) return position
  for (let p = position + 1; p < SLOT_COUNT; p++) if (slots[p] === null) return p
  for (let p = position - 1; p >= 0; p--) if (slots[p] === null) return p
  return -1
}

/** Places a new unit near `position`. Does nothing when the side is full (PLAN.md §1.3 rule 6). */
export function summonUnit(
  state: BattleState,
  content: ContentApi,
  side: Side,
  position: number,
  defId: string,
  stats?: { atk: number; hp: number },
): void {
  const slots = state.teams[side].slots
  const pos = findFreeSlot(slots, position)
  if (pos < 0) return
  const def = content.getUnit(defId)
  const unit = makeInstance(
    { defId, atk: stats?.atk ?? def.base.atk, hp: stats?.hp ?? def.base.hp },
    `${side}-s${state.summonCounter++}-${defId}`,
  )
  slots[pos] = unit
  state.log.push({ t: 'summon', unit: cloneUnit(unit), side, position: pos })

  const responders: Responder[] = []
  slots.forEach((u, p) => {
    if (u && u.iid !== unit.iid) responders.push({ unit: u, side, position: p, trigger: 'onFriendSummoned', triggerSource: unit.iid })
  })
  const enemySide = otherSide(side)
  for (const u of unitsOf(state.teams[enemySide].slots)) {
    responders.push({ unit: u, side: enemySide, position: state.teams[enemySide].slots.indexOf(u), trigger: 'onEnemySummoned', triggerSource: unit.iid })
  }
  enqueueBatch(state, content, responders, side)
}
