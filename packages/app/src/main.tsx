import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { useRunStore } from './store/runStore'
import { useUiStore } from './store/uiStore'
import { parseParams, paramsEnabled } from './store/urlParams'
import './styles/global.css'
import './styles/theme.css'

if (paramsEnabled(import.meta.env)) {
  const p = parseParams(window.location.search)
  if (p.speed !== undefined) useUiStore.getState().setSpeed(p.speed)
  if (p.seed !== undefined) {
    const run = useRunStore.getState()
    run.startRun(p.seed)
    if (p.screen === 'battle') {
      // Boot straight into a battle: buy something so the fight is not empty, then end the turn.
      run.dispatch({ t: 'buyUnit', shopIndex: 0, slot: 0 })
      run.endTurn()
    }
    useUiStore.getState().setScreen(p.screen ?? 'shop')
  } else if (p.screen !== undefined) {
    useUiStore.getState().setScreen(p.screen)
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
