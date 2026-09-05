// The player's 5 slots. Index 0 is the front unit and is drawn on the RIGHT, facing the enemy.
import type { PointerEvent, ReactNode } from 'react'
import type { Slots } from '@sam/sim'
import { UnitCard } from './UnitCard'

export interface TeamBoardProps {
  team: Slots
  selected: number | null
  dropTarget: number | null
  dragging: number | null
  onSlotPointerDown: (slot: number, e: PointerEvent<HTMLElement>) => void
}

export function TeamBoard({
  team,
  selected,
  dropTarget,
  dragging,
  onSlotPointerDown,
}: TeamBoardProps): ReactNode {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'row-reverse', gap: 12, justifyContent: 'center' }}
    >
      {team.map((unit, slot) => (
        <div
          key={slot}
          data-testid={`team-slot-${slot}`}
          data-drop-kind="team"
          data-drop-index={slot}
          data-drop-target={dropTarget === slot ? 'true' : undefined}
          onPointerDown={(e) => onSlotPointerDown(slot, e)}
          style={{
            width: 140,
            height: 160,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 14,
            border: `2px dashed ${dropTarget === slot ? 'var(--accent)' : 'var(--line)'}`,
            background: dropTarget === slot ? '#6c8cff22' : '#ffffff08',
            touchAction: 'none',
          }}
        >
          {unit && (
            <UnitCard
              kind="unit"
              defId={unit.defId}
              atk={unit.atk + unit.tmpAtk}
              hp={unit.hp + unit.tmpHp}
              level={unit.level}
              exp={unit.exp}
              selected={selected === slot}
              ghost={dragging === slot}
              testId={`unit-${unit.iid}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
