// Plays the last BattleLog. The UI computes nothing: every number comes from the folded log.
import { type ReactNode, useMemo } from 'react'
import type { BattleEvent } from '@sam/sim'
import { useRunStore } from '../store/runStore'
import { useUiStore } from '../store/uiStore'
import type { Speed } from '../store/urlParams'
import { boardAt, popupsFor } from '../replay/fold'
import { groupAt } from '../replay/timeline'
import { useReplay } from '../replay/useReplay'
import { BattleBoard } from '../components/BattleBoard'
import { TopBar } from '../components/TopBar'
import { Scenery } from '../components/Scenery'
import { AbilityCard } from '../components/AbilityCard'
import { type UnitIndex, abilityCallout, narrate, unitIndex } from '../replay/narrate'
import { projectilesFor } from '../replay/projectiles'

const RESULT_TEXT = { a: 'Victory', b: 'Defeat', draw: 'Draw' } as const

const SPEED_LABEL: Record<string, string> = {
  manual: 'Step',
  '1': '1x',
  '2': '2x',
  instant: 'Instant',
}

export function BattleScreen(): ReactNode {
  const log = useRunStore((s) => s.lastBattle)
  const state = useRunStore((s) => s.state)
  // `endTurnAndBattle` already advanced the run to the next shop turn, so `state` holds the
  // post-battle lives and trophies. Showing it here would spoil the fight being replayed.
  const snapshot = useRunStore((s) => s.battleSnapshot)
  const speed = useUiStore((s) => s.speed)
  const setSpeed = useUiStore((s) => s.setSpeed)
  const setScreen = useUiStore((s) => s.setScreen)

  const { steps, cursor, done, applied, skip, next } = useReplay(log, speed)
  const group: BattleEvent[] = useMemo(
    () => (done ? [] : groupAt(steps, cursor)),
    [steps, done, cursor],
  )
  // A faint is shown before it is applied, so the unit can fade out while it is still on the board.
  const fainting = group[0]?.t === 'faint' ? group[0].unit : null
  const shown = fainting ? cursor : applied
  const board = useMemo(() => (log ? boardAt(log, shown) : null), [log, shown])
  const units: UnitIndex = useMemo(() => (log ? unitIndex(log) : new Map()), [log])

  if (!log || !board || !state) return null
  const shownRun = snapshot ?? state

  // At instant speed nothing is animated, so a thrown object would only flash.
  const projectiles = speed === 'instant' ? [] : projectilesFor(steps, cursor, group)

  const head = group[0]
  const abilitySource = head?.t === 'ability' ? head.source : null
  // An ability gets the full card; anything else worth reading gets a one-line message.
  const callout = abilityCallout(group, units)
  const message = narrate(group, units)

  const cont = (): void => {
    const over = state.phase === 'won' || state.phase === 'lost'
    setScreen(over ? 'runEnd' : 'shop')
  }

  return (
    <div data-testid="battle-screen" style={{ position: 'absolute', inset: 0 }}>
      <Scenery />
      <TopBar
        turn={shownRun.turn}
        lives={shownRun.lives}
        trophies={shownRun.trophies}
        gold={shownRun.gold}
      />

      <div style={{ position: 'absolute', top: 380, left: 0, right: 0 }}>
        <BattleBoard
          board={board}
          attacking={head?.t === 'attack' ? [head.a, head.b] : []}
          hurt={group.filter((e) => e.t === 'damage').map((e) => e.unit)}
          ability={abilitySource}
          summoned={group.filter((e) => e.t === 'summon').map((e) => e.unit.iid)}
          fainting={fainting}
          popups={popupsFor(group)}
          projectiles={projectiles}
          stepKey={cursor}
        />
      </div>

      {callout && (
        <div
          data-testid="ability-banner"
          style={{
            position: 'absolute',
            top: 70,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <AbilityCard
            size="callout"
            defId={callout.defId}
            name={callout.name}
            tier={callout.tier}
            trigger={callout.trigger}
            text={callout.text}
          />
        </div>
      )}

      {!callout && message && (
        <div
          data-testid="battle-message"
          style={{ position: 'absolute', top: 250, left: 0, right: 0, textAlign: 'center' }}
        >
          <span className="banner">{message}</span>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: 0,
          right: 0,
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
        }}
      >
        {(['manual', 1, 2, 'instant'] as Speed[]).map((s) => (
          <button
            key={String(s)}
            data-testid={`speed-${s}`}
            onClick={() => setSpeed(s)}
            className={`big-btn${speed === s ? '' : ' dim'}`}
            style={{ fontSize: 20, padding: '8px 18px' }}
          >
            {SPEED_LABEL[String(s)]}
          </button>
        ))}
        {speed === 'manual' && (
          <button
            className="big-btn"
            style={{ fontSize: 20, padding: '8px 22px' }}
            data-testid="next"
            onClick={next}
            disabled={done}
          >
            Next <span aria-hidden="true">{'▶'}</span>
          </button>
        )}
        <button
          className="big-btn"
          style={{ fontSize: 20, padding: '8px 18px' }}
          data-testid="skip"
          onClick={skip}
          disabled={done}
        >
          Skip
        </button>
      </div>

      {done && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeContent: 'center',
            gap: 20,
            textAlign: 'center',
            background: '#0d0d16bb',
          }}
        >
          <div data-testid="battle-result" style={{ fontSize: 52, fontWeight: 800 }}>
            {RESULT_TEXT[log.result]}
          </div>
          {/* The result overlay is the moment the outcome lands, so it shows the CURRENT run. */}
          <div style={{ color: 'var(--muted)' }}>
            Trophies {state.trophies} &middot; Lives {state.lives} &middot; battle seed {log.seed}
          </div>
          <button
            className="big-btn"
            data-testid="continue"
            style={{ justifySelf: 'center' }}
            onClick={cont}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  )
}
