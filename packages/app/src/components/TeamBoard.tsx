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
            position: 'relative',
            width: 140,
            height: 160,
            display: 'grid',
            placeItems: 'center',
            touchAction: 'none',
          }}
        >
          {/* The stone slab is the slot: an empty one is just the bare slab. */}
          <div
            className="slab"
            style={
              dropTarget === slot ? { background: '#ffe89a', borderColor: '#e0a92c' } : undefined
            }
          />
          {unit && (
            <UnitCard
              kind="unit"
              defId={unit.defId}
              atk={unit.atk + unit.tmpAtk}
              hp={unit.hp + unit.tmpHp}
              level={unit.level}
              exp={unit.exp}
              statuses={unit.statuses}
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
