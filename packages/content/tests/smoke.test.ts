import { describe, expect, it } from 'vitest'
import { CONTENT_VERSION } from '../src/index'

describe('content smoke', () => {
  it('imports', () => {
    expect(CONTENT_VERSION).toBe('0.0.0')
  })
})
