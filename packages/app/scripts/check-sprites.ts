// Every non-token unit should end up with its own sprite. Until the full set of art arrives this
// only warns; flip REQUIRE_ALL to true (PLAN.md Phase 12 step 6) to make a missing file fail the build.
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { FOODS, UNITS } from '@sam/content'

const REQUIRE_ALL = false
const DIR = join(import.meta.dirname, '..', 'src', 'assets', 'units')

function main(): void {
  const have = new Set(
    readdirSync(DIR)
      .filter((f) => /\.(png|jpg|webp)$/i.test(f))
      .map((f) => f.replace(/\.\w+$/, '')),
  )
  // Tokens (tier 0) are summoned mid-battle and foods are drawn in the shop, so both need art
  // just as much as a shop unit does. Sprites for all of them live in this one folder.
  const wanted = [...Object.values(UNITS).map((u) => u.id), ...Object.values(FOODS).map((f) => f.id)]
  const missing = wanted.filter((id) => !have.has(id))
  const extra = [...have].filter((id) => !(id in UNITS) && !(id in FOODS))

  for (const id of extra) console.warn(`sprite "${id}.png" does not match any unit id`)
  if (missing.length === 0) {
    console.log(`sprites: all ${wanted.length} units and foods have art`)
    return
  }
  const message = `sprites: ${missing.length}/${wanted.length} units and foods have no art yet (lettered tiles are shown instead): ${missing.join(', ')}`
  if (REQUIRE_ALL) {
    console.error(message)
    process.exit(1)
  }
  console.warn(message)
}

main()
