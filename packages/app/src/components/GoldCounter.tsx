import type { ReactNode } from 'react'
import { useRunStore } from '../store/runStore'

/**
 * Flashes when the reducer refuses an action (usually "not enough gold"). The refusal counter is
 * the element key, so React remounts the node and the CSS animation replays — no timers, no state.
 */
export function GoldCounter({ gold }: { gold: number }): ReactNode {
  const refused = useRunStore((s) => s.refused)
  return (
    <div key={refused} className={`hud-pill ${refused > 0 ? 'shake' : ''}`} title="Gold">
      <span className="icon" aria-hidden="true">
        {'\u{1FA99}'}
      </span>
      <span data-testid="gold">{gold}</span>
    </div>
  )
}
