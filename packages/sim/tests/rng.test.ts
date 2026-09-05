import { describe, expect, it } from 'vitest'
import { makeRng } from '../src/rng'

describe('makeRng (mulberry32)', () => {
  it('same seed yields identical sequences', () => {
    const a = makeRng(123)
    const b = makeRng(123)
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next())
  })

  it('different seeds yield different first values', () => {
    expect(makeRng(1).next()).not.toBe(makeRng(2).next())
  })

  it('pins the algorithm: first 5 values for seed 42', () => {
    const r = makeRng(42)
    expect([r.next(), r.next(), r.next(), r.next(), r.next()]).toEqual([
      0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693,
      0.17481389874592423,
    ])
  })

  it('next() is always in [0, 1)', () => {
    const r = makeRng(7)
    for (let i = 0; i < 10_000; i++) {
      const v = r.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('int(n) is always an integer in [0, n)', () => {
    const r = makeRng(99)
    for (let i = 0; i < 10_000; i++) {
      const v = r.int(6)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(6)
    }
  })

  it('pick returns an element and throws on empty', () => {
    const r = makeRng(5)
    const xs = ['a', 'b', 'c'] as const
    for (let i = 0; i < 100; i++) expect(xs).toContain(r.pick(xs))
    expect(() => r.pick([])).toThrow(/empty/)
  })

  it('shuffle returns a permutation and does not mutate the input', () => {
    const r = makeRng(11)
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const before = [...input]
    const out = r.shuffle(input)
    expect(input).toEqual(before)
    expect(out).not.toBe(input)
    expect([...out].sort((x, y) => x - y)).toEqual(before)
  })

  it('shuffle is deterministic per seed', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(makeRng(3).shuffle(xs)).toEqual(makeRng(3).shuffle(xs))
  })

  it('handles seed 0 and large seeds', () => {
    expect(() => makeRng(0).next()).not.toThrow()
    expect(() => makeRng(2 ** 31 - 1).next()).not.toThrow()
    expect(makeRng(0).next()).not.toBe(makeRng(1).next())
  })
})
