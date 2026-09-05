import type { DefId, InstanceId, Level, UnitInstance } from './types'
import { expForLevel, levelFromExp } from './level'

export interface InstanceSpec {
  defId: DefId
  atk: number
  hp: number
  level?: Level | undefined
  exp?: number | undefined
}

/** Instance ids are chosen by the caller; the sim never keeps a global counter. */
export function makeInstance(spec: InstanceSpec, iid: InstanceId): UnitInstance {
  const exp = spec.exp ?? (spec.level ? expForLevel(spec.level) : 0)
  return {
    iid,
    defId: spec.defId,
    atk: spec.atk,
    hp: spec.hp,
    level: levelFromExp(exp),
    exp,
    tmpAtk: 0,
    tmpHp: 0,
    statuses: [],
  }
}

export function effectiveAtk(u: UnitInstance): number {
  return u.atk + u.tmpAtk
}

export function effectiveHp(u: UnitInstance): number {
  return u.hp + u.tmpHp
}

export function isDead(u: UnitInstance): boolean {
  return effectiveHp(u) <= 0
}
