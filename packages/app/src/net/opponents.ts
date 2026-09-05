// Where the opponent for a turn comes from. Phase 13 swaps LocalBots for Supabase ghosts;
// nothing outside this file needs to change (ARCHITECTURE.md §8).
import type { Rng, Team } from '@sam/sim'
import { botTeam } from '@sam/content'

export interface OpponentSource {
  /** Must not consume the run's RNG: replays reuse the stored teams, not this function. */
  pick(turn: number, trophies: number, rng: Rng): Team
}

export const LocalBots: OpponentSource = {
  pick: (turn) => botTeam(turn),
}
