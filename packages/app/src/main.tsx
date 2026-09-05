import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { useRunStore } from './store/runStore'
import { useUiStore } from './store/uiStore'
import { parseParams, paramsEnabled } from './store/urlParams'
import './styles/global.css'

if (paramsEnabled(import.meta.env)) {
  const p = parseParams(window.location.search)
  if (p.speed !== undefined) useUiStore.getState().setSpeed(p.speed)
  if (p.seed !== undefined) {
    useRunStore.getState().startRun(p.seed)
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
