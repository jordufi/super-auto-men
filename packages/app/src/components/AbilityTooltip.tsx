import type { ReactNode } from 'react'
import type { Level } from '@sam/sim'
import { CONTENT, describeAbility, describeFood } from '@sam/content'

/** Ability text with {atk}/{hp}/{amount}/{count} filled in for the unit's current level. */
export function abilityText(kind: 'unit' | 'food', defId: string, level: Level): string | null {
  if (kind === 'food') return describeFood(CONTENT.getFood(defId))
  const ability = CONTENT.getUnit(defId).ability
  return ability ? describeAbility(ability, level) : null
}

export function AbilityTooltip({ text, trigger }: { text: string; trigger?: string }): ReactNode {
  return (
    <div
      data-testid="ability-tooltip"
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 220,
        padding: '8px 10px',
        borderRadius: 10,
        background: '#0d0d16f2',
        border: '1px solid var(--line)',
        fontSize: 14,
        lineHeight: 1.3,
        textAlign: 'center',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      {trigger && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{trigger}</div>}
      {text}
    </div>
  )
}
