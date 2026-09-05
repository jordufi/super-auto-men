// Every rules change ships with a golden test (ARCHITECTURE.md P6).
//   npm test                     -> compares each fixture's log with expectedEvents
//   npm run test:update-golden   -> rewrites expectedEvents AFTER you reviewed the diff
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { simulate } from '@sam/sim'
import { CONTENT } from '../src/registry'
import { UPDATE_GOLDEN, loadFixtures, teamFromSpec, writeFixture, type GoldenFixture } from './golden-helpers'

describe('golden battles', () => {
  const fixtures = loadFixtures<GoldenFixture>(join(import.meta.dirname, 'golden'))
  it('has fixtures', () => expect(fixtures.length).toBeGreaterThan(0))

  for (const { file, fixture } of fixtures) {
    it(fixture.name, () => {
      const log = simulate(
        teamFromSpec(fixture.a, 0),
        teamFromSpec(fixture.b, 1),
        fixture.seed,
        fixture.turn,
        CONTENT,
      )
      if (UPDATE_GOLDEN) {
        writeFixture(file, { ...fixture, expectedEvents: log.events })
        console.log(`UPDATED ${fixture.name}`)
        return
      }
      if (fixture.expectedEvents === null) {
        throw new Error(
          `golden "${fixture.name}" has no expectedEvents yet. Run \`npm run test:update-golden\`, then READ the generated log and confirm it matches the ability text before committing.`,
        )
      }
      expect(log.events).toEqual(fixture.expectedEvents)
    })
  }
})
