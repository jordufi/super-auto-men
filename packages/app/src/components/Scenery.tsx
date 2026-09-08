// The illustrated backdrop for the shop and battle screens: sky, clouds, mountains, a tree line
// and alternating grass/dirt lanes. Pure SVG so it scales with the stage and costs no requests.
// The lane Y positions here are the contract the screens lay their rows out against.
import type { ReactNode } from 'react'
import { STAGE_H, useStageWidth } from './Stage'

export const LANE = {
  team: 275,
  shop: 465,
  height: 160,
} as const

/** A band whose top edge is a row of soft bumps — grass tufts and canopy edges. */
function band(w: number, y: number, h: number, bump: number, step = 48): string {
  let d = `M0 ${y}`
  for (let x = 0; x < w; x += step) d += ` q ${step / 2} ${-bump} ${step} 0`
  return `${d} L${w} ${y + h} L0 ${y + h} Z`
}

/** Evenly spread `n` items across the width, inset from both edges. */
function spread(w: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.round((w * (i + 0.5)) / n))
}

/** One triangle per peak, as an SVG path. */
function peaks(w: number, n: number, base: number, height: number, phase: number): string {
  const step = w / n
  return spread(w, n)
    .map((cx) => {
      const x = cx + phase * step
      return `M${x - step * 0.75} ${base} L${x} ${base - height} L${x + step * 0.75} ${base} Z`
    })
    .join(' ')
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }): ReactNode {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#ffffff">
      <ellipse cx="0" cy="0" rx="46" ry="26" />
      <ellipse cx="-38" cy="8" rx="30" ry="19" />
      <ellipse cx="38" cy="10" rx="34" ry="17" />
      <ellipse cx="6" cy="-18" rx="26" ry="18" />
    </g>
  )
}

/** One row of overlapping blobs, used for the distant tree canopy. */
function Canopy({
  w,
  y,
  r,
  step,
  fill,
}: {
  w: number
  y: number
  r: number
  step: number
  fill: string
}): ReactNode {
  const blobs = []
  for (let x = -20; x < w + 40; x += step) blobs.push(x)
  return (
    <g fill={fill}>
      {blobs.map((x, i) => (
        <ellipse key={i} cx={x} cy={y - (i % 3) * 5} rx={r} ry={r * 0.78} />
      ))}
      <rect x="0" y={y} width={w} height={90} />
    </g>
  )
}

export function Scenery(): ReactNode {
  // Drawn at the live stage width so nothing is stretched: the bands simply get longer, and the
  // clouds and peaks are spread across whatever width this device gets.
  const W = useStageWidth()
  return (
    <svg
      className="scenery"
      data-testid="scenery"
      viewBox={`0 0 ${W} ${STAGE_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5cc9f0" />
          <stop offset="100%" stopColor="#c3eefb" />
        </linearGradient>
      </defs>

      <rect width={W} height={STAGE_H} fill="url(#sky)" />

      {spread(W, 4).map((x, i) => (
        <Cloud key={i} x={x} y={[62, 40, 70, 38][i] ?? 55} s={[1.05, 0.8, 1.2, 0.9][i] ?? 1} />
      ))}

      {/* Two mountain ranges, the far one washed out by haze. */}
      <path d={peaks(W, 5, 210, 150, 0)} fill="#8fc6e2" />
      <path d={peaks(W, 4, 212, 110, 0.4)} fill="#63a4cb" />

      <Canopy w={W} y={206} r={40} step={54} fill="#2f7f3d" />
      <Canopy w={W} y={232} r={34} step={46} fill="#3d9c48" />

      {/* Ground lanes. Grass is bumpy on top, dirt is flat — same read as the reference art. */}
      <path d={band(W, 246, 34, 9)} fill="#86c944" />
      <rect x="0" y={LANE.team - 5} width={W} height={LANE.height + 10} fill="#e6c664" />
      <path d={band(W, LANE.team + LANE.height + 5, 30, 9)} fill="#86c944" />
      <rect x="0" y={LANE.shop - 5} width={W} height={LANE.height + 10} fill="#e6c664" />
      <path d={band(W, LANE.shop + LANE.height + 5, 130, 11)} fill="#6cb43c" />
      <path d={band(W, 660, 60, 13, 60)} fill="#3f8f2f" />
    </svg>
  )
}
