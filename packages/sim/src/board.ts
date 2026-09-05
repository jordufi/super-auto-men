import type { BattleState, InstanceId, Side, Slots, Team, UnitInstance } from './types'

export const SLOT_COUNT = 5

export function emptySlots(): Slots {
  return [null, null, null, null, null]
}

export function cloneUnit(u: UnitInstance): UnitInstance {
  return { ...u, statuses: [...u.statuses] }
}

export function cloneTeam(t: Team): Team {
  return {
    name: t.name,
    slots: t.slots.map((u) => (u ? cloneUnit(u) : null)) as Slots,
  }
}

/** Units in board order, front first, skipping empty slots. */
export function unitsOf(slots: Slots): UnitInstance[] {
  return slots.filter((u): u is UnitInstance => u !== null)
}

/** Moves units toward index 0 preserving order. Returns a new tuple. */
export function compact(slots: Slots): Slots {
  const out = emptySlots()
  unitsOf(slots).forEach((u, i) => {
    out[i] = u
  })
  return out
}

export function front(slots: Slots): UnitInstance | null {
  return unitsOf(slots)[0] ?? null
}

export interface Located {
  unit: UnitInstance
  side: Side
  position: number
}

export function findUnit(state: BattleState, iid: InstanceId): Located | undefined {
  for (const side of [0, 1] as const) {
    const slots = state.teams[side].slots
    for (let position = 0; position < SLOT_COUNT; position++) {
      const unit = slots[position]
      if (unit && unit.iid === iid) return { unit, side, position }
    }
  }
  return undefined
}

/** Board index of a unit, or -1 if it is not on these slots. */
export function positionOf(slots: Slots, iid: InstanceId): number {
  return slots.findIndex((u) => u?.iid === iid)
}

export function otherSide(side: Side): Side {
  return side === 0 ? 1 : 0
}
