import type { ReactNode } from 'react'
import { useRunStore } from '../store/runStore'
import { useUiStore } from '../store/uiStore'

export function RunEndScreen(): ReactNode {
  const state = useRunStore((s) => s.state)
  const reset = useRunStore((s) => s.reset)
  const setScreen = useUiStore((s) => s.setScreen)
  const won = state?.phase === 'won'

  return (
    <>
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
        <div data-testid="run-end" className="outlined" style={{ fontSize: 72 }}>
          {won ? 'You win!' : 'Run over'}
        </div>
        <div className="ribbon parchment" style={{ justifySelf: 'center', fontSize: 28 }}>
          {state ? `${state.trophies} trophies · ${state.lives} lives · turn ${state.turn}` : null}
        </div>
        <button
          data-testid="back-to-menu"
          className="big-btn"
          style={{ justifySelf: 'center' }}
          onClick={() => {
            reset()
            setScreen('menu')
          }}
        >
          Back to menu
        </button>
      </div>
    </>
  )
}
