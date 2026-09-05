import type { PointerEvent, ReactNode } from 'react'
import type { ShopSlot } from '@sam/sim'
import { CONTENT } from '@sam/content'
import { UnitCard } from './UnitCard'

export interface ShopRowProps {
  shop: readonly ShopSlot[]
  selected: number | null
  dragging: number | null
  onSlotPointerDown: (index: number, e: PointerEvent<HTMLElement>) => void
}

export function ShopRow({ shop, selected, dragging, onSlotPointerDown }: ShopRowProps): ReactNode {
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
      {shop.map((item, i) => {
        const def = item.kind === 'unit' ? CONTENT.getUnit(item.defId) : null
        return (
          <div
            key={`${i}-${item.kind}-${item.defId}`}
            data-testid={`shop-slot-${i}`}
            onPointerDown={(e) => onSlotPointerDown(i, e)}
            style={{
              width: 140,
              height: 160,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 14,
              border: `2px solid ${item.frozen ? '#7fd7ff' : 'transparent'}`,
              background: '#ffffff08',
              touchAction: 'none',
            }}
          >
            <UnitCard
              kind={item.kind}
              defId={item.defId}
              {...(def ? { atk: item.atk ?? def.base.atk, hp: item.hp ?? def.base.hp } : {})}
              frozen={item.frozen}
              selected={selected === i}
              ghost={dragging === i}
              testId={`shop-card-${i}`}
            />
          </div>
        )
      })}
    </div>
  )
}
