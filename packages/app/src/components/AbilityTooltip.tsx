import type { ReactNode } from 'react'
import type { Level } from '@sam/sim'
import { CONTENT, describeAbility, describeFood } from '@sam/content'
import { AbilityCard } from './AbilityCard'

/** Ability text with {atk}/{hp}/{amount}/{count} filled in for the unit's current level. */
export function abilityText(kind: 'unit' | 'food', defId: string, level: Level): string | null {
  if (kind === 'food') return describeFood(CONTENT.getFood(defId))
  const ability = CONTENT.getUnit(defId).ability
  return ability ? describeAbility(ability, level) : null
}

export interface AbilityTooltipProps {
  /** The card no longer prints a name label, so the tooltip is where the name lives. */
  name: string
  tier: number
  text: string | null
  trigger?: string
}

/** Positions an AbilityCard above the unit card being hovered or held. */
export function AbilityTooltip(props: AbilityTooltipProps): ReactNode {
  return (
    <div
      data-testid="ability-tooltip"
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 10px)',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      <AbilityCard {...props} />
    </div>
  )
}
