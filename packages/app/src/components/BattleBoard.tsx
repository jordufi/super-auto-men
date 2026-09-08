// Renders one folded board state. Everything it shows comes from the log; nothing is computed.
import { type ReactNode, useRef } from 'react'
import type { UnitInstance } from '@sam/sim'
import type { FoldedBoard, Popup as PopupData } from '../replay/fold'
import { UnitSprite } from './UnitSprite'
import { Popup } from './Popup'
import { StatBadges } from './StatBadges'
import { Projectiles } from './Projectiles'
import type { Projectile } from '../replay/projectiles'

export interface BattleBoardProps {
  board: FoldedBoard
  /** Animation cues for the step being played. */
  attacking: string[]
  hurt: string[]
  ability: string | null
  summoned: string[]
  /** The unit that is fainting right now: still drawn, fading out. */
  fainting: string | null
  popups: PopupData[]
  /** Objects thrown between units for this step, and the step they belong to. */
  projectiles: readonly Projectile[]
  stepKey: number
}

function classFor(iid: string, p: BattleBoardProps): string {
  const parts = ['battle-unit']
  if (p.attacking.includes(iid)) parts.push('attacking')
  if (p.hurt.includes(iid)) parts.push('hurt')
  if (p.ability === iid) parts.push('ability')
  if (p.summoned.includes(iid)) parts.push('summoned')
  if (p.fainting === iid) parts.push('fainting')
  return parts.join(' ')
}

function Unit({
  unit,
  side,
  props,
}: {
  unit: UnitInstance
  side: 0 | 1
  props: BattleBoardProps
}): ReactNode {
  const popups = props.popups.filter((p) => p.iid === unit.iid)
  return (
    <div
      data-testid={`battle-unit-${unit.iid}`}
      data-side={side}
      className={classFor(unit.iid, props)}
      style={{
        position: 'relative',
        width: 130,
        height: 160,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
      }}
    >
      {popups.map((p, i) => (
        <Popup key={i} popup={p} />
      ))}
      <div className="slab" />
      <div
        className="unit-sprite-wrap"
        style={{ transform: side === 1 ? 'scaleX(-1)' : undefined }}
      >
        <UnitSprite defId={unit.defId} size={96} />
      </div>
      <StatBadges atk={unit.atk + unit.tmpAtk} hp={unit.hp + unit.tmpHp} size={47} />
      {unit.statuses.length > 0 && (
        <div className="banner" style={{ fontSize: 12, padding: '2px 8px' }}>
          {unit.statuses.join(' ')}
        </div>
      )}
    </div>
  )
}

export function BattleBoard(props: BattleBoardProps): ReactNode {
  const { board } = props
  // Projectiles are positioned against this element, so it has to be the positioned ancestor.
  const rootRef = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 60,
      }}
    >
      {/* Side 0 faces right: front unit closest to the middle. */}
      <div
        data-testid="side-0"
        style={{
          display: 'flex',
          flexDirection: 'row-reverse',
          gap: 10,
          minWidth: 480,
          justifyContent: 'flex-start',
        }}
      >
        {board.sides[0].map((u) => (
          <Unit key={u.iid} unit={u} side={0} props={props} />
        ))}
      </div>
      <div style={{ width: 40 }} />
      <div data-testid="side-1" style={{ display: 'flex', gap: 10, minWidth: 480 }}>
        {board.sides[1].map((u) => (
          <Unit key={u.iid} unit={u} side={1} props={props} />
        ))}
      </div>
      <Projectiles items={props.projectiles} boardRef={rootRef} stepKey={props.stepKey} />
    </div>
  )
}
