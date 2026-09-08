import type { ReactNode } from 'react'
import { getSprite } from '../assets/units'

const HUES = [8, 40, 90, 150, 200, 260, 300, 330]

function hue(id: string): number {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return HUES[h % HUES.length]!
}

/** The PNG for the unit, or a lettered tile for units without a sprite yet. */
export function UnitSprite({ defId, size }: { defId: string; size: number }): ReactNode {
  const url = getSprite(defId)
  if (url) {
    return (
      <img
        src={url}
        alt={defId}
        className="sprite"
        draggable={false}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          // Bottom, not centre: sprites have uneven transparent padding, and this is what makes
          // them all stand on the slab instead of floating at different heights.
          objectPosition: 'bottom',
          pointerEvents: 'none',
        }}
      />
    )
  }
  return (
    <div
      aria-label={defId}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        border: '3px solid var(--ink)',
        display: 'grid',
        placeContent: 'center',
        fontSize: size * 0.5,
        fontWeight: 800,
        color: 'var(--ink)',
        background: `hsl(${hue(defId)} 65% 62%)`,
      }}
    >
      {defId.slice(0, 1).toUpperCase()}
    </div>
  )
}
