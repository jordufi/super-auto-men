// The logical canvas every screen draws into (PLAN.md Phase 7 step 2).
//
// The height is fixed at 720 logical px; the WIDTH adapts to the device so phones from 4:3 to
// ultra-wide fill their screen instead of sitting in pillarbox bars. Screens must therefore lay
// out against the stage width they are given, never against a hard-coded 1280.
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react'

export const STAGE_H = 720

/** The design width. Still the width a 16:9 device gets, so existing layouts are unchanged there. */
export const STAGE_W = 1280

/**
 * Narrower than MIN_W and the team row (5 slots + the lane sign) stops fitting; wider than MAX_W
 * and the rows drift so far apart they stop reading as one board. Outside the range we letterbox.
 */
export const MIN_W = 1000
export const MAX_W = 1800

export interface StageLayout {
  width: number
  scale: number
}

export function stageLayout(vw: number, vh: number): StageLayout {
  // The logical width that would exactly fill this viewport at a scale of vh/STAGE_H.
  const wanted = vh > 0 ? (vw / vh) * STAGE_H : STAGE_W
  const width = Math.round(Math.min(MAX_W, Math.max(MIN_W, wanted)))
  // Inside the clamp these two are equal and the stage fills the screen. Outside it, the smaller
  // one wins and the leftover shows as bars — the same letterbox rule as before, just rarer.
  const scale = Math.min(vw / width, vh / STAGE_H)
  return { width, scale }
}

/**
 * Rows and controls live in a centred column at most this wide. Without it an ultra-wide phone
 * flings the action buttons into opposite corners while the board floats alone in the middle.
 * The scenery still spans the full stage width.
 */
export const CONTENT_W = 1280

const StageWidthContext = createContext(STAGE_W)

/** The current logical stage width. Use it instead of STAGE_W anywhere layout depends on it. */
export function useStageWidth(): number {
  return useContext(StageWidthContext)
}

/** The width of the centred column that rows and controls lay out in. */
export function useContentWidth(): number {
  return Math.min(useContext(StageWidthContext), CONTENT_W)
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
  const { width, scale } = stageLayout(size.w, size.h)

  return (
    <div className="stage-viewport">
      <div
        className="stage"
        data-testid="stage"
        // useDrag reads this to convert client pixels into logical ones.
        data-logical-width={width}
        style={{ width, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        <StageWidthContext.Provider value={width}>{children}</StageWidthContext.Provider>
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
