// Which painted backdrop each screen shows. Source art and its conversion live in art/.
import type { Screen } from '../store/urlParams'
import menu from '../assets/scene/menu.webp'
import shop from '../assets/scene/shop.webp'
import battle from '../assets/scene/battle.webp'
import foreground from '../assets/scene/foreground.webp'

export type SceneId = 'menu' | 'shop' | 'battle'

/** Painted 2.5:1, the widest stage we render, then centre-cropped to whatever width a device gets. */
export const SCENES: Record<SceneId, string> = { menu, shop, battle }

/** Dark framing foliage, transparent in the middle. Drawn over the scene, under all gameplay. */
export const FOREGROUND = foreground

const SCENE_OF: Record<Screen, SceneId> = {
  menu: 'menu',
  shop: 'shop',
  battle: 'battle',
  runEnd: 'menu',
}

export const sceneFor = (screen: Screen): SceneId => SCENE_OF[screen]

export const SCENE_IDS = Object.keys(SCENES) as SceneId[]
