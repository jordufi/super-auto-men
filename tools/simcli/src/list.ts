// `npm run sim -- list` — the whole roster with tiers, stats and ability text at each level.
import { UNITS, FOODS, describeAbility, describeFood } from '@sam/content'
import type { Level } from '@sam/sim'

const pad = (s: string, n: number): string => s.padEnd(n)

export function formatList(): string {
  const out: string[] = []
  const units = Object.values(UNITS).sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id))

  for (const tier of [1, 2, 3, 4, 5, 6, 0]) {
    const group = units.filter((u) => u.tier === tier)
    if (group.length === 0) continue
    out.push('', tier === 0 ? `TOKENS (${group.length})` : `TIER ${tier} (${group.length})`)
    for (const u of group) {
      out.push(`  ${pad(u.id, 14)} ${pad(u.name, 14)} ${u.base.atk}/${u.base.hp}`)
      if (!u.ability) continue
      out.push(`    ${u.ability.trigger}`)
      for (const level of [1, 2, 3] as Level[]) {
        out.push(`      L${level} ${describeAbility(u.ability, level)}`)
      }
    }
  }

  const foods = Object.values(FOODS).sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id))
  out.push('', `FOODS (${foods.length})`)
  for (const f of foods) out.push(`  ${pad(f.id, 14)} tier ${f.tier}  ${describeFood(f)}`)

  const shopUnits = units.filter((u) => u.tier >= 1).length
  out.push('', `${shopUnits} shop units, ${units.length - shopUnits} tokens, ${foods.length} foods`)
  return out.join('\n')
}
