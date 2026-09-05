// Every non-token unit should end up with its own sprite. Until the full set of art arrives this
// only warns; flip REQUIRE_ALL to true (PLAN.md Phase 12 step 6) to make a missing file fail the build.
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { UNITS } from '@sam/content'

const REQUIRE_ALL = false
const DIR = join(import.meta.dirname, '..', 'src', 'assets', 'units')

function main(): void {
  const have = new Set(
    readdirSync(DIR)
      .filter((f) => /\.(png|jpg)$/i.test(f))
      .map((f) => f.replace(/\.\w+$/, '')),
  )
  const wanted = Object.values(UNITS)
    .filter((u) => u.tier >= 1)
    .map((u) => u.id)
  const missing = wanted.filter((id) => !have.has(id))
  const extra = [...have].filter((id) => !(id in UNITS))

  for (const id of extra) console.warn(`sprite "${id}.png" does not match any unit id`)
  if (missing.length === 0) {
    console.log(`sprites: all ${wanted.length} units have art`)
    return
  }
  const message = `sprites: ${missing.length}/${wanted.length} units have no art yet (lettered tiles are shown instead): ${missing.join(', ')}`
  if (REQUIRE_ALL) {
    console.error(message)
    process.exit(1)
  }
  console.warn(message)
}

main()
