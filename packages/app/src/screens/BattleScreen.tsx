// Plays the last BattleLog. The UI computes nothing: every number comes from the folded log.
import { type ReactNode, useMemo } from 'react'
import type { BattleEvent, BattleLog, Level } from '@sam/sim'
import { CONTENT, describeAbility } from '@sam/content'
import { useRunStore } from '../store/runStore'
import { useUiStore } from '../store/uiStore'
import type { Speed } from '../store/urlParams'
import { boardAt, popupsFor } from '../replay/fold'
import { groupAt } from '../replay/timeline'
import { useReplay } from '../replay/useReplay'
import { BattleBoard } from '../components/BattleBoard'
import { TopBar } from '../components/TopBar'

const RESULT_TEXT = { a: 'Victory', b: 'Defeat', draw: 'Draw' } as const

export function BattleScreen(): ReactNode {
  const log = useRunStore((s) => s.lastBattle)
  const state = useRunStore((s) => s.state)
  // `endTurnAndBattle` already advanced the run to the next shop turn, so `state` holds the
  // post-battle lives and trophies. Showing it here would spoil the fight being replayed.
  const snapshot = useRunStore((s) => s.battleSnapshot)
  const speed = useUiStore((s) => s.speed)
  const setSpeed = useUiStore((s) => s.setSpeed)
  const setScreen = useUiStore((s) => s.setScreen)

  const { steps, cursor, done, applied, skip } = useReplay(log, speed)
  const group: BattleEvent[] = useMemo(() => (done ? [] : groupAt(steps, cursor)), [steps, done, cursor])
  // A faint is shown before it is applied, so the unit can fade out while it is still on the board.
  const fainting = group[0]?.t === 'faint' ? group[0].unit : null
  const shown = fainting ? cursor : applied
  const board = useMemo(() => (log ? boardAt(log, shown) : null), [log, shown])
  const units = useMemo(() => (log ? unitIndex(log) : new Map<string, { defId: string; level: Level }>()), [log])

  if (!log || !board || !state) return null
  const shownRun = snapshot ?? state

  const head = group[0]
  const abilitySource = head?.t === 'ability' ? head.source : null
  const abilityText = abilityLine(group, units)

  const cont = (): void => {
    const over = state.phase === 'won' || state.phase === 'lost'
    setScreen(over ? 'runEnd' : 'shop')
  }

  return (
    <div data-testid="battle-screen" style={{ position: 'absolute', inset: 0 }}>
      <TopBar turn={shownRun.turn} lives={shownRun.lives} trophies={shownRun.trophies} gold={shownRun.gold} />

      <div style={{ position: 'absolute', top: 230, left: 0, right: 0 }}>
        <BattleBoard
          board={board}
          attacking={head?.t === 'attack' ? [head.a, head.b] : []}
          hurt={group.filter((e) => e.t === 'damage').map((e) => e.unit)}
          ability={abilitySource}
          summoned={group.filter((e) => e.t === 'summon').map((e) => e.unit.iid)}
          fainting={fainting}
          popups={popupsFor(group)}
        />
      </div>

      {abilityText && (
        <div data-testid="ability-banner" style={{ position: 'absolute', top: 130, left: 0, right: 0, textAlign: 'center', color: 'var(--gold)', fontSize: 20 }}>
          {abilityText}
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, display: 'flex', gap: 12, justifyContent: 'center' }}>
        {([1, 2, 'instant'] as Speed[]).map((s) => (
          <button
            key={String(s)}
            data-testid={`speed-${s}`}
            onClick={() => setSpeed(s)}
            style={speed === s ? { borderColor: 'var(--accent)', background: '#6c8cff33' } : undefined}
          >
            {s === 'instant' ? 'Instant' : `${s}x`}
          </button>
        ))}
        <button data-testid="skip" onClick={skip} disabled={done}>
          Skip
        </button>
      </div>

      {done && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', gap: 20, textAlign: 'center', background: '#0d0d16d9' }}>
          <div data-testid="battle-result" style={{ fontSize: 52, fontWeight: 800 }}>
            {RESULT_TEXT[log.result]}
          </div>
          {/* The result overlay is the moment the outcome lands, so it shows the CURRENT run. */}
          <div style={{ color: 'var(--muted)' }}>
            Trophies {state.trophies} &middot; Lives {state.lives} &middot; battle seed {log.seed}
          </div>
          <button data-testid="continue" style={{ justifySelf: 'center', fontSize: 22, padding: '12px 36px' }} onClick={cont}>
            Continue
          </button>
        </div>
      )}
    </div>
  )
}

type UnitIndex = Map<string, { defId: string; level: Level }>

/** Every unit that appears in the log, including the ones summoned during it. */
function unitIndex(log: BattleLog): UnitIndex {
  const map: UnitIndex = new Map()
  for (const team of log.teams) {
    for (const u of team.slots) if (u) map.set(u.iid, { defId: u.defId, level: u.level })
  }
  for (const e of log.events) {
    if (e.t === 'summon') map.set(e.unit.iid, { defId: e.unit.defId, level: e.unit.level })
  }
  return map
}

/** The ability text of the unit whose ability is firing, so the player can read what happened. */
function abilityLine(group: readonly BattleEvent[], units: UnitIndex): string | null {
  const e = group[0]
  if (e?.t !== 'ability') return null
  const found = units.get(e.source)
  if (!found) return null
  const def = CONTENT.getUnit(found.defId)
  return def.ability ? `${def.name}: ${describeAbility(def.ability, found.level)}` : null
}
