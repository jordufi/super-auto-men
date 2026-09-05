# Improvements backlog

Findings from the Phase 12 review of the whole repo, ranked most to least important. Items 1–6 of
that review are **already fixed** (see "Fixed in the Phase 12 review" at the bottom); everything
below is still open.

Each entry names the file, what is wrong, and why it sits where it does. Nothing here is currently
failing: `npm run typecheck && npm run lint && npm test && npm run test:e2e` is green.

---

## Latent — cheap now, expensive later

### 1. `dealDamage` never checks whether the target is still on the board

`packages/sim/src/faint.ts:47` takes a `UnitInstance` reference, not an id, and never consults
`findUnit` / `isDead`. `apply`'s `damage` case (`effects.ts:31`) deliberately resolves every target
up front — kills change the board — and then damages them in a loop.

Dormant today: nothing currently kills a *sibling* target mid-loop, because `killUnit` only queues
triggers rather than resolving them. The moment a custom fn or a new effect does kill during that
loop, you get a `damage` event against a unit that has left the board, `fire('onHurt')` on a corpse,
and `killUnit` silently no-opping.

**Fix:** guard the top of `dealDamage` with `if (isDead(target) || !findUnit(state, target.iid)) return`.

### 2. `drain` has no iteration cap

`packages/sim/src/queue.ts:10` loops `while (state.queue.length > 0)` with no guard, while the round
loop beside it has `MAX_ROUNDS = 1000`.

Unreachable with current content — summons are bounded by the 5-slot board — but *damage-on-summon
combined with honey* frees a slot as it fills one, which is an unbounded cycle. The failure mode is
a frozen browser tab, and the project already accepted this precedent for rounds (with a
`loop-guard-draw` golden).

**Fix:** a counter mirroring `MAX_ROUNDS`, plus a golden covering it.

### 3. `lvl()` in `custom.ts` silently ignores levels 2 and 3

```ts
function lvl(args, key, fallback) {
  if (Array.isArray(v) && v.length === 3) return Number(v[0])   // <- always L1
```

`packages/content/src/custom.ts:23`. It sits directly above the near-identically named `lvlAt`,
which handles the level correctly. `elephantBehind`'s `amount` and all three of `spiderSummon`'s
args go through `lvl`.

Harmless today because every arg it reads is a plain number. It is a trap for the next person, and
it fails silently and plausibly: write `amount: [1, 2, 3]` on the elephant and you get level-1
damage at level 3 with no error and no test failure.

**Fix:** rename it to say what it does (`lvlBase`), or delete it and make `lvlAt` the only accessor.

### 4. Residual risk in the replay fold's compaction point

`packages/app/src/replay/fold.ts` now mirrors the sim's sparse 5-slot board and compacts where the
sim does — which in the log is the moment just before each `attack` event.

There is one window this does not cover: abilities that fire *after* the sim compacted but *before*
the `attack` event (`onBeforeAttack`, `onFriendAheadAttacks`). If one of those ever summons or
faints, its slot index would be read in the pre-compaction frame and placed wrong.

No current content does this (`onBeforeAttack` has no units at all; `kangaroo` is the only
`onFriendAheadAttacks` unit and it only buffs). The real fix is for the sim to emit compaction
explicitly, which changes the log format and regenerates every golden — a deliberate PR of its own.

### 5. `continueRun` swallows every error and deletes the save

`packages/app/src/store/runStore.ts:56` — `catch { clearRun(); return false }`. Justified for a
rules change that a save can no longer replay, but it fires identically on a genuine `replayRun`
bug: the run is gone, with no message to the player and nothing in the console.

Ranked here rather than higher because it only bites once something else is already broken — but
then it destroys the evidence.

**Fix:** `console.error` the cause, and tell the player the save was dropped instead of silently
re-showing the menu.

### 6. Pointer-drag session leaks

`packages/app/src/dnd/useDrag.ts`:

- Listeners attach to the dragged element itself. If it unmounts mid-drag, `pointerup` never fires:
  the drag layer stays on screen and pointer capture is never released. There is no unmount cleanup.
- A second simultaneous pointer overwrites `session.current` and orphans the first gesture's
  listeners.
- `session` (the ref) is **written but never read** — dead code that reads like a guard.

Recovering requires a page reload. Hard to unit test; a Playwright case for "drag, then the source
unmounts" would cover it.

### 7. Three implemented triggers with zero content and zero tests

`onKnockOut`, `onEnemySummoned` and `onShopRoll` are fully wired in `triggers.ts` / `summon.ts` /
`shop.ts` and completely unexercised — no unit uses them and no test reaches them.

Untested implemented paths are where the next bug lives. A `fakeContent` unit in
`packages/sim/tests` covers all three without needing real content.

---

## Correctness questions to settle, then lock with a test

### 8. `heal` is uncapped

`packages/sim/src/effects.ts:35` adds hp with no ceiling and logs it as a permanent buff. In SAP,
healing caps at the unit's max health — but no max-health concept exists on `UnitInstance` at all,
so the rule currently *cannot* be expressed. Decide before more healing content lands.

### 9. `mergeInto` grants `+1 exp` on top of the incoming unit's exp

`packages/sim/src/shop.ts:197`. Two level-1 units at 1 exp each merge to exp 3 (= level 2).
Probably intended and it matches PLAN.md §1.4 as written, but nothing tests the *stacking* case, so
it can drift.

### 10. A merge still discards the other unit's temporary buffs

