# Improvements backlog

Open items only. Anything fixed is deleted from this file — the git history is the record of what
was done, and PLAN.md carries the rules that were settled along the way.

Nothing here is currently failing: `npm run typecheck && npm run lint && npm test && npm run test:e2e`
is green (201 unit tests, 13 e2e).

---

## Blocking Phase 12's close

### 1. Six foods still have no art

`cupcake`, `garlic`, `honey`, `meatBone`, `melon`, `peanut` render as lettered tiles.
37 of 43 slots are filled. `REQUIRE_ALL` in `packages/app/scripts/check-sprites.ts` stays `false`
until these land, then flips to `true` so a missing sprite fails the build (PLAN.md Phase 12 step 6).

There are ~10 unused images left in `sprites/` (`Portraits2_06/12/13/15/17/21/23/27/29`, `Rock2`),
but they are all creature faces — a demon portrait labelled "Honey" reads worse than the lettered
tile does, so they were deliberately not used for foods. Food art wants to look like an item.

### 2. `ant.jpg` renders inside a white box

It is the only JPG in the folder and JPG cannot store transparency, so the sprite sits on a white
square while every other unit is cut out. Needs a re-export as a transparent PNG or WebP
(PLAN.md Appendix C #3).

### 3. Five slots reuse a palette variant of a character already on the board

`Portraits_XX` and `Portraits2_XX` are the same 15 characters in two palettes, so rabbit, sheep,
snail, giraffe and kangaroo are recoloured twins of five tier-2 units. They are distinguishable by
colour, name and stats, but two units that read as "the same guy" is a gameplay-legibility cost.
Five genuinely new 32x32 characters would clear it.

---

## Latent — cheap now, expensive later

### 4. Residual risk in the replay fold's compaction point

`packages/app/src/replay/fold.ts` mirrors the sim's sparse 5-slot board and compacts where the sim
does — which in the log is the moment just before each `attack` event.

One window is not covered: abilities that fire *after* the sim compacted but *before* the `attack`
event (`onBeforeAttack`, `onFriendAheadAttacks`). If one of those ever summons or faints, its slot
index would be read in the pre-compaction frame and placed wrong.

No current content reaches it — `onBeforeAttack` has no units at all, and `kangaroo` is the only
`onFriendAheadAttacks` unit and it only buffs. The real fix is for the sim to emit compaction
explicitly, which changes the log format and regenerates **every** golden, so it deserves its own
PR with a careful golden review. Best done once tiers 4–6 exist and the ability set is settled.

### 5. Pointer-drag session leaks

`packages/app/src/dnd/useDrag.ts`:

- Listeners attach to the dragged element itself. If it unmounts mid-drag, `pointerup` never fires:
  the drag layer stays on screen and pointer capture is never released. There is no unmount cleanup.
- A second simultaneous pointer overwrites `session.current` and orphans the first gesture's
  listeners.
- `session` (the ref) is **written but never read** — dead code that reads like a guard.

Recovering requires a page reload. Hard to unit test; a Playwright case for "drag, then the source
unmounts" would cover it.

---

## Correctness questions to settle, then lock with a test

### 6. `mergeInto` grants `+1 exp` on top of the incoming unit's exp

`packages/sim/src/shop.ts`. Two level-1 units at 1 exp each merge to exp 3 (= level 2). It matches
PLAN.md §1.4 as written and is probably intended, but nothing tests the *stacking* case, so it can
drift silently.

### 7. Tier progression outruns the content

`maxTierForTurn` reaches tier 6 at turn 11, but only tiers 1–3 have units (30 of them). From turn 7
the shop stops gaining unit variety, while tier-4 `melon` and tier-6 `peanut` do start appearing.
Expected for Phase 12 — it is simply what the late game will feel like until tiers 4–6 exist.

### 8. `status` effect logs `applied: true` even when the status was already held

`packages/sim/src/effects.ts` dedupes the mutation but logs unconditionally, so the replay pops a
phantom item indicator for a no-op.

### 9. Dragging a unit onto its own slot flashes "refused"

`ShopScreen.onDrop` builds `{t:'reorder', from: n, to: n}`; `reorder` rejects `from === to`;
`dispatch` reads that as a refusal and flashes the gold counter at the player for a harmless no-op.

Bundled here: `onEndTurn` calls `setScreen('battle')` unconditionally, so if `endTurnAndBattle` ever
returned `null` the player would land on the battle screen replaying the *previous* fight.

### 10. Duplicate units in one shop roll

`rollShop` picks per slot, so the same unit can appear two or three times in one shop. Fine in SAP,
but it is currently accidental rather than a decision.

---

## Cleanups — do them when you are already in the file

| # | File | Issue |
|---|---|---|
| 11 | `store/runStore.ts` | `persist(run)` re-serializes the whole growing run to `localStorage` synchronously on **every** dispatch. Fine now; it is on the interaction path. |
| 12 | `eslint.config.js` | `eslint-plugin-react-hooks` is a `packages/app` dependency imported by the **root** config. Works only via hoisting. |
| 13 | `screens/*.tsx` | Inline style objects everywhere despite a `global.css`; every card rebuilds its style object each render. `ShopScreen` (129 lines) and `BattleScreen` (~127) are closing on the 300-line cap. |
| 14 | `sim/src/instance.ts` | `makeInstance` silently ignores `spec.level` when `spec.exp` is also passed: `{level: 3, exp: 0}` yields a level-1 unit. |
| 15 | `components/UnitCard.tsx` | The long-press timer is not cleared on unmount; `onPointerUp` hides the tooltip while a mouse is still hovering. |
| 16 | `tools/simcli/src/run-cli.ts` | `result.log.teams[0] ? … : 0` is a dead ternary (always truthy), and `turn - 1` is wrong on the turn that ends the run. |
| 17 | `store/runStore.ts` | `startRun` calls `clearRun()` immediately before `persist(run)`: the clear is dead. |
| 18 | `sim/src/summon.ts` | Uses `.indexOf(u)` where `positionOf` is already imported two lines up. |
| 19 | `components/EventLog.tsx` | Dev-only, `overflow: hidden`, so the newest events are the ones you cannot see. |
| 20 | `packages/app/src/assets/units/` | Mixed source resolutions (32x32 pixel art next to 288x288 and 554x554 images) mean `image-rendering: pixelated` is right for most sprites and slightly harsh on the few large non-pixel ones. |

---

## Ready for Phase 13

Not backlog — recorded so the next phase does not re-derive it.

- `packages/content/src/team-schema.ts` (`TeamSchema` / `safeParseTeam` / `safeParseTeams`) is the
  validator Phase 13 step 4 requires for ghost teams. It already rejects unknown unit ids, absurd
  stats, duplicate instance ids and malformed boards. `SupabaseGhosts.pick` should run every fetched
  ghost through `safeParseTeam` and fall back to `LocalBots` on `null`.
- `loadRun()` returns `{ run, error }` and validates stored opponents through that same schema, so a
  hostile or stale ghost in the local save can no longer reach the sim.
- `runStore.loadError` carries the reason to the menu; Phase 13 can reuse it for network failures.
