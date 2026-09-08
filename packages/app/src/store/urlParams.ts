// Dev/E2E entry points: /?seed=42&screen=shop&speed=2 boots straight into a deterministic run.
// Never enabled in a plain production build (ARCHITECTURE.md §12, PLAN.md Phase 7).
export type Screen = 'menu' | 'shop' | 'battle' | 'runEnd'
/** 'manual' advances only when the player taps Next; it is the default (uiStore). */
export type Speed = 'manual' | 1 | 2 | 'instant'

export interface UrlParams {
  seed?: number
  screen?: Screen
  speed?: Speed
  offline?: boolean
}

const SCREENS: Screen[] = ['menu', 'shop', 'battle', 'runEnd']

export function paramsEnabled(env: { DEV?: boolean; VITE_ALLOW_URL_PARAMS?: string }): boolean {
  return env.DEV === true || env.VITE_ALLOW_URL_PARAMS === '1'
}

export function parseParams(search: string): UrlParams {
  const q = new URLSearchParams(search)
  const out: UrlParams = {}

  const seed = q.get('seed')
  if (seed !== null && /^\d+$/.test(seed)) out.seed = Number(seed)

  const screen = q.get('screen')
  if (screen !== null && (SCREENS as string[]).includes(screen)) out.screen = screen as Screen

  const speed = q.get('speed')
  if (speed === '1' || speed === '2') out.speed = Number(speed) as 1 | 2
  else if (speed === 'instant' || speed === 'manual') out.speed = speed

  if (q.get('offline') === '1') out.offline = true
  return out
}
