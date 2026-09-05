import { describe, expect, it } from 'vitest'
import { SIM_VERSION } from '../src/index'

describe('sim smoke', () => {
  it('imports', () => {
    expect(SIM_VERSION).toBe('0.0.0')
  })
})
