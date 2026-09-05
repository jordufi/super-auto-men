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

/** Index 0 is turn 1. Index 0 of each team is the front unit. */
export const BOTS: readonly BotUnit[][] = [
  [u('sloth', 1, 1)],
  [u('cricket', 1, 2), u('ant', 2, 1)],
  [u('beaver', 2, 3), u('duck', 1, 3), u('sloth', 1, 1)],
  [u('pig', 3, 2), u('fish', 2, 3), u('cricket', 2, 3)],
  [u('mosquito', 3, 3), u('horse', 2, 2), u('ant', 3, 2), u('otter', 2, 3)],
  [u('fish', 4, 5, 2), u('beaver', 3, 4), u('cricket', 3, 4), u('duck', 2, 5)],
  [u('pig', 5, 4), u('mosquito', 4, 4), u('horse', 4, 3), u('ant', 4, 3), u('sloth', 3, 3)],
  [u('beaver', 6, 6, 2), u('fish', 5, 6, 2), u('otter', 4, 5), u('cricket', 4, 5), u('duck', 3, 6)],
  [u('mosquito', 7, 7, 2), u('pig', 7, 5), u('horse', 6, 5, 2), u('ant', 6, 4), u('beaver', 5, 6)],
  [
    u('fish', 9, 9, 3),
    u('beaver', 8, 8, 2),
    u('mosquito', 8, 7, 2),
    u('horse', 7, 6, 2),
    u('ant', 7, 5, 2),
  ],
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
