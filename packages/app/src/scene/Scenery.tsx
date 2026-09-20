// The painted backdrop, mounted once above the screen switch so changing screen crossfades it
// instead of remounting it. Strictly decoration: it never takes a pointer event.
import type { ReactNode } from 'react'
import { useUiStore } from '../store/uiStore'
import { FOREGROUND, SCENES, SCENE_IDS, sceneFor } from './layers'

export function Scenery(): ReactNode {
  const scene = sceneFor(useUiStore((s) => s.screen))
  return (
    <div className="scenery" data-testid="scenery" data-scene={scene} aria-hidden="true">
      {SCENE_IDS.map((id) => (
        <img
          key={id}
          className="scene-img"
          data-active={id === scene}
          src={SCENES[id]}
          alt=""
          draggable={false}
        />
      ))}
      <div className="scene-glow" />
      <img className="scene-fg" src={FOREGROUND} alt="" draggable={false} />
      <div className="scene-vignette" />
    </div>
  )
}
