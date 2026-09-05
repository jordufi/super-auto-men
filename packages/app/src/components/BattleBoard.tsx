// Renders one folded board state. Everything it shows comes from the log; nothing is computed.
import type { ReactNode } from 'react'
import type { UnitInstance } from '@sam/sim'
import type { FoldedBoard, Popup as PopupData } from '../replay/fold'
import { UnitSprite } from './UnitSprite'
import { Popup } from './Popup'

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

function Unit({ unit, side, props }: { unit: UnitInstance; side: 0 | 1; props: BattleBoardProps }): ReactNode {
  const popups = props.popups.filter((p) => p.iid === unit.iid)
  return (
    <div
      data-testid={`battle-unit-${unit.iid}`}
      data-side={side}
      className={classFor(unit.iid, props)}
      style={{ position: 'relative', width: 130, textAlign: 'center' }}
    >
      {popups.map((p, i) => (
        <Popup key={i} popup={p} />
      ))}
      <div style={{ transform: side === 1 ? 'scaleX(-1)' : undefined }}>
        <UnitSprite defId={unit.defId} size={96} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>
        <span style={{ color: 'var(--atk)' }}>{unit.atk + unit.tmpAtk}</span>
        <span style={{ color: 'var(--hp)' }}>{unit.hp + unit.tmpHp}</span>
      </div>
      {unit.statuses.length > 0 && (
        <div style={{ fontSize: 12, color: '#7fd7ff' }}>{unit.statuses.join(' ')}</div>
      )}
    </div>
  )
}

export function BattleBoard(props: BattleBoardProps): ReactNode {
  const { board } = props
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60 }}>
      {/* Side 0 faces right: front unit closest to the middle. */}
      <div data-testid="side-0" style={{ display: 'flex', flexDirection: 'row-reverse', gap: 10, minWidth: 480, justifyContent: 'flex-start' }}>
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
    </div>
  )
}
