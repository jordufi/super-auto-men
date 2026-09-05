import { type PointerEvent, type ReactNode, useCallback, useState } from 'react'
import type { ShopAction } from '@sam/sim'
import { ROLL_COST } from '@sam/sim'
import { useRunStore } from '../store/runStore'
import { useUiStore } from '../store/uiStore'
import { resolveTap } from '../store/interaction'
import { type DragSource, useDrag } from '../dnd/useDrag'
import type { DropZone } from '../dnd/hitTest'
import { DragLayer } from '../dnd/DragLayer'
import { TopBar } from '../components/TopBar'
import { TeamBoard } from '../components/TeamBoard'
import { ShopRow } from '../components/ShopRow'
import { ActionBar } from '../components/ActionBar'
import { EventLog } from '../components/EventLog'
import { BattleResult } from '../components/BattleResult'

export function ShopScreen(): ReactNode {
  const state = useRunStore((s) => s.state)
  const dispatch = useRunStore((s) => s.dispatch)
  const endTurn = useRunStore((s) => s.endTurn)
  const selected = useUiStore((s) => s.selected)
  const select = useUiStore((s) => s.select)
  const drag = useUiStore((s) => s.drag)
  const [showResult, setShowResult] = useState(false)

  const onTap = useCallback(
    (source: DragSource) => {
      const s = useRunStore.getState().state
      if (!s) return
      const tap =
        source.kind === 'shop'
          ? ({ kind: 'shop', index: source.index } as const)
          : ({ kind: 'team', slot: source.index } as const)
      const r = resolveTap(useUiStore.getState().selected, tap, s.shop, s.team)
      if (r.action) dispatch(r.action)
      select(r.selection)
    },
    [dispatch, select],
  )

  const onDrop = useCallback(
    (source: DragSource, zone: DropZone) => {
      const s = useRunStore.getState().state
      if (!s) return
      select(null)
      let action: ShopAction | null = null
      if (zone.kind === 'sell') {
        if (source.kind === 'team') action = { t: 'sell', slot: source.index }
      } else if (source.kind === 'team') {
        action = { t: 'reorder', from: source.index, to: zone.index }
      } else {
        const item = s.shop[source.index]
        if (item) {
          action =
            item.kind === 'unit'
              ? { t: 'buyUnit', shopIndex: source.index, slot: zone.index }
              : { t: 'buyFood', shopIndex: source.index, target: zone.index }
        }
      }
      if (action) dispatch(action)
    },
    [dispatch, select],
  )

  const startDrag = useDrag({ onTap, onDrop })
  const teamPointerDown = (slot: number, e: PointerEvent<HTMLElement>): void =>
    startDrag({ kind: 'team', index: slot }, e)
  const shopPointerDown = (index: number, e: PointerEvent<HTMLElement>): void =>
    startDrag({ kind: 'shop', index }, e)

  if (!state) return null

  const onEndTurn = (): void => {
    select(null)
    endTurn()
    setShowResult(true)
  }

  return (
    <>
      <TopBar turn={state.turn} lives={state.lives} trophies={state.trophies} gold={state.gold} />

      <div style={{ position: 'absolute', top: 100, left: 0, right: 0 }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 6, fontSize: 14 }}>
          Your team &mdash; front on the right
        </div>
        <TeamBoard
          team={state.team}
          selected={selected?.kind === 'team' ? selected.slot : null}
          dropTarget={drag && drag.overKind === 'team' ? drag.over : null}
          dragging={drag?.kind === 'team' ? drag.from : null}
          onSlotPointerDown={teamPointerDown}
        />
      </div>

      <div style={{ position: 'absolute', top: 360, left: 0, right: 0 }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 6, fontSize: 14 }}>
          Shop
        </div>
        <ShopRow
          shop={state.shop}
          selected={selected?.kind === 'shop' ? selected.index : null}
          dragging={drag?.kind === 'shop' ? drag.from : null}
          onSlotPointerDown={shopPointerDown}
        />
      </div>

      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0 }}>
        <ActionBar
          canRoll={state.gold >= ROLL_COST}
          canSell={selected?.kind === 'team'}
          canFreeze={selected?.kind === 'shop'}
          sellDropTarget={drag?.overKind === 'sell'}
          onRoll={() => dispatch({ t: 'roll' })}
          onSell={() => {
            if (selected?.kind === 'team') dispatch({ t: 'sell', slot: selected.slot })
            select(null)
          }}
          onFreeze={() => {
            if (selected?.kind === 'shop') dispatch({ t: 'freeze', shopIndex: selected.index })
          }}
          onEndTurn={onEndTurn}
        />
      </div>

      <EventLog />
      <DragLayer team={state.team} shop={state.shop} />
      {showResult && <BattleResult onContinue={() => setShowResult(false)} />}
    </>
  )
}
