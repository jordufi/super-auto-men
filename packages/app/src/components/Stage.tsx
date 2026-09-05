// A fixed 1280x720 logical canvas scaled to fit the viewport (PLAN.md Phase 7 step 2).
// Every screen uses absolute logical coordinates, so all devices look identical and
// Playwright screenshots are stable.
import { type ReactNode, useEffect, useState } from 'react'

export const STAGE_W = 1280
export const STAGE_H = 720

export function stageScale(vw: number, vh: number): number {
  return Math.min(vw / STAGE_W, vh / STAGE_H)
}

export function Stage({ children }: { children: ReactNode }): ReactNode {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))

  useEffect(() => {
    const onResize = (): void => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  const portrait = size.h > size.w
  const scale = stageScale(size.w, size.h)

  return (
    <div className="stage-viewport">
      <div
        className="stage"
        data-testid="stage"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </div>
      {portrait && (
        <div className="rotate-overlay" data-testid="rotate-overlay">
          <div style={{ fontSize: 48 }}>&#8635;</div>
          <div>Rotate your device</div>
        </div>
      )}
    </div>
  )
}
