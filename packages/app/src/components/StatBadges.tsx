import type { ReactNode } from 'react'

/** The attack/health pair drawn as coins under a unit, as in the reference art. */
export function StatBadges({
  atk,
  hp,
  size = 34,
}: {
  atk: number
  hp: number
  size?: number
}): ReactNode {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.5) }
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <span data-testid="atk" className="stat-badge atk" style={style}>
        {atk}
      </span>
      <span data-testid="hp" className="stat-badge hp" style={style}>
        {hp}
      </span>
    </div>
  )
}
