// Removing units from the board and the triggers that follow (PLAN.md §1.3 step 3e).
import type { BattleState, InstanceId, UnitInstance } from './types'
import type { ContentApi } from './content-types'
import { findUnit } from './board'
import { isDead } from './instance'
import { faintSummon, modifyIncoming, removeStatus } from './statuses'
import { summonUnit } from './summon'
import { enqueueBatch, fire, type Responder } from './triggers'

/**
 * Takes a unit off the board, emits `faint`, and queues onFaint (itself), onFriendFaints (its
 * remaining friends) and onKnockOut (the killer, if alive) as ONE batch so they order by the rule.
 */
export function killUnit(
  state: BattleState,
  content: ContentApi,
  iid: InstanceId,
  killerIid?: InstanceId,
): void {
  const loc = findUnit(state, iid)
  if (!loc) return
  const { unit, side, position } = loc
  state.teams[side].slots[position] = null
  state.log.push({ t: 'faint', unit: iid, side, position })

  const responders: Responder[] = [{ unit, side, position, trigger: 'onFaint' }]
  state.teams[side].slots.forEach((friend, p) => {
    if (friend) responders.push({ unit: friend, side, position: p, trigger: 'onFriendFaints', triggerSource: iid })
  })
  if (killerIid !== undefined) {
    const k = findUnit(state, killerIid)
    if (k && !isDead(k.unit)) {
      responders.push({ unit: k.unit, side: k.side, position: k.position, trigger: 'onKnockOut', triggerSource: iid })
    }
  }
  enqueueBatch(state, content, responders, side)

  // Honey: a bee takes the fainted unit's slot. It arrives after the faint triggers are queued,
  // so onFaint abilities still resolve first.
  const token = faintSummon(unit)
  if (token) summonUnit(state, content, side, position, token)
}

/** Ability damage: subtract, emit, fire onHurt, and kill if dead. Attack damage is handled in battle.ts. */
export function dealDamage(
  state: BattleState,
  content: ContentApi,
  target: UnitInstance,
  amount: number,
  from?: InstanceId,
): void {
  if (amount <= 0) return
  const mod = modifyIncoming(target, amount)
  if (mod.consumed) {
    removeStatus(target, mod.consumed)
    state.log.push({ t: 'status', unit: target.iid, status: mod.consumed, applied: false })
  }
  if (mod.amount <= 0) return
  target.hp -= mod.amount
  state.log.push({ t: 'damage', unit: target.iid, amount: mod.amount, ...(from !== undefined ? { from } : {}) })
  fire(state, content, 'onHurt', { sides: 'both', only: target.iid })
  if (isDead(target)) killUnit(state, content, target.iid, from)
}
