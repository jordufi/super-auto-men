# Improvements backlog

Open items only. Anything fixed is deleted from this file — the git history is the record of what
was done, and PLAN.md carries the rules that were settled along the way.

Nothing here is currently failing: `npm run typecheck && npm run lint && npm test && npm run test:e2e`
is green (201 unit tests, 14 e2e).

---

## Blocking Phase 12's close

### 1. Most sprites are opaque and render as rectangles, not cut-out characters

24 of the 37 placed sprites are palette PNGs with **no transparency chunk**, so each draws its own
background as a solid tile. Verified by decoding corner pixels:

| Sprite | Corner pixels | Renders as |
|---|---|---|
| `crab`, `ox` and the rest of the `Portraits*` set | `(28,18,27)` top, `(135,31,43)` bottom | a dark tile with a **red band** across the bottom |
| `bee`, `ram`, `dirtyRat` (the monsters) | `(0,0,0)` | a **black square** |
| `flamingo` and most other portraits | uniform `(28,18,27)` | a dark brown-purple tile |
| `apple` | palette, no `tRNS` | a **white box** (also a corporate logo, if that matters) |
| `ant` | JPG — cannot store alpha at all | a white box |

The stage background is `#232338` = `(35,35,56)`, so none of these blend in: the board reads as a
row of tiles rather than a row of characters.

These are *portrait/avatar* assets — they were drawn with frames on purpose, so the files are not
wrong. Two ways out:

- **Key out the background** — batch-make `(28,18,27)` / `(0,0,0)` transparent and re-save as RGBA.
  Keeps the cut-out look. The red band on the `Portraits*` set has to be cropped, not keyed.
- **Lean into it** — render sprites as framed avatars (rounded-square crop with a border), which is
  what a portrait icon is meant to look like. Needs no art edits and would read as deliberate.

The five originals split: `beaver`, `cricket`, `duck`, `fish` are RGBA; `ant.jpg` is not.

### 2. Six foods still have no art

`cupcake`, `garlic`, `honey`, `meatBone`, `melon`, `peanut` render as lettered tiles. 37 of 43 slots
are filled. `REQUIRE_ALL` in `packages/app/scripts/check-sprites.ts` stays `false` until these land,
then flips to `true` so a missing sprite fails the build (PLAN.md Phase 12 step 6).

~10 unused images remain in `sprites/` (`Portraits2_06/12/13/15/17/21/23/27/29`, `Rock2`), but they
are creature faces — a demon portrait labelled "Honey" reads worse than the lettered tile, so they
were deliberately not used for foods. Food art wants to look like an item.

### 3. Five slots reuse a palette variant of a character already on the board

`Portraits_XX` and `Portraits2_XX` are the same 15 characters in two palettes, so rabbit, sheep,
snail, giraffe and kangaroo are recoloured twins of five tier-2 units. Distinguishable by colour,
name and stats, but two units reading as "the same guy" is a legibility cost. Five genuinely new
32x32 characters would clear it.

---

## Visual and UX — the game knows things it never shows

Framed against Super Auto Pets. The first group is the same class of gap as the missing shop
prices were: information the sim holds and the player cannot see.

### 4. Sell value is never shown

Selling returns `unit.level` gold (`shop.ts`) and nothing says so — the button just reads "Sell".
SAP shows a unit's sell value when it is selected. Put the number on the selected card, or on the
Sell button.

### 5. Shop tier and the unlock schedule are invisible

`maxTierForTurn` opens tier 2 on turn 3 and tier 3 on turn 5, so the pool changes silently under the
player. SAP shows the current shop tier and telegraphs the next. A "Tier 2 · next tier turn 5" line
above the shop row would cover it.

### 6. Level is nearly unreadable

A unit's level shows only as five 8x5px pips under the stats — effectively invisible at stage scale.
Merging is the core mechanic, so "is this level 2?" has to be glanceable: a `Lvl 2` badge in a card
corner, with the pips demoted to a progress bar toward the next level.

### 7. Attack and health are two bare numbers

`2 1`, no icons. Which is which is guesswork for a new player, and red/green is the worst possible
pair for colour-blind players — colour is currently the *only* channel carrying the distinction.
Sword and heart glyphs cost nothing and fix both.

### 8. The battle screen is sparse

Three small sprites floating mid-screen with large dead space above and below. In rough order of
payoff: a ground line or platform shadow so units stand on something; a centre divider or VS marker;
team name labels ("You" vs "Bot 4"); rebalanced vertical space.

### 9. The two battle sides look identical

Same colour, same background, no framing — you infer which team is yours from position alone.
`data-side` is already on every unit, so a subtle warm/cool tint or a faint side panel is a few lines
of CSS.

### 10. Turn transitions are instant

Shop → battle → shop with no beat. A brief "Turn 3" or "Fight!" title card is a large
perceived-polish gain for very little code.

### 11. Smaller visual gaps

| | |
|---|---|
| Card layout | Stats are centred under the name. SAP puts attack bottom-left and health bottom-right as badges — reads faster and frees room for the sprite. |
| Top bar | `Lives 5` / `Trophies 0/10` as plain text; hearts and a trophy icon read faster and would match the new price coin. |
| Level-up bonus | The bonus unit is spliced into the shop with no highlight, so the player will not notice it appeared. |
| Board direction | "Your team — front on the right" does with a sentence what an arrow would do better. |
| Empty board | Ending a turn with no units is an automatic loss, unwarned. |
| Background | Flat gradient; a vignette or board texture would lift the whole screen. |
| Ability trigger | `onFaint` / `onHurt` shows only on hover or long-press; SAP keeps it on the card. |

