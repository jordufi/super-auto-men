import type { BattleEvent, BattleLog, Team, UnitInstance } from '@sam/sim'
import { unitsOf } from '@sam/sim'
import { UNITS, describeAbility } from '@sam/content'

/** Names and ability text from the real content. */
export const namer: Namer = {
  name: (id) => UNITS[id]?.name ?? id,
  ability: (id, level) => {
    const ability = UNITS[id]?.ability
    return ability ? describeAbility(ability, level) : undefined
  },
}

/** One-line rendering of a shop-phase event (no board tracking needed). */
export function formatShopEvent(e: BattleEvent): string {
  switch (e.t) {
    case 'ability':
      return `[ability] ${e.source}: ${e.trigger}`
    case 'buff':
      return `[buff] ${e.unit} +${e.atk}/+${e.hp}${e.temporary ? ' temp' : ''}`
    case 'gold':
      return `[gold] ${e.amount >= 0 ? '+' : ''}${e.amount}`
    case 'shop':
      return `[shop] ${e.op} +${e.atk}/+${e.hp}`
    case 'levelUp':
      return `[levelUp] ${e.unit} -> level ${e.level}`
    default:
      return `[${e.t}] ${JSON.stringify(e)}`
  }
}

export interface Namer {
  name(defId: string): string
  /** Ability text for a unit at a level, or undefined if it has none. */
  ability(defId: string, level: 1 | 2 | 3): string | undefined
}

/** Tracks the live board while walking the event log so every line can show current stats. */
class Tracker {
  private units = new Map<string, UnitInstance>()

  constructor(teams: [Team, Team]) {
    for (const t of teams) for (const u of unitsOf(t.slots)) this.units.set(u.iid, { ...u })
  }

  add(u: UnitInstance): void {
    this.units.set(u.iid, { ...u })
  }

  get(iid: string): UnitInstance | undefined {
    return this.units.get(iid)
  }

  damage(iid: string, amount: number): void {
    const u = this.units.get(iid)
    if (u) u.hp -= amount
  }

  private pendingAttackDamage = new Set<string>()

  expectAttackDamage(a: string | null, b: string | null): void {
    this.pendingAttackDamage = new Set([a, b].filter((x): x is string => x !== null))
  }

  /** True (and consumed) if this damage event is the one that follows an attack. */
  consumeAttackDamage(iid: string): boolean {
    return this.pendingAttackDamage.delete(iid)
  }

  buff(iid: string, atk: number, hp: number, temporary: boolean): void {
    const u = this.units.get(iid)
    if (!u) return
    if (temporary) {
      u.tmpAtk += atk
      u.tmpHp += hp
    } else {
      u.atk += atk
      u.hp += hp
    }
  }
}

function stats(u: UnitInstance | undefined, namer: Namer): string {
  if (!u) return '?'
  return `${namer.name(u.defId)} ${u.atk + u.tmpAtk}/${u.hp + u.tmpHp}`
}

function teamLine(label: string, team: Team, namer: Namer): string {
  const units = unitsOf(team.slots)
  return `  ${label}: ${units.length ? units.map((u) => stats(u, namer)).join(' · ') : '(empty)'}`
}

export function formatBattle(log: BattleLog, turn: number, namer: Namer): string {
  const out: string[] = []
  const track = new Tracker(log.teams)
  out.push(`Turn ${turn} · seed ${log.seed}`)
  out.push(teamLine('A', log.teams[0], namer))
  out.push(teamLine('B', log.teams[1], namer))
  out.push('')
  for (const e of log.events) {
    const line = formatEvent(e, track, namer)
    if (line) out.push(`  ${line}`)
  }
  out.push('')
  out.push(`  RESULT: ${log.result === 'draw' ? 'draw' : `${log.result.toUpperCase()} wins`}`)
  return out.join('\n')
}

function formatEvent(e: BattleEvent, track: Tracker, namer: Namer): string | null {
  switch (e.t) {
    case 'startOfBattle':
      return '[startOfBattle]'
    case 'attack': {
      const a = track.get(e.a)
      const b = track.get(e.b)
      const before = `${stats(a, namer)} vs ${stats(b, namer)}`
      track.damage(e.a, e.dmgToA)
      track.damage(e.b, e.dmgToB)
      // The loop emits one `damage` per hurt unit right after `attack`; those are folded in here.
      track.expectAttackDamage(e.dmgToA > 0 ? e.a : null, e.dmgToB > 0 ? e.b : null)
      return `[attack] ${before} -> ${stats(a, namer)} · ${stats(b, namer)}`
    }
    case 'damage':
      // Damage from attacks is already folded into the attack line; only show ability damage.
      if (track.consumeAttackDamage(e.unit)) return null
      track.damage(e.unit, e.amount)
      return `[damage] ${stats(track.get(e.unit), namer)} takes ${e.amount}`
    case 'buff':
      track.buff(e.unit, e.atk, e.hp, e.temporary)
      return `[buff] ${stats(track.get(e.unit), namer)} (+${e.atk}/+${e.hp}${e.temporary ? ' temp' : ''})`
    case 'ability': {
      const src = track.get(e.source)
      const text = src ? namer.ability(src.defId, src.level) : undefined
      return `[ability] ${stats(src, namer)}: ${text ?? e.trigger}`
    }
    case 'summon':
      track.add(e.unit)
      return `[summon] ${stats(e.unit, namer)} at ${e.side === 0 ? 'A' : 'B'}[${e.position}]`
    case 'faint':
      return `[faint] ${stats(track.get(e.unit), namer)} faints`
    case 'status':
      return `[status] ${stats(track.get(e.unit), namer)} ${e.applied ? 'gains' : 'loses'} ${e.status}`
    case 'levelUp':
      return `[levelUp] ${stats(track.get(e.unit), namer)} -> level ${e.level}`
    case 'gold':
      return `[gold] ${e.amount >= 0 ? '+' : ''}${e.amount}`
    case 'shop':
      return `[shop] ${e.op} +${e.atk}/+${e.hp}`
    case 'end':
      return null
  }
}
