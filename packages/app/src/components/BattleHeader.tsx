// The two sides of a fight, as in the reference art: a team-coloured ribbon and medallion each,
// and the VS crest between them. Opponents carry no name or portrait, so the labels are generic.
import type { ReactNode } from 'react'
import { useContentWidth } from './Stage'
import { Icon } from './ui/Icon'

/** Ribbon width is `min-width` (260); the crest is 100 wide; the medallion is 88. */
const RIBBON_GAP = 70
const RIBBON_W = 260

export function BattleHeader({ lives, top }: { lives: number; top: number }): ReactNode {
  const w = useContentWidth()
  const mid = w / 2
  return (
    <div
      data-testid="battle-header"
      style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}
    >
      <div style={{ position: 'relative', width: w, height: 84 }}>
        <div className="ribbon blue" style={{ position: 'absolute', top: 0, left: mid - RIBBON_GAP - RIBBON_W }}>
          YOU
        </div>
        <div className="ribbon red" style={{ position: 'absolute', top: 0, left: mid + RIBBON_GAP }}>
          RIVAL
        </div>
        <div
          className="medallion team-a"
          style={{ position: 'absolute', top: -12, left: mid - RIBBON_GAP - RIBBON_W - 54 }}
        >
          <Icon name="paw" size={48} />
          <span className="stat-badge hp lives" aria-label="Lives">
            {lives}
          </span>
        </div>
        <div
          className="medallion team-b"
          style={{ position: 'absolute', top: -12, left: mid + RIBBON_GAP + RIBBON_W - 34 }}
        >
          <Icon name="paw" size={48} />
        </div>
        <div className="crest" style={{ position: 'absolute', top: -18, left: mid - 50 }}>
          <span>VS</span>
        </div>
      </div>
    </div>
  )
}
