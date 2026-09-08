import { type ReactNode, useLayoutEffect, useRef } from 'react'
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

const EDGE_MARGIN = 8

/**
 * Positions an AbilityCard above the unit card being hovered or held, nudged back inside the
 * stage when centring it would push it off an edge. The stage clips its overflow, so a card near
 * the end of a row would otherwise have its text cut off — exactly when it is being read.
 *
 * The nudge is written straight to the DOM rather than held in state: it is a measurement of the
 * layout that has just happened, and re-rendering to store it would only invite a second pass.
 */
export function AbilityTooltip(props: AbilityTooltipProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const stage = el?.closest<HTMLElement>('.stage')
    if (!el || !stage) return
    el.style.transform = 'translateX(-50%)' // measure from the un-nudged position
    const stageBox = stage.getBoundingClientRect()
    const box = el.getBoundingClientRect()
    // The stage is CSS-scaled, so client pixels must be divided back into logical ones.
    const scale = stage.offsetWidth > 0 ? stageBox.width / stage.offsetWidth : 1
    const margin = EDGE_MARGIN * scale
    let dx = 0
    if (box.left < stageBox.left + margin) dx = stageBox.left + margin - box.left
    else if (box.right > stageBox.right - margin) dx = stageBox.right - margin - box.right
    if (dx !== 0) el.style.transform = `translateX(calc(-50% + ${dx / scale}px))`
  })

  return (
    <div
      ref={ref}
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
