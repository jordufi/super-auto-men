// Rebuilds the board at any point of a BattleLog by folding the events (ARCHITECTURE.md §6.2).
// Pure and idempotent: jumping to a step is just folding again from the start.
//
// The fold mirrors the sim's board exactly: five slots per side, holes included. `summon` and
// `faint` events carry a SLOT index, and within a round the sim leaves holes behind fainted units
// that later summons drop into — so a dense list would place them wrong. The sim compacts at the
// top of every round (battle.ts), which in the log is the moment just before each `attack`; the
// fold compacts there too. Only the dense, display-ready view is handed out.
import type { BattleEvent, BattleLog, UnitInstance } from '@sam/sim'

/** Five slots per side, front first. null = empty, exactly as the sim holds it. */
type SlotList = (UnitInstance | null)[]

export interface FoldedBoard {
  /** Units in board order, front first. Dense: compaction is a sim-internal detail. */
  sides: [UnitInstance[], UnitInstance[]]
}

export interface Popup {
  iid: string
  kind: 'damage' | 'buff' | 'status'
  text: string
}

const clone = (u: UnitInstance): UnitInstance => ({ ...u, statuses: [...u.statuses] })

const dense = (slots: SlotList): UnitInstance[] => slots.filter((u): u is UnitInstance => u !== null)

/** Moves units toward the front, preserving order, in place — the sim's `compact`. */
function compact(slots: SlotList): void {
  const units = dense(slots)
  for (let i = 0; i < slots.length; i++) slots[i] = units[i] ?? null
}

/** Units are found by iid, never by position: only `summon` needs a slot index. */
function find(sides: [SlotList, SlotList], iid: string): UnitInstance | null {
  for (const side of [0, 1] as const) {
    const unit = sides[side].find((u) => u?.iid === iid)
    if (unit) return unit
  }
  return null
}

/** The board after `log.events[0..n)` have been applied. */
export function boardAt(log: BattleLog, n: number): FoldedBoard {
  const sides: [SlotList, SlotList] = [
    log.teams[0].slots.map((u) => (u ? clone(u) : null)),
    log.teams[1].slots.map((u) => (u ? clone(u) : null)),
  ]
  // The sim compacts once before `startOfBattle`, so onStartOfBattle summons already see a
  // gapless board.
  compact(sides[0])
  compact(sides[1])

  for (const event of log.events.slice(0, Math.max(0, n))) {
    if (event.t === 'attack') {
      compact(sides[0])
      compact(sides[1])
    }
    applyEvent(sides, event)
  }
  return { sides: [dense(sides[0]), dense(sides[1])] }
}

function applyEvent(sides: [SlotList, SlotList], e: BattleEvent): void {
  switch (e.t) {
    case 'damage': {
      const unit = find(sides, e.unit)
      if (unit) unit.hp -= e.amount
      break
    }
    case 'buff': {
      const unit = find(sides, e.unit)
      if (!unit) break
      if (e.temporary) {
        unit.tmpAtk += e.atk
        unit.tmpHp += e.hp
      } else {
        unit.atk += e.atk
        unit.hp += e.hp
      }
      break
    }
    case 'status': {
      const unit = find(sides, e.unit)
      if (!unit) break
      unit.statuses = e.applied
        ? [...unit.statuses, e.status]
        : unit.statuses.filter((s) => s !== e.status)
      break
    }
    case 'summon': {
      // The sim picked this slot with `findFreeSlot`, so it is empty on the real board too.
      sides[e.side][e.position] = clone(e.unit)
      break
    }
    case 'faint': {
      const slots = sides[e.side]
      const i = slots.findIndex((u) => u?.iid === e.unit)
      if (i >= 0) slots[i] = null
      break
    }
    // attack carries no state of its own: the damage events that ride with it do the work.
    default:
      break
  }
}

const sign = (n: number): string => (n < 0 ? String(n) : `+${n}`)

/** The floating numbers to show for the events playing at this moment. */
export function popupsFor(events: readonly BattleEvent[]): Popup[] {
  const out: Popup[] = []
  for (const e of events) {
    if (e.t === 'damage') out.push({ iid: e.unit, kind: 'damage', text: `-${e.amount}` })
    else if (e.t === 'buff' && (e.atk !== 0 || e.hp !== 0)) {
      out.push({ iid: e.unit, kind: 'buff', text: `${sign(e.atk)}/${sign(e.hp)}` })
    } else if (e.t === 'status' && e.applied) out.push({ iid: e.unit, kind: 'status', text: e.status })
  }
  return out
}
