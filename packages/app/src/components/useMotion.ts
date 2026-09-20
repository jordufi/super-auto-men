// Whether ambient and decorative motion should run. Forced by ?motion=reduced (Android WebView's
// own reduced-motion reporting is inconsistent, so tests cannot lean on it), otherwise the OS
// setting. It only picks a CSS path via data-motion: the battle clock in replay/ never reads it.
import { useEffect, useState } from 'react'
import { useUiStore } from '../store/uiStore'

const QUERY = '(prefers-reduced-motion: reduce)'

export function useMotion(): 'full' | 'reduced' {
  const forced = useUiStore((s) => s.motion) === 'reduced'
  const [system, setSystem] = useState(() => window.matchMedia?.(QUERY).matches === true)
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY)
    if (!mq) return
    const on = (): void => setSystem(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return forced || system ? 'reduced' : 'full'
}
