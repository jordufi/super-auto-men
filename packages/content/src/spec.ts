// Text team specs, shared by the CLI, golden fixtures and bots.
//   `ant`          base stats        `ant:3/2`   stat override
//   `ant:3/2:L2`   stats and level   `ant:L3`    level only
//   `ant:garlic`   a held-item status (any of STATUSES), for status goldens
import type { Level, Side, Slots, Status, Team } from '@sam/sim'
import { emptySlots, makeInstance } from '@sam/sim'
import { getUnit } from './registry'

const STATUSES = ['meleeShield', 'garlic', 'bone', 'honey', 'poison'] as const

export function teamFromSpec(specs: string[], side: Side, name = side === 0 ? 'A' : 'B'): Team {
  const slots: Slots = emptySlots()
  if (specs.length > 5) throw new Error(`a team has at most 5 units, got ${specs.length}`)
  specs.forEach((spec, i) => {
    const [id, ...rest] = spec.split(':')
    if (!id) throw new Error(`empty unit id in "${spec}"`)
    const def = getUnit(id)
    let atk = def.base.atk
    let hp = def.base.hp
    let level: Level | undefined
    const statuses: Status[] = []
    for (const token of rest) {
      const stats = /^(\d+)\/(\d+)$/.exec(token)
      const lvl = /^L([123])$/.exec(token)
      if (stats) {
        atk = Number(stats[1])
        hp = Number(stats[2])
      } else if (lvl) {
        level = Number(lvl[1]) as Level
      } else if ((STATUSES as readonly string[]).includes(token)) {
        statuses.push(token as Status)
      } else {
        throw new Error(`bad token "${token}" in "${spec}"; expected atk/hp, L1-L3 or a status`)
      }
    }
    const unit = makeInstance({ defId: id, atk, hp, level }, `${side}-${i}-${id}`)
    unit.statuses = statuses
    slots[i] = unit
  })
  return { name, slots }
}

/** Comma-separated form for command lines: `ant,cricket:2/2,horse:L2`. */
export function teamFromString(spec: string, side: Side): Team {
  return teamFromSpec(
    spec
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    side,
  )
}
