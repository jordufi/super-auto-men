// Turns the events being played into something readable: the ability call-out card, and a one
// line message for everything else that happens. Pure — no React, no timers.
import type { BattleEvent, BattleLog, Level } from '@sam/sim'
import { CONTENT, describeAbility } from '@sam/content'

export interface UnitInfo {
  defId: string
  level: Level
}
export type UnitIndex = Map<string, UnitInfo>

/** Every unit that appears in the log, including the ones summoned during it. */
export function unitIndex(log: BattleLog): UnitIndex {
  const map: UnitIndex = new Map()
  for (const team of log.teams) {
    for (const u of team.slots) if (u) map.set(u.iid, { defId: u.defId, level: u.level })
  }
  for (const e of log.events) {
    if (e.t === 'summon') map.set(e.unit.iid, { defId: e.unit.defId, level: e.unit.level })
  }
  return map
}

const nameOf = (iid: string, units: UnitIndex): string | null => {
  const found = units.get(iid)
  return found ? CONTENT.getUnit(found.defId).name : null
}

export interface AbilityCallout {
  defId: string
  name: string
  tier: number
  trigger: string
  text: string
}

/** The card to show while an ability fires, or null when this group is not an ability. */
export function abilityCallout(
  group: readonly BattleEvent[],
  units: UnitIndex,
): AbilityCallout | null {
  const e = group[0]
  if (e?.t !== 'ability') return null
  const found = units.get(e.source)
  if (!found) return null
  const def = CONTENT.getUnit(found.defId)
  if (!def.ability) return null
  return {
    defId: def.id,
    name: def.name,
    tier: def.tier,
    trigger: e.trigger,
    text: describeAbility(def.ability, found.level),
  }
}

/**
 * A one-line description of what is happening right now, for the groups that get no call-out.
 * Damage and buff numbers already float over the units, so those are deliberately not narrated.
 */
export function narrate(group: readonly BattleEvent[], units: UnitIndex): string | null {
  const e = group[0]
  if (!e) return null
  switch (e.t) {
    case 'startOfBattle':
      return 'Battle start!'
    case 'attack': {
      const a = nameOf(e.a, units)
      const b = nameOf(e.b, units)
      return a && b ? `${a} attacks ${b}.` : null
    }
    case 'faint': {
      const name = nameOf(e.unit, units)
      return name ? `${name} faints.` : null
    }
    case 'summon':
      return `${CONTENT.getUnit(e.unit.defId).name} is summoned.`
    default:
      // 'ability' has its own card; 'end' is covered by the result overlay; the rest are popups.
      return null
  }
}
