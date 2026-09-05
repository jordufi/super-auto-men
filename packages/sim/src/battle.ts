// The battle: one pure function. See ARCHITECTURE.md §4.3 and PLAN.md §1.3.
import type { BattleLog, BattleResult, BattleState, Side, Team, UnitInstance } from './types'
import type { ContentApi } from './content-types'
import { makeRng } from './rng'
import { cloneTeam, compact, front, positionOf, unitsOf } from './board'
import { effectiveAtk, effectiveHp, isDead } from './instance'
import { type Incoming, isPoisonous, modifyIncoming, removeStatus } from './statuses'
import { fire } from './triggers'
import { drain } from './queue'
import { killUnit } from './faint'

export const MAX_ROUNDS = 1000

export function newBattleState(teamA: Team, teamB: Team, turn: number): BattleState {
  return {
    teams: [cloneTeam(teamA), cloneTeam(teamB)],
    turn,
    log: [],
    queue: [],
    summonCounter: 0,
  }
}

export function simulate(
  teamA: Team,
  teamB: Team,
  seed: number,
  turn: number,
  content: ContentApi,
): BattleLog {
  const rng = makeRng(seed)
  const start: [Team, Team] = [cloneTeam(teamA), cloneTeam(teamB)]
  const state = newBattleState(teamA, teamB, turn)
  compactBoth(state)
  state.log.push({ t: 'startOfBattle' })

  fire(state, content, 'onStartOfBattle', { sides: 'both' })
  drain(state, rng, content)

  let result: BattleResult | null = null
  let rounds = 0
  while (hasUnits(state, 0) && hasUnits(state, 1)) {
    if (rounds++ >= MAX_ROUNDS) {
      result = 'draw'
      break
    }
    compactBoth(state)
    const a = front(state.teams[0].slots)!
    const b = front(state.teams[1].slots)!

    fire(state, content, 'onBeforeAttack', { sides: 0, only: a.iid })
    fire(state, content, 'onBeforeAttack', { sides: 1, only: b.iid })
    fireFriendAhead(state, content, 0, a)
    fireFriendAhead(state, content, 1, b)
    drain(state, rng, content)
    if (!alive(state, a) || !alive(state, b)) continue

    const hitA = strike(b, a)
    const hitB = strike(a, b)
    const dmgToA = hitA.amount
    const dmgToB = hitB.amount
    a.hp -= dmgToA
    b.hp -= dmgToB
    state.log.push({ t: 'attack', a: a.iid, b: b.iid, dmgToA, dmgToB })
    // A shield that was used up is reported right after the attack that used it.
    for (const [unit, hit] of [[a, hitA] as const, [b, hitB] as const]) {
      if (hit.consumed) state.log.push({ t: 'status', unit: unit.iid, status: hit.consumed, applied: false })
    }
    if (dmgToA > 0) state.log.push({ t: 'damage', unit: a.iid, amount: dmgToA, from: b.iid })
    if (dmgToB > 0) state.log.push({ t: 'damage', unit: b.iid, amount: dmgToB, from: a.iid })

    if (dmgToA > 0) fire(state, content, 'onHurt', { sides: 0, only: a.iid })
    if (dmgToB > 0) fire(state, content, 'onHurt', { sides: 1, only: b.iid })
    if (isDead(a)) killUnit(state, content, a.iid, b.iid)
    if (isDead(b)) killUnit(state, content, b.iid, a.iid)
    drain(state, rng, content)

    if (alive(state, a)) fire(state, content, 'onAfterAttack', { sides: 0, only: a.iid })
    if (alive(state, b)) fire(state, content, 'onAfterAttack', { sides: 1, only: b.iid })
    drain(state, rng, content)
  }

  compactBoth(state)
  if (result === null) {
    const aAlive = hasUnits(state, 0)
    const bAlive = hasUnits(state, 1)
    result = aAlive === bAlive ? 'draw' : aAlive ? 'a' : 'b'
  }
  state.log.push({ t: 'end', result })
  return { seed, teams: start, events: state.log, result }
}

/**
 * The damage one attacker lands on its target: raw attack, then the target's melon/garlic, then
 * the attacker's peanut, which makes any hit that lands lethal (PLAN.md §1.6).
 */
function strike(attacker: UnitInstance, target: UnitInstance): Incoming {
  const mod = modifyIncoming(target, effectiveAtk(attacker))
  if (mod.consumed) removeStatus(target, mod.consumed)
  if (mod.amount > 0 && isPoisonous(attacker)) return { ...mod, amount: Math.max(mod.amount, effectiveHp(target)) }
  return mod
}

function compactBoth(state: BattleState): void {
  state.teams[0].slots = compact(state.teams[0].slots)
  state.teams[1].slots = compact(state.teams[1].slots)
}

function hasUnits(state: BattleState, side: Side): boolean {
  return unitsOf(state.teams[side].slots).some((u) => !isDead(u))
}

function alive(state: BattleState, u: UnitInstance): boolean {
  if (isDead(u)) return false
  return positionOf(state.teams[0].slots, u.iid) >= 0 || positionOf(state.teams[1].slots, u.iid) >= 0
}

function fireFriendAhead(state: BattleState, content: ContentApi, side: Side, attacker: UnitInstance): void {
  const slots = state.teams[side].slots
  const pos = positionOf(slots, attacker.iid)
  const behind = unitsOf(slots).find((u) => positionOf(slots, u.iid) > pos)
  if (!behind) return
  fire(state, content, 'onFriendAheadAttacks', { sides: side, only: behind.iid, triggerSource: attacker.iid })
}
