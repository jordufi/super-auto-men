// Runtime validation for a `Team` *instance*, as opposed to `schema.ts`, which validates unit and
// food *definitions*.
//
// Anything that reaches the sim from outside this codebase has to come through here first: the
// local save (opponents recorded per turn) today, and Supabase ghost teams in Phase 13. The sim
// trusts its input completely — `content.getUnit(defId)` throws on an unknown id, and a unit with
// absurd stats is a griefing vector rather than a crash — so an unvalidated team from another
// player's device is a way to break someone else's game.
import { z } from 'zod'
import type { Slots, Team, UnitInstance } from '@sam/sim'
import { MAX_EXP } from '@sam/sim'
import { UNITS } from './registry'
import { StatusSchema } from './schema'

/** Generous, but bounded: a ghost must not be able to ship a 10^9-attack unit. */
const STAT_LIMIT = 10000

const LevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)])

const stat = (min: number) => z.number().int().min(min).max(STAT_LIMIT)

export const UnitInstanceSchema: z.ZodType<UnitInstance> = z.object({
  iid: z.string().min(1).max(200),
  defId: z.string().refine((id) => id in UNITS, { message: 'unknown unit id' }),
  atk: stat(0),
  // hp goes negative mid-battle, and a stored team is a snapshot, so do not require it positive.
  hp: stat(-STAT_LIMIT),
  level: LevelSchema,
  exp: z.number().int().min(0).max(MAX_EXP),
  tmpAtk: stat(-STAT_LIMIT),
  tmpHp: stat(-STAT_LIMIT),
  statuses: z.array(StatusSchema).max(8),
})

const slot = UnitInstanceSchema.nullable()

/** Exactly five slots, front first — the shape the sim indexes into without checking. */
export const SlotsSchema: z.ZodType<Slots> = z.tuple([slot, slot, slot, slot, slot])

export const TeamSchema: z.ZodType<Team> = z
  .object({
    name: z.string().min(1).max(100),
    slots: SlotsSchema,
  })
  .refine(
    (t) => {
      // `findUnit` returns the first match, so duplicate ids would make the sim target the wrong
      // unit rather than fail loudly.
      const ids = t.slots.filter((u): u is UnitInstance => u !== null).map((u) => u.iid)
      return new Set(ids).size === ids.length
    },
    { message: 'duplicate instance ids within a team' },
  )

/** Throws with a readable message. Use `safeParseTeam` for anything player- or network-supplied. */
export function parseTeam(raw: unknown): Team {
  return TeamSchema.parse(raw)
}

export function safeParseTeam(raw: unknown): Team | null {
  const r = TeamSchema.safeParse(raw)
  return r.success ? r.data : null
}

/** All-or-nothing: one bad team invalidates the list, because a run replays them in order. */
export function safeParseTeams(raw: unknown): Team[] | null {
  if (!Array.isArray(raw)) return null
  const out: Team[] = []
  for (const item of raw) {
    const team = safeParseTeam(item)
    if (!team) return null
    out.push(team)
  }
  return out
}
