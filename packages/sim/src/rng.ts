// Seeded PRNG (ARCHITECTURE.md §4.2, P2). Threaded explicitly; never a module-level singleton.

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number
  /** Uniform element. Throws on an empty array. */
  pick<T>(xs: readonly T[]): T
  /** Fisher–Yates on a copy. Does not mutate the input. */
  shuffle<T>(xs: readonly T[]): T[]
}

/** mulberry32 — small, fast, good enough, and identical across platforms. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0

  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    int: (maxExclusive) => Math.floor(next() * maxExclusive),
    pick: (xs) => {
      if (xs.length === 0) throw new Error('rng.pick: cannot pick from an empty array')
      return xs[Math.floor(next() * xs.length)]!
    },
    shuffle: (xs) => {
      const out = [...xs]
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        const tmp = out[i]!
        out[i] = out[j]!
        out[j] = tmp
      }
      return out
    },
  }
}
