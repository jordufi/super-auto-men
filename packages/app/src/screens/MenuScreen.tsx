import { type ReactNode, useState } from 'react'
import { hasSavedRun, useRunStore } from '../store/runStore'
import { useUiStore } from '../store/uiStore'
import { Scenery } from '../components/Scenery'

export function MenuScreen(): ReactNode {
  // `Date` is allowed in app code; it is banned only in sim and content.
  const [seed, setSeed] = useState(() => String(Date.now() % 100000))
  const startRun = useRunStore((s) => s.startRun)
  const continueRun = useRunStore((s) => s.continueRun)
  const loadError = useRunStore((s) => s.loadError)
  const setScreen = useUiStore((s) => s.setScreen)
  const [saved, setSaved] = useState(hasSavedRun)

  const start = (): void => {
    startRun(Number(seed) || 0)
    setScreen('shop')
  }

  return (
    <>
      <Scenery />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          alignContent: 'center',
          justifyContent: 'center',
          gap: 24,
          textAlign: 'center',
        }}
      >
        <h1 className="outlined" style={{ fontSize: 84, margin: 0, letterSpacing: 2 }}>
          Super Auto Men
        </h1>
        <p className="banner" style={{ justifySelf: 'center', margin: 0 }}>
          Win 10 battles before you lose 5 lives.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
          <label className="outlined" htmlFor="seed" style={{ fontSize: 22 }}>
            Seed
          </label>
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
              border: '3px solid var(--ink)',
              background: '#fff',
              color: 'var(--ink)',
              fontWeight: 700,
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="big-btn" data-testid="new-run" onClick={start}>
            New run
          </button>
          {saved && (
            <button
              data-testid="continue-run"
              onClick={() => {
                if (continueRun()) setScreen('shop')
                else setSaved(false) // the save was dropped; stop offering it
              }}
              className="big-btn dim"
            >
              Continue run
            </button>
          )}
        </div>
        {loadError && (
          <p
            data-testid="load-error"
            className="banner"
            style={{ justifySelf: 'center', margin: 0, color: '#c02418' }}
          >
            Your saved run could not be loaded &mdash; {loadError}.
          </p>
        )}
      </div>
    </>
  )
}
