import type { ReactNode } from 'react'
import { GoldCounter } from './GoldCounter'
import { type IconName, Icon } from './ui/Icon'

/** The run stats as parchment slots in wooden frames, each with a gold medallion for its icon. */
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
  const pill = (icon: IconName, value: ReactNode, testId: string, label: string): ReactNode => (
    <div className="hud-pill" title={label}>
      <span className="icon">
        <Icon name={icon} size={36} />
      </span>
      <span data-testid={testId}>{value}</span>
    </div>
  )
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        // The medallions stand ~20px off the left end of each slot, so the row starts and spaces
        // itself to leave room for them.
        left: 42,
        display: 'flex',
        alignItems: 'center',
        gap: 40,
      }}
    >
      <GoldCounter gold={gold} />
      {pill('heart', lives, 'lives', 'Lives')}
      {pill('hourglass', turn, 'turn', 'Turn')}
      {pill('trophy', `${trophies}/10`, 'trophies', 'Trophies')}
    </div>
  )
}
