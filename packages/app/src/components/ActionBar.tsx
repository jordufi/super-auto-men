import type { ReactNode } from 'react'
import { ROLL_COST } from '@sam/sim'

export interface ActionBarProps {
  canRoll: boolean
  canSell: boolean
  canFreeze: boolean
  sellDropTarget: boolean
  onRoll: () => void
  onSell: () => void
  onFreeze: () => void
  onEndTurn: () => void
}

export function ActionBar(p: ActionBarProps): ReactNode {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
      }}
    >
      <button className="big-btn" data-testid="roll" disabled={!p.canRoll} onClick={p.onRoll}>
        Roll <span aria-hidden="true">{'\u{1F3B2}'}</span>
        <span style={{ fontSize: 18, WebkitTextStroke: '1.5px var(--ink)' }}>{ROLL_COST}</span>
      </button>
      <div style={{ display: 'flex', gap: 14 }}>
        {/* Doubles as the sell drop zone (PLAN.md Phase 9 step 2). */}
        <button
          className={`big-btn${p.sellDropTarget ? ' drop-target' : ''}`}
          data-testid="sell"
          data-drop-kind="sell"
          data-drop-index={0}
          data-drop-target={p.sellDropTarget ? 'true' : undefined}
          disabled={!p.canSell}
          onClick={p.onSell}
        >
          Sell <span aria-hidden="true">{'\u{1F4B0}'}</span>
        </button>
        <button
          className="big-btn"
          data-testid="freeze"
          disabled={!p.canFreeze}
          onClick={p.onFreeze}
        >
          Freeze <span aria-hidden="true">{'❄'}</span>
        </button>
      </div>
      <button className="big-btn" data-testid="end-turn" onClick={p.onEndTurn}>
        End turn <span aria-hidden="true">{'⚔'}</span>
      </button>
    </div>
  )
}