Related to the status fix already shipped: `mergeInto` unions `statuses` but `tmpAtk` / `tmpHp` are
still dropped, so merging a cupcaked unit loses the cupcake. PLAN.md §1.4 does not say what should
happen. Decide, then extend the test in `shop.test.ts` that already covers statuses.

### 11. `perk` is a dead field on `UnitInstance`

`packages/sim/src/types.ts:19` is declared and never written or read. It was the intended home for
"which food is this unit holding" — the job `statuses[]` ended up doing. Now that the shop renders
held items from `statuses`, `perk` has no remaining purpose.

**Fix:** delete it. A dead field on the central gameplay type invites someone to trust it.

### 12. `poison` is unreachable in a real game

Fully implemented (`statuses.ts`, `battle.ts:strike`), has a golden, and `spec.ts` can build it —
but no food grants it, so it can only ever appear in tests. Ship the peanut, or write down why the
status leads the food.

### 13. Tier progression outruns the content

`maxTierForTurn` reaches tier 6 at turn 11, but only tiers 1–3 have units (30 of them). From turn 7
the shop stops gaining unit variety while tier-4 `melon` does start appearing. Expected for Phase
12; it is what the late game will feel like until tiers 4–6 exist.

### 14. `status` effect logs `applied: true` even when the status was already held

`packages/sim/src/effects.ts:47` dedupes the mutation but logs unconditionally, so the replay pops a
phantom item indicator for a no-op.

### 15. Dragging a unit onto its own slot flashes "refused"

`ShopScreen.onDrop` builds `{t:'reorder', from: n, to: n}`; `reorder` rejects `from === to`
(`shop.ts:165`); `dispatch` reads that as a refusal and flashes the gold counter at the player for a
harmless no-op.

Bundled here: `onEndTurn` calls `setScreen('battle')` unconditionally, so if `endTurnAndBattle`
ever returned `null` the player would land on the battle screen replaying the *previous* fight.

### 16. Duplicate units in one shop roll

`rollShop` picks per slot, so the same unit can appear two or three times in one shop. Fine in SAP,
but it is currently accidental rather than a decision.

---

## Cleanups — do them when you are already in the file

| # | File | Issue |
|---|---|---|
| 17 | `store/runStore.ts` | `persist(run)` re-serializes the whole growing run to `localStorage` synchronously on **every** dispatch. Fine now; it is on the interaction path. |
| 18 | `eslint.config.js` | `eslint-plugin-react-hooks` is a `packages/app` dependency imported by the **root** config. Works only via hoisting. |
| 19 | `screens/*.tsx` | Inline style objects everywhere despite a `global.css`; every card rebuilds its style object each render. `ShopScreen` (129 lines) and `BattleScreen` (~125) are closing on the 300-line cap. |
| 20 | `sim/src/instance.ts` | `makeInstance` silently ignores `spec.level` when `spec.exp` is also passed: `{level: 3, exp: 0}` yields a level-1 unit. |
| 21 | `components/UnitCard.tsx` | The long-press timer is not cleared on unmount; `onPointerUp` hides the tooltip while a mouse is still hovering. |
| 22 | `tools/simcli/src/run-cli.ts:47` | `result.log.teams[0] ? … : 0` is a dead ternary (always truthy), and `turn - 1` is wrong on the turn that ends the run. |
| 23 | `sim/src/run.ts` | `startRun` → `clearRun()` immediately before `persist(run)` in the store: the clear is dead. |
| 24 | `sim/src/summon.ts:44` | Uses `.indexOf(u)` where `positionOf` is already imported two lines up. |
| 25 | `components/EventLog.tsx` | Dev-only, `overflow: hidden`, so the newest events are the ones you cannot see. |

---

## Fixed in the Phase 12 review

Kept for context so the numbering above is not mistaken for the whole list.

1. **Crab could reduce its own health.** `copyHighestHp` applied a negative delta, contradicting its
   own ability text, emitting a `+0/+-2` popup, and able to leave a unit at `hp <= 0` in the shop
   where no death check runs. Clamped in `custom.ts`; `popupsFor` now signs numbers correctly.
2. **Merging destroyed the moved unit's held food.** PLAN.md §1.4 said the survivor "keeps the perk
   of the unit already on the board", which is undefined for a drag-merge where both units *are* on
   the board. Rule settled (survivor keeps its own and inherits what it lacks), implemented in
   `mergeInto`, locked by two tests in `shop.test.ts`.
3. **The `replayRun` invariant was only tested against a single-unit fake content pack.** Added
   `packages/content/tests/replay.test.ts`: 60 fuzzed runs against the real roster, half greedy
   (merges, level-ups, foods) and half random, asserting byte-identical replay. Mutation-tested.
4. **The replay drew summoned units in the wrong position.** `fold.ts` kept a dense list while
   `summon`/`faint` events carry sparse slot indices, so a bee summoned into a hole appeared behind
   the survivor instead of in front — and the next `attack` animated the wrong unit. The fold now
   mirrors the sim's 5-slot board. See open item 4 for the one window still uncovered.
5. **The battle screen spoiled its own result.** `endTurnAndBattle` advances the run before the log
   is replayed, so the top bar showed post-battle trophies and lives for the whole animation.
   `TurnResult.before` now carries the pre-battle snapshot.
6. **Held items were invisible in the shop.** `BattleBoard` showed statuses but `UnitCard` did not,
   so the player could not see a perk before merging or selling it away — which compounded item 2.
