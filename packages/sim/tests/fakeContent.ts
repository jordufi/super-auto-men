// A tiny ContentApi for sim tests so they stay independent of the real content package.
import type { ContentApi, FoodDef, UnitDef } from '../src/content-types'
import type { DefId } from '../src/types'

export function fakeContent(units: UnitDef[] = [], foods: FoodDef[] = []): ContentApi {
  const byId = new Map(units.map((u) => [u.id, u]))
  const foodById = new Map(foods.map((f) => [f.id, f]))
  return {
    getUnit: (id: DefId) => {
      // Units the tests never defined get a plain 1/1 body with no ability.
      return byId.get(id) ?? { id, name: id, tier: 1, base: { atk: 1, hp: 1 }, sprite: id }
    },
    getFood: (id: DefId) => {
      const f = foodById.get(id)
      if (!f) throw new Error(`fakeContent: unknown food ${id}`)
      return f
    },
    custom: {},
    shopPool: (maxTier) =>
      units
        .filter((u) => u.tier >= 1 && u.tier <= maxTier)
        .map((u) => u.id)
        .sort(),
    foodPool: (maxTier) =>
      foods
        .filter((f) => f.tier >= 1 && f.tier <= maxTier)
        .map((f) => f.id)
        .sort(),
  }
}

/** Content with no abilities at all: every unit is a plain body. */
export const NO_ABILITIES: ContentApi = fakeContent()
