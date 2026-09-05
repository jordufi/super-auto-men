import { describe, expect, it } from 'vitest'
import { MAX_EXP, expForLevel, levelFromExp } from '../src/level'

describe('levelFromExp', () => {
  it.each([
    [0, 1],
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 3],
  ])('exp %i -> level %i', (exp, level) => {
    expect(levelFromExp(exp)).toBe(level)
  })

  it('MAX_EXP is 5 and yields level 3', () => {
    expect(MAX_EXP).toBe(5)
    expect(levelFromExp(MAX_EXP)).toBe(3)
  })
})

describe('expForLevel', () => {
  it('is the minimum exp for each level', () => {
    expect(expForLevel(1)).toBe(0)
    expect(expForLevel(2)).toBe(2)
    expect(expForLevel(3)).toBe(5)
    for (const l of [1, 2, 3] as const) expect(levelFromExp(expForLevel(l))).toBe(l)
  })
})
