// Parses every definition through zod at import time (ARCHITECTURE.md §5.6, P4).
// An invalid unit fails `npm run build`, not turn 7.
import type { ContentApi, DefId, FoodDef, UnitDef } from '@sam/sim'
import { FoodDefSchema, UnitDefSchema } from './schema'
import * as unitModules from './units'
import * as foodModules from './foods'
import { CUSTOM } from './custom'

function parseAll<T extends { id: string }>(
  kind: string,
  modules: Record<string, unknown>,
  parse: (raw: unknown) => T,
): Record<DefId, T> {
  const out: Record<DefId, T> = {}
  for (const [exportName, raw] of Object.entries(modules)) {
    let def: T
    try {
      def = parse(raw)
    } catch (err) {
      throw new Error(`invalid ${kind} definition "${exportName}": ${(err as Error).message}`, {
        cause: err,
      })
    }
    if (def.id !== exportName) {
      throw new Error(`${kind} "${exportName}" is exported under a name that differs from its id "${def.id}"`)
    }
    if (out[def.id]) throw new Error(`duplicate ${kind} id "${def.id}"`)
    out[def.id] = def
  }
  return out
}

export const UNITS: Readonly<Record<DefId, UnitDef>> = parseAll('unit', unitModules, (raw) =>
  UnitDefSchema.parse(raw),
)

export const FOODS: Readonly<Record<DefId, FoodDef>> = parseAll('food', foodModules, (raw) =>
  FoodDefSchema.parse(raw),
)

export function getUnit(id: DefId): UnitDef {
  const def = UNITS[id]
  if (!def) throw new Error(`unknown unit "${id}"`)
  return def
}

export function getFood(id: DefId): FoodDef {
  const def = FOODS[id]
  if (!def) throw new Error(`unknown food "${id}"`)
  return def
}

export function shopPool(maxTier: number): DefId[] {
  return Object.values(UNITS)
    .filter((u) => u.tier >= 1 && u.tier <= maxTier)
    .map((u) => u.id)
    .sort()
}

export function foodPool(maxTier: number): DefId[] {
  return Object.values(FOODS)
    .filter((f) => f.tier >= 1 && f.tier <= maxTier)
    .map((f) => f.id)
    .sort()
}

export const CONTENT: ContentApi = { getUnit, getFood, custom: CUSTOM, shopPool, foodPool }
