import { describe, expect, it } from 'vitest'
import { MAX_W, MIN_W, STAGE_H, stageLayout } from '../src/components/Stage'

/**
 * The stage height is fixed and the width adapts, so a device whose aspect ratio falls inside
 * [MIN_W, MAX_W] / STAGE_H fills its screen exactly. Outside that range we letterbox rather than
 * let the board stretch past what the rows can use.
 */
describe('stageLayout', () => {
  it('gives a 16:9 viewport the 1280x720 design canvas at 1:1', () => {
    const { width, scale } = stageLayout(1280, 720)
    expect(width).toBe(1280)
    expect(scale).toBeCloseTo(1)
  })

  it.each([
    ['ultra-wide Android', 2400, 1080],
    ['iPhone landscape', 1792, 828],
    ['16:9 laptop', 1920, 1080],
  ])('fills the screen exactly on %s', (_name, vw, vh) => {
    const { width, scale } = stageLayout(vw, vh)
    expect(width).toBeGreaterThanOrEqual(MIN_W)
    expect(width).toBeLessThanOrEqual(MAX_W)
    // Both axes land on the viewport: no bars in either direction.
    expect(width * scale).toBeCloseTo(vw, 0)
    expect(STAGE_H * scale).toBeCloseTo(vh, 0)
  })

  it('clamps a 4:3 tablet to MIN_W and letterboxes the leftover height', () => {
    const { width, scale } = stageLayout(1024, 768)
    expect(width).toBe(MIN_W)
    expect(width * scale).toBeLessThanOrEqual(1024)
    expect(STAGE_H * scale).toBeLessThanOrEqual(768)
  })

  it('clamps an absurdly wide viewport to MAX_W', () => {
    const { width, scale } = stageLayout(3000, 800)
    expect(width).toBe(MAX_W)
    expect(width * scale).toBeLessThanOrEqual(3000)
    expect(STAGE_H * scale).toBeLessThanOrEqual(800)
  })

  it('never returns a scale that overflows the viewport', () => {
    for (const [vw, vh] of [
      [320, 240],
      [2560, 1080],
      [1440, 900],
      [800, 1280],
    ] as const) {
      const { width, scale } = stageLayout(vw, vh)
      expect(width * scale).toBeLessThanOrEqual(vw + 0.5)
      expect(STAGE_H * scale).toBeLessThanOrEqual(vh + 0.5)
    }
  })
})
