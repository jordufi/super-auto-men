import type { ReactNode } from 'react'
import { GoldCounter } from './GoldCounter'

/** The run stats as white pills over the scenery: icon, then number. */
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
  const pill = (icon: string, value: ReactNode, testId: string, label: string): ReactNode => (
    <div className="hud-pill" title={label}>
      <span className="icon" aria-hidden="true">
        {icon}
      </span>
      <span data-testid={testId}>{value}</span>
    </div>
  )
  return (
    <div
      style={{
        position: 'absolute',
        top: 14,
        left: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <GoldCounter gold={gold} />
      {pill('❤️', lives, 'lives', 'Lives')}
      {pill('⏳', turn, 'turn', 'Turn')}
      {pill('\u{1F3C6}', `${trophies}/10`, 'trophies', 'Trophies')}
    </div>
  )
}
