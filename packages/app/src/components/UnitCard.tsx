// One card, used for team units and for shop slots. Purely presentational.
import { type PointerEvent, type ReactNode, useRef, useState } from 'react'
import type { Level, Status } from '@sam/sim'
import { CONTENT } from '@sam/content'
import { UnitSprite } from './UnitSprite'
import { AbilityTooltip, abilityText } from './AbilityTooltip'

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

const LONG_PRESS_MS = 350

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
  const name = kind === 'food' ? CONTENT.getFood(defId).name : CONTENT.getUnit(defId).name
  const text = abilityText(kind, defId, level)
  const trigger = kind === 'unit' ? CONTENT.getUnit(defId).ability?.trigger : undefined

  const clearTimer = (): void => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  return (
    <div
      data-testid={testId}
      data-defid={defId}
      className="unit-card"
      onPointerDown={(e) => {
        timer.current = window.setTimeout(() => setShowText(true), LONG_PRESS_MS)
        onPointerDown?.(e)
      }}
      onPointerUp={() => {
        clearTimer()
        setShowText(false)
      }}
      onPointerLeave={() => {
        clearTimer()
        setShowText(false)
      }}
      onMouseEnter={() => setShowText(true)}
      onMouseLeave={() => setShowText(false)}
      style={{
        position: 'relative',
        width: 130,
        height: 150,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        padding: 6,
        borderRadius: 12,
        border: `2px solid ${selected ? 'var(--accent)' : 'transparent'}`,
        background: selected ? '#6c8cff22' : 'transparent',
        opacity: ghost ? 0.35 : 1,
        touchAction: 'none',
      }}
    >
      {showText && text && <AbilityTooltip text={text} {...(trigger ? { trigger } : {})} />}
      {statuses && statuses.length > 0 && (
        <div
          data-testid="statuses"
          data-statuses={statuses.join(' ')}
          style={{ position: 'absolute', top: 2, left: 6, display: 'flex', gap: 3, fontSize: 15 }}
        >
          {statuses.map((s) => (
            <span key={s} title={s}>
              {STATUS_ICON[s]}
            </span>
          ))}
        </div>
      )}
      {frozen && (
        <div
          data-testid="frozen-badge"
          style={{ position: 'absolute', top: 2, right: 6, fontSize: 20 }}
        >
          &#10052;
        </div>
      )}
      <UnitSprite defId={defId} size={84} />
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{name}</div>
      {kind === 'unit' && (
        <>
          <div style={{ display: 'flex', gap: 6, fontWeight: 800, fontSize: 16 }}>
            <span data-testid="atk" style={{ color: 'var(--atk)' }}>
              {atk}
            </span>
            <span data-testid="hp" style={{ color: 'var(--hp)' }}>
              {hp}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 3 }} data-testid="level" data-level={level}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                style={{
                  width: 8,
                  height: 5,
                  borderRadius: 2,
                  background: i < exp ? 'var(--gold)' : 'var(--line)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
