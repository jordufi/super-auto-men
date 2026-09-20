import type { ReactNode } from 'react'
import { ROLL_COST } from '@sam/sim'
import { Icon } from './ui/Icon'

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
        Roll <Icon name="dice" size={30} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 22 }}>
          {ROLL_COST}
          <Icon name="coin" size={22} />
        </span>
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
          Sell <Icon name="bag" size={30} />
        </button>
        <button
          className="big-btn"
          data-testid="freeze"
          disabled={!p.canFreeze}
          onClick={p.onFreeze}
        >
          Freeze <Icon name="snowflake" size={30} />
        </button>
      </div>
      <button className="big-btn" data-testid="end-turn" onClick={p.onEndTurn}>
        End turn <Icon name="swords" size={30} />
      </button>
    </div>
  )
}
