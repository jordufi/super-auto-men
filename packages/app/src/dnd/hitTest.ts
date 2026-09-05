// Pure geometry for drag and drop (ARCHITECTURE.md §6.3, PLAN.md Phase 9).
// Everything here works in the stage's logical 1280x720 coordinates.

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type ZoneKind = 'team' | 'sell'

export interface DropZone {
  kind: ZoneKind
  index: number
  rect: Rect
}

export interface Point {
  x: number
  y: number
}

/** Client (viewport) pixels -> stage logical pixels. `origin` is the stage's client rect corner. */
export function toStage(client: Point, origin: Point, scale: number): Point {
  return { x: (client.x - origin.x) / scale, y: (client.y - origin.y) / scale }
}

export function contains(rect: Rect, p: Point): boolean {
  return p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h
}

/** The first zone containing the pointer, or null. Zones are expected not to overlap. */
export function hitTest(p: Point, zones: readonly DropZone[]): DropZone | null {
  return zones.find((z) => contains(z.rect, p)) ?? null
}

/** Reads the drop zones out of the DOM once, at drag start. */
export function collectZones(root: ParentNode, origin: Point, scale: number): DropZone[] {
  const out: DropZone[] = []
  for (const el of root.querySelectorAll<HTMLElement>('[data-drop-kind]')) {
    const kind = el.dataset['dropKind'] as ZoneKind
    const index = Number(el.dataset['dropIndex'] ?? -1)
    const r = el.getBoundingClientRect()
    const tl = toStage({ x: r.left, y: r.top }, origin, scale)
    out.push({ kind, index, rect: { x: tl.x, y: tl.y, w: r.width / scale, h: r.height / scale } })
  }
  return out
}