---

## Latent — cheap now, expensive later

### 12. Residual risk in the replay fold's compaction point

`packages/app/src/replay/fold.ts` mirrors the sim's sparse 5-slot board and compacts where the sim
does — in the log, the moment just before each `attack` event.

One window is uncovered: abilities firing *after* the sim compacted but *before* the `attack`
(`onBeforeAttack`, `onFriendAheadAttacks`). If one ever summons or faints, its slot index is read in
the pre-compaction frame and placed wrong.

No current content reaches it — `onBeforeAttack` has no units, and `kangaroo` is the only
`onFriendAheadAttacks` unit and only buffs. The real fix is for the sim to emit compaction
explicitly, which changes the log format and regenerates **every** golden, so it deserves its own PR
with a careful golden review. Best done once tiers 4–6 exist and the ability set is settled.

### 13. Pointer-drag session leaks

`packages/app/src/dnd/useDrag.ts`:

- Listeners attach to the dragged element itself. If it unmounts mid-drag, `pointerup` never fires:
  the drag layer stays on screen and pointer capture is never released. No unmount cleanup.
- A second simultaneous pointer overwrites `session.current` and orphans the first gesture's
  listeners.
- `session` (the ref) is **written but never read** — dead code that reads like a guard.

Recovery requires a page reload. A Playwright case for "drag, then the source unmounts" would cover it.

---

## Correctness questions to settle, then lock with a test

### 14. `mergeInto` grants `+1 exp` on top of the incoming unit's exp

`packages/sim/src/shop.ts`. Two level-1 units at 1 exp each merge to exp 3 (= level 2). Matches
PLAN.md §1.4 as written and is probably intended, but nothing tests the *stacking* case.

### 15. Tier progression outruns the content

`maxTierForTurn` reaches tier 6 at turn 11, but only tiers 1–3 have units. From turn 7 the shop stops
gaining unit variety while tier-4 `melon` and tier-6 `peanut` start appearing. Expected for Phase 12
— it is what the late game feels like until tiers 4–6 exist.

### 16. `status` effect logs `applied: true` even when the status was already held

`packages/sim/src/effects.ts` dedupes the mutation but logs unconditionally, so the replay pops a
phantom item indicator for a no-op.

### 17. Dragging a unit onto its own slot flashes "refused"

`ShopScreen.onDrop` builds `{t:'reorder', from: n, to: n}`; `reorder` rejects `from === to`;
`dispatch` reads that as a refusal and flashes the gold counter for a harmless no-op.

Bundled here: `onEndTurn` calls `setScreen('battle')` unconditionally, so if `endTurnAndBattle` ever
returned `null` the player would land on the battle screen replaying the *previous* fight.

### 18. Duplicate units in one shop roll

`rollShop` picks per slot, so the same unit can appear two or three times. Fine in SAP, but currently
accidental rather than a decision.

---

## Cleanups — do them when you are already in the file

| # | File | Issue |
|---|---|---|
| 19 | `store/runStore.ts` | `persist(run)` re-serializes the whole growing run to `localStorage` synchronously on **every** dispatch. Fine now; it is on the interaction path. |
| 20 | `eslint.config.js` | `eslint-plugin-react-hooks` is a `packages/app` dependency imported by the **root** config. Works only via hoisting. |
| 21 | `screens/*.tsx`, `components/*.tsx` | Inline style objects everywhere despite a `global.css`; every card rebuilds its style object each render. `UnitCard` (148), `ShopScreen` (130), `BattleScreen` (124) are creeping toward the 300-line cap. |
| 22 | `sim/src/instance.ts` | `makeInstance` silently ignores `spec.level` when `spec.exp` is also passed: `{level: 3, exp: 0}` yields a level-1 unit. |
| 23 | `components/UnitCard.tsx` | The long-press timer is not cleared on unmount; `onPointerUp` hides the tooltip while a mouse is still hovering. |
| 24 | `tools/simcli/src/run-cli.ts` | `result.log.teams[0] ? … : 0` is a dead ternary (always truthy), and `turn - 1` is wrong on the turn that ends the run. |
| 25 | `store/runStore.ts` | `startRun` calls `clearRun()` immediately before `persist(run)`: the clear is dead. |
| 26 | `sim/src/summon.ts` | Uses `.indexOf(u)` where `positionOf` is already imported two lines up. |
| 27 | `components/EventLog.tsx` | Dev-only, `overflow: hidden`, so the newest events are the ones you cannot see. |
| 28 | `packages/app/src/assets/units/` | Mixed source resolutions (32x32 pixel art beside 288x288 and 554x554 images) mean `image-rendering: pixelated` is right for most sprites and slightly harsh on the few large non-pixel ones. |

---

## Ready for Phase 13

Not backlog — recorded so the next phase does not re-derive it.

- `packages/content/src/team-schema.ts` (`TeamSchema` / `safeParseTeam` / `safeParseTeams`) is the
  validator Phase 13 step 4 requires for ghost teams. It rejects unknown unit ids, absurd stats,
  duplicate instance ids and malformed boards. `SupabaseGhosts.pick` should run every fetched ghost
  through `safeParseTeam` and fall back to `LocalBots` on `null`.
- `loadRun()` returns `{ run, error }` and validates stored opponents through that same schema, so a
  hostile or stale ghost in the local save cannot reach the sim.
- `runStore.loadError` carries the reason to the menu; Phase 13 can reuse it for network failures.
