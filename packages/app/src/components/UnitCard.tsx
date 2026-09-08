// One card, used for team units and for shop slots. Purely presentational.
import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import type { Level, Status } from '@sam/sim'
import { CONTENT } from '@sam/content'
import { useUiStore } from '../store/uiStore'
import { UnitSprite } from './UnitSprite'
import { AbilityTooltip, abilityText } from './AbilityTooltip'
import { TierBadge } from './TierBadge'
import { StatBadges } from './StatBadges'

export interface UnitCardProps {
  kind: 'unit' | 'food'
  defId: string
  atk?: number
  hp?: number
  level?: Level
  exp?: number
  /** Held items, so the player can see a perk before merging or selling the unit away. */
  statuses?: readonly Status[]
  frozen?: boolean
  selected?: boolean
  ghost?: boolean
  testId?: string
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void
}

// Short enough that a hold feels instant.
const LONG_PRESS_MS = 120

/**
 * Touch screens synthesise mouse events after a tap, so "hover" would fire there too and leave a
 * tooltip stuck on the card you just tapped. On a phone the long press is the only way in.
 */
const HOVER_CAPABLE =
  typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches === true

/** One glyph per held item (PLAN.md 1.6). `title` carries the name for anything ambiguous. */
const STATUS_ICON: Record<Status, string> = {
  meleeShield: '\u{1F348}', // melon
  garlic: '\u{1F9C4}',
  bone: '\u{1F356}', // meat bone
  honey: '\u{1F36F}',
  poison: '\u{1F95C}', // peanut
}

export function UnitCard(props: UnitCardProps): ReactNode {
  const {
    kind,
    defId,
    atk,
    hp,
    level = 1,
    exp = 0,
    statuses,
    frozen,
    selected,
    ghost,
    testId,
    onPointerDown,
  } = props
  const [showText, setShowText] = useState(false)
  const timer = useRef<number | null>(null)
  // Whether a pointer is currently down on this card. State, not a ref, because the end-of-press
  // listener below has to be armed by the press itself.
  const [pressed, setPressed] = useState(false)
  // Pointer capture is taken by the slot, so a card never sees the pointerup that ends a drag.
  // Watching the drag END is what dismisses the tooltip; the tooltip deliberately STAYS up while
  // the drag is in flight, so holding a card to read it keeps working even as the finger drifts.
  const dragging = useUiStore((s) => s.drag) !== null
  // "Adjust state during render" (the same pattern as useReplay), because the lint rule rightly
  // bans setState inside an effect.
  const [wasDragging, setWasDragging] = useState(false)
  if (wasDragging !== dragging) {
    setWasDragging(dragging)
    if (!dragging) setShowText(false)
  }
  const def = kind === 'food' ? CONTENT.getFood(defId) : CONTENT.getUnit(defId)
  const text = abilityText(kind, defId, level)
  const trigger = kind === 'unit' ? CONTENT.getUnit(defId).ability?.trigger : undefined

  const clearTimer = (): void => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  // The slot takes pointer capture, so the card receives neither the pointerup that ends a press
  // nor the one that ends a drag. The window receives both. This has to be armed by the press and
  // not by the tooltip: a quick tap ends before the long-press timer has even fired, and that
  // pending timer is exactly what used to leave a tooltip stuck on a tapped card.
  useEffect(() => {
    if (!pressed) return
    const end = (e: globalThis.PointerEvent): void => {
      setPressed(false)
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = null
      // A mouse keeps its hover tooltip; a finger lifting ends the press outright.
      if (e.pointerType !== 'mouse') setShowText(false)
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [pressed])

  const dismiss = (): void => {
    clearTimer()
    setPressed(false)
    setShowText(false)
  }

  return (
    <div
      data-testid={testId}
      data-defid={defId}
      className="unit-card"
      onPointerDown={(e) => {
        setPressed(true)
        timer.current = window.setTimeout(() => setShowText(true), LONG_PRESS_MS)
        onPointerDown?.(e)
      }}
      onPointerUp={dismiss}
      onPointerCancel={dismiss}
      // Hover, and only hover, is a mouse concept: driving this from mouseenter/mouseleave also
      // fired on the compatibility mouse events a tap synthesises, which left tooltips stuck.
      onPointerEnter={(e) => {
        if (HOVER_CAPABLE && e.pointerType === 'mouse') setShowText(true)
      }}
      onPointerLeave={(e) => {
        // A finger that is still down has not left: the slot takes pointer capture, and the first
        // move after that retargets events to it, which makes the browser fire pointerleave here.
        // Treating that as "the finger lifted" is what dismissed the tooltip mid-hold.
        if (pressed && e.pointerType !== 'mouse') return
        dismiss()
      }}
      style={{
        position: 'relative',
        width: 130,
        height: 150,
        borderRadius: 12,
        outline: selected ? '4px solid #fff' : 'none',
        background: selected ? '#ffffff33' : 'transparent',
        touchAction: 'none',
      }}
    >
      {showText && (
        <AbilityTooltip
          name={def.name}
          tier={def.tier}
          text={text}
          {...(trigger ? { trigger } : {})}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 6,
          padding: 6,
          opacity: ghost ? 0.35 : 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
          }}
        >
          <TierBadge tier={def.tier} />
        </div>
        {statuses && statuses.length > 0 && (
          <div
            data-testid="statuses"
            data-statuses={statuses.join(' ')}
            style={{ position: 'absolute', top: 2, left: 2, display: 'flex', gap: 3, fontSize: 15 }}
          >
            {statuses.map((s) => (
              <span key={s} title={s}>
                {STATUS_ICON[s]}
              </span>
            ))}
          </div>
        )}
        {/* Left, not right: a shop slot's price coin owns the top-right corner. */}
        {frozen && (
          <div
            data-testid="frozen-badge"
            style={{ position: 'absolute', top: 2, left: 2, fontSize: 20 }}
          >
            &#10052;
          </div>
        )}
        <div className="unit-sprite-wrap">
          <UnitSprite defId={defId} size={84} />
        </div>
        {kind === 'unit' && (
          <>
            <StatBadges atk={atk ?? 0} hp={hp ?? 0} />
            <div style={{ display: 'flex', gap: 3 }} data-testid="level" data-level={level}>
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 9,
                    height: 6,
                    borderRadius: 3,
                    border: '2px solid var(--ink)',
                    background: i < exp ? 'var(--gold)' : '#ffffffcc',
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
