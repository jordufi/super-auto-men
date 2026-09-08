// Pointer-capture drag (ARCHITECTURE.md §6.3). One gesture handles both taps and drags:
// a press that moves less than DRAG_THRESHOLD logical pixels is reported as a tap, so the
// click-based interaction from Phase 8 keeps working unchanged.
import { type PointerEvent as ReactPointerEvent, useCallback, useRef } from 'react'
import { useUiStore } from '../store/uiStore'
import { STAGE_H, STAGE_W } from '../components/Stage'
import { type DropZone, collectZones, hitTest, toStage } from './hitTest'

/**
 * Touch slop, in logical px. A finger resting on the screen drifts several pixels, so this has to
 * be well above zero or every press-and-hold is mistaken for a drag.
 */
export const DRAG_THRESHOLD = 12

export type DragSource = { kind: 'shop' | 'team'; index: number }

export interface DragHandlers {
  onTap: (source: DragSource) => void
  onDrop: (source: DragSource, zone: DropZone) => void
}

interface Session {
  source: DragSource
  startX: number
  startY: number
  moved: boolean
  zones: DropZone[]
  origin: { x: number; y: number }
  scale: number
}

export function useDrag({
  onTap,
  onDrop,
}: DragHandlers): (source: DragSource, e: ReactPointerEvent<HTMLElement>) => void {
  const session = useRef<Session | null>(null)
  const setDrag = useUiStore((s) => s.setDrag)

  return useCallback(
    (source, e) => {
      const stage = (e.currentTarget as HTMLElement).closest<HTMLElement>('.stage')
      if (!stage) return
      const rect = stage.getBoundingClientRect()
      // The stage width is per-device (Stage.tsx), so read the live value rather than assume 1280.
      const logicalWidth = Number(stage.dataset['logicalWidth']) || STAGE_W
      const scale = rect.width / logicalWidth || 1
      const origin = { x: rect.left, y: rect.top }
      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)

      const p = toStage({ x: e.clientX, y: e.clientY }, origin, scale)
      const s: Session = {
        source,
        startX: p.x,
        startY: p.y,
        moved: false,
        zones: [],
        origin,
        scale,
      }
      session.current = s

      const move = (ev: PointerEvent): void => {
        const q = toStage({ x: ev.clientX, y: ev.clientY }, origin, scale)
        if (!s.moved && Math.hypot(q.x - s.startX, q.y - s.startY) < DRAG_THRESHOLD) return
        if (!s.moved) {
          s.moved = true
          s.zones = collectZones(stage, origin, scale)
        }
        const zone = hitTest(q, s.zones)
        setDrag({
          kind: source.kind,
          from: source.index,
          x: Math.max(0, Math.min(logicalWidth, q.x)),
          y: Math.max(0, Math.min(STAGE_H, q.y)),
          over: zone ? zone.index : null,
          overKind: zone ? zone.kind : null,
        })
      }

      const up = (ev: PointerEvent): void => {
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerup', up)
        el.removeEventListener('pointercancel', cancel)
        session.current = null
        setDrag(null)
        if (!s.moved) {
          onTap(source)
          return
        }
        const q = toStage({ x: ev.clientX, y: ev.clientY }, origin, scale)
        const zone = hitTest(q, s.zones)
        if (zone) onDrop(source, zone) // a drop outside every zone cancels
      }

      const cancel = (): void => {
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerup', up)
        el.removeEventListener('pointercancel', cancel)
        session.current = null
        setDrag(null)
      }

      el.addEventListener('pointermove', move)
      el.addEventListener('pointerup', up)
      el.addEventListener('pointercancel', cancel)
    },
    [onTap, onDrop, setDrag],
  )
}
