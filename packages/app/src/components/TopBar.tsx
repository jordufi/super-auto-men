import type { ReactNode } from 'react'
import { GoldCounter } from './GoldCounter'

export function TopBar({
  turn,
  lives,
  trophies,
  gold,
}: {
  turn: number
  lives: number
  trophies: number
  gold: number
}): ReactNode {
  const cell = (label: string, value: ReactNode, testId: string): ReactNode => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
      <span style={{ color: 'var(--muted)', fontSize: 15 }}>{label}</span>
      <span data-testid={testId} style={{ fontSize: 24, fontWeight: 800 }}>
        {value}
      </span>
    </div>
  )
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 40,
        padding: '0 32px',
        background: 'var(--panel)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      {cell('Turn', turn, 'turn')}
      {cell('Lives', lives, 'lives')}
      {cell('Trophies', `${trophies}/10`, 'trophies')}
      <div style={{ marginLeft: 'auto' }}>
        <GoldCounter gold={gold} />
      </div>
    </div>
  )
}
