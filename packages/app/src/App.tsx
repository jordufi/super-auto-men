import type { ReactNode } from 'react'
import { Stage } from './components/Stage'
import { MenuScreen } from './screens/MenuScreen'
import { ShopScreen } from './screens/ShopScreen'
import { RunEndScreen } from './screens/RunEndScreen'
import { useUiStore } from './store/uiStore'

export function App(): ReactNode {
  const screen = useUiStore((s) => s.screen)
  return (
    <Stage>
      {screen === 'menu' && <MenuScreen />}
      {(screen === 'shop' || screen === 'battle') && <ShopScreen />}
      {screen === 'runEnd' && <RunEndScreen />}
    </Stage>
  )
}
