import type { ReactNode } from 'react'

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
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
      <button data-testid="roll" disabled={!p.canRoll} onClick={p.onRoll}>
        Roll (1)
      </button>
      {/* Doubles as the sell drop zone (PLAN.md Phase 9 step 2). */}
      <button
        data-testid="sell"
        data-drop-kind="sell"
        data-drop-index={0}
        data-drop-target={p.sellDropTarget ? 'true' : undefined}
        disabled={!p.canSell}
        onClick={p.onSell}
        style={
          p.sellDropTarget ? { borderColor: 'var(--accent)', background: '#6c8cff33' } : undefined
        }
      >
        Sell
      </button>
      <button data-testid="freeze" disabled={!p.canFreeze} onClick={p.onFreeze}>
        Freeze
      </button>
      <button
        data-testid="end-turn"
        onClick={p.onEndTurn}
        style={{ marginLeft: 40, background: 'var(--accent)', borderColor: 'var(--accent)' }}
      >
        End turn
      </button>
    </div>
  )
}
