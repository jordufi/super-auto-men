// Dev-only view of the events the reducer produced for the last action, so abilities firing in
// the shop are visible before the battle screen exists (PLAN.md Phase 8 step 2).
import type { ReactNode } from 'react'
import { useRunStore } from '../store/runStore'

export function EventLog(): ReactNode {
  const events = useRunStore((s) => s.events)
  if (!import.meta.env.DEV || events.length === 0) return null
  return (
    <div
      data-testid="event-log"
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        maxWidth: 340,
        maxHeight: 180,
        overflow: 'hidden',
        padding: 8,
        borderRadius: 8,
        background: '#0d0d16cc',
        font: '12px/1.4 ui-monospace, monospace',
        color: 'var(--muted)',
      }}
    >
      {events.map((e, i) => (
        <div key={i}>{JSON.stringify(e)}</div>
      ))}
    </div>
  )
}
