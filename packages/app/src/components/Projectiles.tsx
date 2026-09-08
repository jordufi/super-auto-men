// Draws the thrown objects for the current step. Positions are measured from the rendered units,
// because the board is a flex row and only the DOM knows where a unit ended up.
import { type ReactNode, type RefObject, useLayoutEffect, useState } from 'react'
import type { Projectile } from '../replay/projectiles'

interface Shot extends Projectile {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface ProjectilesProps {
  items: readonly Projectile[]
  /** The positioned board element the shots are drawn inside. */
  boardRef: RefObject<HTMLDivElement | null>
  /** Changes once per replay step; re-measuring is keyed off it, not off `items` identity. */
  stepKey: number
}

export function Projectiles({ items, boardRef, stepKey }: ProjectilesProps): ReactNode {
  const [shots, setShots] = useState<Shot[]>([])

  useLayoutEffect(() => {
    const root = boardRef.current
    if (!root || items.length === 0) {
      setShots([])
      return
    }
    const box = root.getBoundingClientRect()
    // The stage is CSS-scaled, so client pixels must be divided back into logical ones.
    const scale = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1
    const centre = (iid: string): { x: number; y: number } | null => {
      const el = root.querySelector(`[data-testid="battle-unit-${iid}"]`)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        x: (r.left - box.left + r.width / 2) / scale,
        // Aim at the sprite rather than the stat badges under it.
        y: (r.top - box.top + r.height * 0.35) / scale,
      }
    }
    const next: Shot[] = []
    for (const p of items) {
      const a = centre(p.from)
      const b = centre(p.to)
      if (a && b) next.push({ ...p, x0: a.x, y0: a.y, x1: b.x, y1: b.y })
    }
    setShots(next)
  }, [stepKey, items, boardRef])

  if (shots.length === 0) return null
  return (
    <>
      {shots.map((s, i) => (
        <span
          key={`${stepKey}-${i}`}
          data-testid="projectile"
          data-kind={s.kind}
          className={`projectile ${s.kind}`}
          style={
            {
              '--x0': `${s.x0}px`,
              '--y0': `${s.y0}px`,
              '--x1': `${s.x1}px`,
              '--y1': `${s.y1}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  )
}
