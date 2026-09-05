import type { ReactNode } from 'react'
import { Stage } from './components/Stage'
import { MenuScreen } from './screens/MenuScreen'
import { ShopScreen } from './screens/ShopScreen'
import { BattleScreen } from './screens/BattleScreen'
import { RunEndScreen } from './screens/RunEndScreen'
import { useUiStore } from './store/uiStore'

export function App(): ReactNode {
  const screen = useUiStore((s) => s.screen)
  return (
    <Stage>
      {screen === 'menu' && <MenuScreen />}
      {screen === 'shop' && <ShopScreen />}
      {screen === 'battle' && <BattleScreen />}
      {screen === 'runEnd' && <RunEndScreen />}
    </Stage>
  )
}
