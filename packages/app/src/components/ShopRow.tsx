import type { PointerEvent, ReactNode } from 'react'
import type { ShopSlot } from '@sam/sim'
import { FOOD_COST, UNIT_COST } from '@sam/sim'
import { CONTENT } from '@sam/content'
import { UnitCard } from './UnitCard'
import { UnitGround } from './UnitGround'

export interface ShopRowProps {
  shop: readonly ShopSlot[]
  selected: number | null
  dragging: number | null
  /** Drives the "can I afford this" styling on the price coins. */
  gold: number
  onSlotPointerDown: (index: number, e: PointerEvent<HTMLElement>) => void
}

const costOf = (item: ShopSlot): number => (item.kind === 'unit' ? UNIT_COST : FOOD_COST)

export function ShopRow({
  shop,
  selected,
  dragging,
  gold,
  onSlotPointerDown,
}: ShopRowProps): ReactNode {
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
      {shop.map((item, i) => {
        const def = item.kind === 'unit' ? CONTENT.getUnit(item.defId) : null
        const cost = costOf(item)
        const affordable = gold >= cost
        return (
          <div
            key={`${i}-${item.kind}-${item.defId}`}
            data-testid={`shop-slot-${i}`}
            onPointerDown={(e) => onSlotPointerDown(i, e)}
            style={{
              position: 'relative',
              width: 140,
              height: 160,
              display: 'grid',
              placeItems: 'center',
              touchAction: 'none',
            }}
          >
            <UnitGround slab={item.frozen ? 'frozen' : 'rest'} />
            {/* A coin in the corner: the price is the one thing a shop slot must always show. */}
            <div
              data-testid={`price-${i}`}
              data-cost={cost}
              data-affordable={affordable ? 'true' : 'false'}
              title={`${cost} gold`}
              className="stat-badge coin"
              style={{ position: 'absolute', top: 0, right: 4, zIndex: 'var(--z-coin)' }}
            >
              {cost}
            </div>
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
