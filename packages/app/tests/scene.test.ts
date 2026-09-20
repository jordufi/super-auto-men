import { describe, expect, it } from 'vitest'
import { BATTLE_TOP, LANE } from '../src/scene/lanes'
import { FOREGROUND, SCENES, SCENE_IDS, sceneFor } from '../src/scene/layers'
import type { Screen } from '../src/store/urlParams'

describe('lanes', () => {
  // The painted backdrops are composed against these numbers. Moving one puts a row of units
  // off its patch of ground, so a change here has to be a deliberate art decision.
  it('keeps the rows where the backdrops expect them', () => {
    expect(LANE).toEqual({ team: 275, shop: 465, height: 160 })
    expect(BATTLE_TOP).toBe(440)
  })
})

describe('scene manifest', () => {
  it('gives every screen a backdrop that has an image', () => {
    const screens: Screen[] = ['menu', 'shop', 'battle', 'runEnd']
    for (const screen of screens) expect(SCENES[sceneFor(screen)]).toBeTruthy()
  })

  it('has an image for every scene and for the foreground', () => {
    expect(SCENE_IDS.sort()).toEqual(['battle', 'menu', 'shop'])
    for (const id of SCENE_IDS) expect(SCENES[id]).toMatch(/\.webp/)
    expect(FOREGROUND).toMatch(/\.webp/)
  })
})
