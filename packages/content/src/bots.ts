// Hand-written opponents, one per turn (PLAN.md §1.9). Replaced by real teams in M2 (Supabase).
// Stats roughly match what a player has on that turn: a bit weaker on turn 1-2, a bit stronger late.
import type { DefId, Level, Slots, Team } from '@sam/sim'
import { emptySlots, makeInstance } from '@sam/sim'
import { getUnit } from './registry'

export interface BotUnit {
  defId: DefId
  atk: number
  hp: number
  level: Level
}

const u = (defId: DefId, atk: number, hp: number, level: Level = 1): BotUnit => ({
  defId,
  atk,
  hp,
  level,
})

/**
 * Index 0 is turn 1. Index 0 of each team is the front unit. Tier 2 units appear from turn 3 and
 * tier 3 from turn 5, matching the turns on which the player can first buy them (shopRules.ts).
 */
export const BOTS: readonly BotUnit[][] = [
  [u('sloth', 1, 1)],
  [u('cricket', 1, 2), u('ant', 2, 1)],
  [u('flamingo', 3, 1), u('duck', 1, 3), u('sloth', 1, 1)],
  [u('elephant', 3, 5), u('shrimp', 2, 3), u('cricket', 2, 3)],
  [u('hedgehog', 3, 2), u('camel', 2, 5), u('ant', 3, 2), u('otter', 2, 3)],
  [u('peacock', 4, 6, 2), u('dog', 3, 4), u('cricket', 3, 4), u('duck', 2, 5)],
  [u('badger', 5, 4), u('blowfish', 4, 6), u('kangaroo', 3, 4), u('sheep', 3, 3), u('sloth', 3, 3)],
  [u('crab', 6, 8, 2), u('rat', 5, 6, 2), u('ox', 4, 6), u('spider', 4, 5), u('duck', 3, 6)],
  [u('sheep', 7, 7, 2), u('badger', 7, 5), u('camel', 6, 8, 2), u('giraffe', 5, 7), u('dodo', 5, 6)],
  [u('blowfish', 9, 9, 3), u('crab', 8, 10, 2), u('peacock', 8, 8, 2), u('ox', 7, 8, 2), u('kangaroo', 7, 6, 2)],
]

/** Turn 11 and later reuse the last entry. */
export function botUnits(turn: number): readonly BotUnit[] {
  const i = Math.min(Math.max(1, Math.trunc(turn)), BOTS.length) - 1
  return BOTS[i]!
}

export function botTeam(turn: number): Team {
  const slots: Slots = emptySlots()
  botUnits(turn).forEach((b, i) => {
    getUnit(b.defId) // fails loudly if a bot names a unit that does not exist
    slots[i] = makeInstance(
      { defId: b.defId, atk: b.atk, hp: b.hp, level: b.level },
      `bot${turn}-${i + 1}`,
    )
  })
  return { name: `Bot ${Math.min(turn, BOTS.length)}`, slots }
}
