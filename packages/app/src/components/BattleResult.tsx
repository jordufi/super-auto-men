// Temporary text-only battle outcome. Phase 10 replaces it with the animated battle screen.
import type { ReactNode } from 'react'
import { useRunStore } from '../store/runStore'
import { useUiStore } from '../store/uiStore'

export function BattleResult({ onContinue }: { onContinue: () => void }): ReactNode {
  const log = useRunStore((s) => s.lastBattle)
  const state = useRunStore((s) => s.state)
  const setScreen = useUiStore((s) => s.setScreen)
  if (!log || !state) return null

  const text = log.result === 'a' ? 'You won' : log.result === 'b' ? 'You lost' : 'Draw'
  const over = state.phase === 'won' || state.phase === 'lost'

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeContent: 'center',
        gap: 20,
        textAlign: 'center',
        background: '#0d0d16e6',
        zIndex: 40,
      }}
    >
      <div data-testid="battle-result" style={{ fontSize: 44, fontWeight: 800 }}>
        {text} &middot; Trophies {state.trophies} &middot; Lives {state.lives}
      </div>
      <button
        data-testid="continue"
        style={{ justifySelf: 'center', fontSize: 22, padding: '12px 36px' }}
        onClick={() => {
          onContinue()
          if (over) setScreen('runEnd')
        }}
      >
        Continue
      </button>
    </div>
  )
}
