import type { ReactNode } from 'react'
import { useRunStore } from '../store/runStore'
import { useUiStore } from '../store/uiStore'

export function RunEndScreen(): ReactNode {
  const state = useRunStore((s) => s.state)
  const reset = useRunStore((s) => s.reset)
  const setScreen = useUiStore((s) => s.setScreen)
  const won = state?.phase === 'won'

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
      <div data-testid="run-end" style={{ fontSize: 64, fontWeight: 800 }}>
        {won ? 'You win!' : 'Run over'}
      </div>
      <div style={{ color: 'var(--muted)' }}>
        {state ? `${state.trophies} trophies · ${state.lives} lives · turn ${state.turn}` : null}
      </div>
      <button
        data-testid="back-to-menu"
        style={{ justifySelf: 'center', fontSize: 22, padding: '12px 36px' }}
        onClick={() => {
          reset()
          setScreen('menu')
        }}
      >
        Back to menu
      </button>
    </div>
  )
}
