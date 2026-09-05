// The floating copy of the card being dragged. Positioned with `transform` only.
import type { ReactNode } from 'react'
import type { ShopSlot, Slots } from '@sam/sim'
import { CONTENT } from '@sam/content'
import { UnitCard } from '../components/UnitCard'
import { useUiStore } from '../store/uiStore'

export function DragLayer({ team, shop }: { team: Slots; shop: readonly ShopSlot[] }): ReactNode {
  const drag = useUiStore((s) => s.drag)
  if (!drag) return null

  let card: ReactNode = null
  if (drag.kind === 'team') {
    const u = team[drag.from]
    if (u)
      card = (
        <UnitCard
          kind="unit"
          defId={u.defId}
          atk={u.atk + u.tmpAtk}
          hp={u.hp + u.tmpHp}
          level={u.level}
          exp={u.exp}
        />
      )
  } else {
    const item = shop[drag.from]
    if (item) {
      const def = item.kind === 'unit' ? CONTENT.getUnit(item.defId) : null
      const stats = def ? { atk: item.atk ?? def.base.atk, hp: item.hp ?? def.base.hp } : {}
      card = <UnitCard kind={item.kind} defId={item.defId} {...stats} />
    }
  }
  if (!card) return null

  return (
    <div
      data-testid="drag-layer"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate(${drag.x - 65}px, ${drag.y - 75}px) scale(1.1)`,
        pointerEvents: 'none',
        zIndex: 50,
        filter: 'drop-shadow(0 8px 12px #0008)',
      }}
    >
      {card}
    </div>
  )
}
