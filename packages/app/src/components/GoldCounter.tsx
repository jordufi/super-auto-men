import type { ReactNode } from 'react'
import { useRunStore } from '../store/runStore'

/**
 * Flashes when the reducer refuses an action (usually "not enough gold"). The refusal counter is
 * the element key, so React remounts the node and the CSS animation replays — no timers, no state.
 */
export function GoldCounter({ gold }: { gold: number }): ReactNode {
  const refused = useRunStore((s) => s.refused)
  return (
    <div
      key={refused}
      data-testid="gold"
      className={refused > 0 ? 'shake' : ''}
      style={{ fontSize: 26, fontWeight: 800, color: 'var(--gold)' }}
    >
      {gold} <span style={{ fontSize: 16 }}>gold</span>
    </div>
  )
}
