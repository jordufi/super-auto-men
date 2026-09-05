import { describe, expect, it } from 'vitest'
import { type DropZone, contains, hitTest, toStage } from '../src/dnd/hitTest'

const zones: DropZone[] = [
  { kind: 'team', index: 0, rect: { x: 0, y: 0, w: 100, h: 100 } },
  { kind: 'team', index: 1, rect: { x: 120, y: 0, w: 100, h: 100 } },
  { kind: 'sell', index: 0, rect: { x: 0, y: 200, w: 80, h: 40 } },
]

describe('toStage', () => {
  it('converts client pixels to logical pixels at scale 1', () => {
    expect(toStage({ x: 130, y: 60 }, { x: 30, y: 10 }, 1)).toEqual({ x: 100, y: 50 })
  })

  it('divides by the stage scale', () => {
    expect(toStage({ x: 330, y: 210 }, { x: 30, y: 10 }, 0.5)).toEqual({ x: 600, y: 400 })
    expect(toStage({ x: 30, y: 10 }, { x: 30, y: 10 }, 2)).toEqual({ x: 0, y: 0 })
  })
})

describe('hitTest', () => {
  it('finds the zone under the pointer, edges included', () => {
    expect(hitTest({ x: 50, y: 50 }, zones)).toMatchObject({ kind: 'team', index: 0 })
    expect(hitTest({ x: 150, y: 10 }, zones)).toMatchObject({ kind: 'team', index: 1 })
    expect(hitTest({ x: 100, y: 100 }, zones)).toMatchObject({ index: 0 })
    expect(hitTest({ x: 10, y: 220 }, zones)).toMatchObject({ kind: 'sell' })
  })

  it('returns null in the gaps and outside', () => {
    expect(hitTest({ x: 110, y: 50 }, zones)).toBeNull()
    expect(hitTest({ x: 999, y: 999 }, zones)).toBeNull()
  })

  it('contains is inclusive on both edges', () => {
    const r = { x: 10, y: 10, w: 10, h: 10 }
    expect(contains(r, { x: 10, y: 10 })).toBe(true)
    expect(contains(r, { x: 20, y: 20 })).toBe(true)
    expect(contains(r, { x: 20.1, y: 15 })).toBe(false)
  })
})
