// Rebuilds the board at any point of a BattleLog by folding the events (ARCHITECTURE.md §6.2).
// Pure and idempotent: jumping to a step is just folding again from the start.
import type { BattleEvent, BattleLog, Side, UnitInstance } from '@sam/sim'

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

function find(board: FoldedBoard, iid: string): { unit: UnitInstance; side: Side; index: number } | null {
  for (const side of [0, 1] as const) {
    const index = board.sides[side].findIndex((u) => u.iid === iid)
    if (index >= 0) return { unit: board.sides[side][index]!, side, index }
  }
  return null
}

/** The board after `log.events[0..n)` have been applied. */
export function boardAt(log: BattleLog, n: number): FoldedBoard {
  const board: FoldedBoard = {
    sides: [
      log.teams[0].slots.filter((u) => u !== null).map(clone),
      log.teams[1].slots.filter((u) => u !== null).map(clone),
    ],
  }
  for (const event of log.events.slice(0, Math.max(0, n))) applyEvent(board, event)
  return board
}

function applyEvent(board: FoldedBoard, e: BattleEvent): void {
  switch (e.t) {
    case 'damage': {
      const hit = find(board, e.unit)
      if (hit) hit.unit.hp -= e.amount
      break
    }
    case 'buff': {
      const hit = find(board, e.unit)
      if (!hit) break
      if (e.temporary) {
        hit.unit.tmpAtk += e.atk
        hit.unit.tmpHp += e.hp
      } else {
        hit.unit.atk += e.atk
        hit.unit.hp += e.hp
      }
      break
    }
    case 'status': {
      const hit = find(board, e.unit)
      if (!hit) break
      hit.unit.statuses = e.applied
        ? [...hit.unit.statuses, e.status]
        : hit.unit.statuses.filter((s) => s !== e.status)
      break
    }
    case 'summon': {
      const list = board.sides[e.side]
      list.splice(Math.min(e.position, list.length), 0, clone(e.unit))
      break
    }
    case 'faint': {
      const list = board.sides[e.side]
      const i = list.findIndex((u) => u.iid === e.unit)
      if (i >= 0) list.splice(i, 1)
      break
    }
    // attack carries no state of its own: the damage events that ride with it do the work.
    default:
      break
  }
}

/** The floating numbers to show for the events playing at this moment. */
export function popupsFor(events: readonly BattleEvent[]): Popup[] {
  const out: Popup[] = []
  for (const e of events) {
    if (e.t === 'damage') out.push({ iid: e.unit, kind: 'damage', text: `-${e.amount}` })
    else if (e.t === 'buff' && (e.atk !== 0 || e.hp !== 0)) {
      out.push({ iid: e.unit, kind: 'buff', text: `+${e.atk}/+${e.hp}` })
    } else if (e.t === 'status' && e.applied) out.push({ iid: e.unit, kind: 'status', text: e.status })
  }
  return out
}
