// What a unit stands on: an optional stone slab (the shop's slot marker) and a soft contact shadow.
// Shared so the shop and the battle cannot drift apart. Neither piece ever carries the unit's own
// animation; see the transform rules at the top of styles/motion.css.
import type { ReactNode } from 'react'

export interface UnitGroundProps {
  /** The stone slab is the slot in the shop; in battle units stand straight on the ground. */
  slab?: 'none' | 'rest' | 'target' | 'frozen'
  shadow?: boolean
}

export function UnitGround({ slab = 'none', shadow = true }: UnitGroundProps): ReactNode {
  return (
    <>
      {slab !== 'none' && <div className={slab === 'rest' ? 'slab' : `slab ${slab}`} />}
      {shadow && <div className="unit-shadow" />}
    </>
  )
}
