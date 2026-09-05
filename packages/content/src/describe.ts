// Renders ability/food text with the numbers for a given level, e.g.
// "Give one random friend +{atk}/+{hp}." -> "Give one random friend +2/+1."
import type { AbilityDef, Effect, FoodDef, Level, Lvl3, Target } from '@sam/sim'

type Fields = Record<string, number>

function targetCount(t: Target, level: Level): number | undefined {
  if (!('count' in t)) return undefined
  return typeof t.count === 'number' ? t.count : t.count[level - 1]
}

function fieldsAt(e: Effect, level: Level): Fields {
  const at = (x: Lvl3) => x[level - 1]!
  const f: Fields = {}
  const withCount = (t: Target) => {
    const c = targetCount(t, level)
    if (c !== undefined) f['count'] = c
  }
  switch (e.kind) {
    case 'buff':
      f['atk'] = at(e.atk)
      f['hp'] = at(e.hp)
      withCount(e.target)
      break
    case 'damage':
    case 'heal':
      f['amount'] = at(e.amount)
      withCount(e.target)
      break
    case 'summon':
      f['count'] = at(e.count)
      if (e.stats) {
        f['atk'] = at(e.stats.atk)
        f['hp'] = at(e.stats.hp)
      }
      break
    case 'gold':
      f['amount'] = at(e.amount)
      break
    case 'shop':
      f['atk'] = at(e.atk)
      f['hp'] = at(e.hp)
      break
    case 'status':
      withCount(e.target)
      break
    case 'sequence':
      for (const sub of e.effects) for (const [k, v] of Object.entries(fieldsAt(sub, level))) f[k] ??= v
      break
    case 'custom':
      // Custom effects declare their numbers as [L1, L2, L3] args, so their text can be templated too.
      for (const [k, v] of Object.entries(e.args ?? {})) {
        if (Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number')) {
          f[k] = v[level - 1] as number
        } else if (typeof v === 'number') {
          f[k] = v
        }
      }
      break
  }
  return f
}

function fill(text: string, fields: Fields): string {
  return text.replace(/\{(\w+)\}/g, (m, key: string) => (key in fields ? String(fields[key]) : m))
}

export function describeAbility(ability: AbilityDef, level: Level): string {
  return fill(ability.text, fieldsAt(ability.effect, level))
}

export function describeFood(food: FoodDef): string {
  return fill(food.text, fieldsAt(food.effect, 1))
}
