import { describe, expect, it } from 'vitest'
import { BOTS, botTeam, botUnits } from '../src/bots'
import { UNITS } from '../src/registry'

describe('bots', () => {
  it('has one team per turn 1-10, each 1-5 real units', () => {
    expect(BOTS).toHaveLength(10)
    for (const team of BOTS) {
      expect(team.length).toBeGreaterThanOrEqual(1)
      expect(team.length).toBeLessThanOrEqual(5)
      for (const u of team) {
        expect(UNITS[u.defId], `unknown unit "${u.defId}"`).toBeDefined()
        expect(UNITS[u.defId]!.tier).toBeGreaterThanOrEqual(1) // no tokens in a shop team
        expect(u.atk).toBeGreaterThan(0)
        expect(u.hp).toBeGreaterThan(0)
      }
    }
  })

  it('botTeam builds a team with unique instance ids', () => {
    const team = botTeam(3)
    const ids = team.slots.filter((u) => u !== null).map((u) => u.iid)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
    expect(team.slots[0]).toMatchObject({ defId: 'beaver', atk: 2, hp: 3, level: 1 })
  })

  it('turn 11 and later reuse the last team', () => {
    expect(botUnits(11)).toBe(BOTS[9])
    expect(botUnits(99)).toBe(BOTS[9])
    expect(botUnits(1)).toBe(BOTS[0])
  })

  it('levels are derived from the level field', () => {
    expect(botTeam(10).slots[0]).toMatchObject({ level: 3, exp: 5 })
  })
})
