// The validator every externally-supplied team must pass before it reaches the sim: the local
// save today, Supabase ghosts in Phase 13.
import { describe, expect, it } from 'vitest'
import { botTeam } from '../src/bots'
import { teamFromSpec } from '../src/spec'
import { safeParseTeam, safeParseTeams } from '../src/team-schema'

const good = () => JSON.parse(JSON.stringify(botTeam(4))) as unknown

describe('TeamSchema', () => {
  it('round-trips a real team through JSON unchanged', () => {
    expect(safeParseTeam(good())).toEqual(botTeam(4))
    const spec = teamFromSpec(['ant:3/2:L2:garlic', 'sloth'], 1)
    expect(safeParseTeam(JSON.parse(JSON.stringify(spec)))).toEqual(spec)
  })

  it('rejects an unknown unit id, which would make the sim throw mid-battle', () => {
    const t = good() as { slots: ({ defId: string } | null)[] }
    t.slots[0]!.defId = 'notAUnit'
    expect(safeParseTeam(t)).toBeNull()
  })

  it('rejects absurd stats rather than letting a ghost grief someone', () => {
    const t = good() as { slots: ({ atk: number } | null)[] }
    t.slots[0]!.atk = 1e9
    expect(safeParseTeam(t)).toBeNull()
  })

  it('rejects duplicate instance ids, which would make findUnit target the wrong unit', () => {
    const t = good() as { slots: ({ iid: string } | null)[] }
    t.slots[1]!.iid = t.slots[0]!.iid
    expect(safeParseTeam(t)).toBeNull()
  })

  it('rejects a board that is not exactly five slots', () => {
    const t = good() as { slots: unknown[] }
    t.slots = t.slots.slice(0, 3)
    expect(safeParseTeam(t)).toBeNull()
  })

  it('rejects junk outright', () => {
    for (const junk of [null, undefined, 42, 'team', {}, { name: 'x' }, []]) {
      expect(safeParseTeam(junk), String(junk)).toBeNull()
    }
  })

  it('safeParseTeams is all-or-nothing, because a run replays its opponents in order', () => {
    const ok = [good(), good()]
    expect(safeParseTeams(ok)).toHaveLength(2)
    const mixed = good() as { slots: ({ defId: string } | null)[] }
    mixed.slots[0]!.defId = 'notAUnit'
    expect(safeParseTeams([good(), mixed])).toBeNull()
    expect(safeParseTeams('not an array')).toBeNull()
  })
})
