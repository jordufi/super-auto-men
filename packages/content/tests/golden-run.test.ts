// Golden RUNS: a scripted sequence of shop actions and opponents, replayed from the seed.
// Fixture: { name, seed, turns: [{ actions, opponent }], expected: null | { turn, phase, gold, lives, trophies, team } }
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ShopAction, ShopState } from '@sam/sim'
import { replayRun, unitsOf } from '@sam/sim'
import { CONTENT } from '../src/registry'
import { UPDATE_GOLDEN, loadFixtures, teamFromSpec, writeFixture } from './golden-helpers'

interface RunFixture {
  name: string
  seed: number
  turns: { actions: ShopAction[]; opponent: string[] }[]
  expected: RunSummary | null
}

interface RunSummary {
  turn: number
  phase: ShopState['phase']
  gold: number
  lives: number
  trophies: number
  team: string[] // "ant 3/2 L1"
}

function summarize(s: ShopState): RunSummary {
  return {
    turn: s.turn,
    phase: s.phase,
    gold: s.gold,
    lives: s.lives,
    trophies: s.trophies,
    team: unitsOf(s.team).map((u) => `${u.defId} ${u.atk}/${u.hp} L${u.level}`),
  }
}

describe('golden runs', () => {
  const fixtures = loadFixtures<RunFixture>(join(import.meta.dirname, 'golden-run'))
  it('has fixtures', () => expect(fixtures.length).toBeGreaterThan(0))

  for (const { file, fixture } of fixtures) {
    it(fixture.name, () => {
      const actions = fixture.turns.flatMap((t) => [...t.actions, { t: 'endTurn' } as const])
      const opponents = fixture.turns.map((t) => teamFromSpec(t.opponent, 1, 'Bot'))
      const run = replayRun(fixture.seed, actions, opponents, CONTENT)
      const actual = summarize(run.state)
      if (UPDATE_GOLDEN) {
        writeFixture(file, { ...fixture, expected: actual })
        console.log(`UPDATED ${fixture.name}`)
        return
      }
      if (fixture.expected === null) {
        throw new Error(`golden run "${fixture.name}" has no expected result yet. Run \`npm run test:update-golden\` and review.`)
      }
      expect(actual).toEqual(fixture.expected)
    })
  }
})
