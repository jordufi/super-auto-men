// Shared test helpers for building teams quickly.
import type { Side, Slots, Team } from '../src/types'
import { makeInstance, type InstanceSpec } from '../src/instance'
import { emptySlots } from '../src/board'

/** `[{defId:'ant',atk:2,hp:1}, ...]` in board order → a Team with predictable instance ids. */
export function team(specs: InstanceSpec[], side: Side, name = side === 0 ? 'A' : 'B'): Team {
  const slots: Slots = emptySlots()
  specs.forEach((spec, i) => {
    slots[i] = makeInstance(spec, `${side}-${i}-${spec.defId}`)
  })
  return { name, slots }
}

/** Shorthand: `u('ant', 2, 1)`. */
export function u(defId: string, atk: number, hp: number, level?: 1 | 2 | 3): InstanceSpec {
  return { defId, atk, hp, level }
}
