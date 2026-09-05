import { describe, expect, it } from 'vitest'
import { parseParams, paramsEnabled } from '../src/store/urlParams'

describe('parseParams', () => {
  it('reads seed, screen, speed and offline', () => {
    expect(parseParams('?seed=42&screen=shop&speed=2&offline=1')).toEqual({
      seed: 42,
      screen: 'shop',
      speed: 2,
      offline: true,
    })
  })

  it('ignores unknown or malformed values', () => {
    expect(parseParams('?seed=abc&screen=nope&speed=9&offline=0')).toEqual({})
    expect(parseParams('')).toEqual({})
  })

  it('accepts speed=instant', () => {
    expect(parseParams('?speed=instant').speed).toBe('instant')
  })
})

describe('paramsEnabled', () => {
  it('is on in dev, on with the env flag, off otherwise', () => {
    expect(paramsEnabled({ DEV: true })).toBe(true)
    expect(paramsEnabled({ DEV: false, VITE_ALLOW_URL_PARAMS: '1' })).toBe(true)
    expect(paramsEnabled({ DEV: false })).toBe(false)
  })
})
