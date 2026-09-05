import { type ReactNode, useState } from 'react'
import { hasSavedRun, useRunStore } from '../store/runStore'
import { useUiStore } from '../store/uiStore'

export function MenuScreen(): ReactNode {
  // `Date` is allowed in app code; it is banned only in sim and content.
  const [seed, setSeed] = useState(() => String(Date.now() % 100000))
  const startRun = useRunStore((s) => s.startRun)
  const continueRun = useRunStore((s) => s.continueRun)
  const setScreen = useUiStore((s) => s.setScreen)
  const [saved] = useState(hasSavedRun)

  const start = (): void => {
    startRun(Number(seed) || 0)
    setScreen('shop')
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeContent: 'center',
        gap: 24,
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 72, margin: 0, letterSpacing: 2 }}>Super Auto Men</h1>
      <p style={{ color: 'var(--muted)', margin: 0 }}>Win 10 battles before you lose 5 lives.</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
        <label htmlFor="seed">Seed</label>
        <input
          id="seed"
          data-testid="seed-input"
          value={seed}
          inputMode="numeric"
          onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))}
          style={{
            font: 'inherit',
            padding: 10,
            width: 160,
            borderRadius: 10,
            border: '1px solid var(--line)',
            background: 'var(--panel)',
            color: 'inherit',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        <button data-testid="new-run" onClick={start} style={{ fontSize: 24, padding: '14px 40px' }}>
          New run
        </button>
        {saved && (
          <button
            data-testid="continue-run"
            onClick={() => {
              if (continueRun()) setScreen('shop')
            }}
            style={{ fontSize: 24, padding: '14px 40px', borderColor: 'var(--accent)', background: '#6c8cff33' }}
          >
            Continue run
          </button>
        )}
      </div>
    </div>
  )
}
