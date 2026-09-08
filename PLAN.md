# PLAN.md — Implementation plan for Super Auto Men

> **Audience:** the implementing model (Sonnet 5) and the human owner.
> **Source of truth for design:** [ARCHITECTURE.md](ARCHITECTURE.md). This file says *in what order* and *how to verify*. When this file and ARCHITECTURE.md disagree on design, ARCHITECTURE.md wins. When either disagrees with the code, fix the document in the same commit.
> **Scope:** Phases 0–14 cover milestones M0–M4 (headless sim → playable browser game → 30 units → Supabase ghosts → Android APK). M5/M6 (iOS, store) are intentionally not planned yet.
> **Decisions already made by the owner:** rules and abilities are a faithful copy of Super Auto Pets (SAP). Unit *ids* stay as the SAP animal names so abilities are easy to look up; display *names* and *sprites* are the owner's own characters and will be renamed later. A physical Android phone is available for testing. No Supabase account exists yet (Phase 13 includes creating it).

---

## 0. How to use this plan

### 0.1 Rules for the implementer (read before every phase)

1. **One phase = one branch = one PR** (or one commit on `main` if working solo). Never start phase N+1 with phase N unverified.
2. **Every phase ends with the full checklist green:** `npm run typecheck && npm run lint && npm test` and, from Phase 11 on, `npm run test:e2e`. Do not declare a phase done if any of these fail. Report failures verbatim.
3. **Never regenerate golden fixtures blind.** If a golden test fails, read the diff, decide whether the change is intended, and only then run the update script. Say in the commit message which goldens changed and why.
4. **Gameplay state is only ever changed through `shopReducer` / `simulate`.** No component, store, or helper may mutate a `UnitInstance`, `Team`, or `ShopState` directly.
5. **`Math.random`, `Date`, `setTimeout`, `fetch`, `window`, `document` are banned inside `packages/sim` and `packages/content`.** ESLint enforces this from Phase 0. Do not disable the rule.
6. **Do not add features, options, or abstractions that this plan does not ask for.** If something seems missing, add a note under "Open questions" at the bottom of this file and continue with the simplest interpretation.
7. **File size cap ~300 lines.** Split before you exceed it.
8. **Every `data-testid` named in this plan must exist exactly as written.** Playwright tests depend on them.
9. **Windows dev machine.** Use `cross-env` for environment variables in npm scripts. Use forward slashes in paths inside code and configs. Line endings: configure `.gitattributes` with `* text=auto eol=lf`.
10. **When a phase says "human check", write the instructions in the PR description** so the owner can follow them without reading the code.

### 0.2 Phase template

Every phase below has the same sections:

- **Goal** — one sentence.
- **Deliverables** — files to create or modify.
- **Steps** — numbered, in order.
- **Automated tests** — what must exist and pass.
- **Human check** — what the owner runs and what they should see. This is the "visible progress" for the phase.
- **Done when** — checklist. All boxes required.

### 0.3 Phase map

| Phase | Milestone | Name | Visible result for the owner |
|---|---|---|---|
| 0 | M0 | Repo bootstrap | `npm test` runs a passing smoke test |
| 1 | M0 | Sim types + seeded RNG | RNG prints the same sequence twice |
| 2 | M0 | Battle loop (no abilities) + CLI printer | `npm run sim` prints a readable battle |
| 3 | M0 | Content package + 10 units | `npm run build` fails on a broken unit |
| 4 | M0 | Trigger queue, effects, targets, golden tests | CLI prints abilities firing; goldens lock behaviour |
| 5 | M0 | Shop reducer + run state machine | CLI plays a whole scripted run |
| 6 | M0 | DOM performance spike on the phone | 12 sprites animate at 60fps on the Android device |
| 7 | M1 | App scaffold (Vite + React + zustand) | A menu screen opens in the browser |
| 8 | M1 | Shop screen (click-based) | Buy, sell, roll, freeze in the browser |
| 9 | M1 | Drag and drop | Reorder and buy by dragging, on desktop and phone browser |
| 10 | M1 | Replay timeline + battle screen | A battle animates from a log; speed 1x/2x/instant |
| 11 | M1 | Full run loop + Playwright E2E | Complete a 10-turn run vs bots in the browser |
| 12 | M2 | Art pipeline + 30 units | 30 units with real sprites, tiers 1–3 |
| 13 | M3 | Supabase: auth, profile, ghosts | Two devices fight each other's ghost teams |
| 14 | M4 | Capacitor Android | APK installed and played on the phone |

---

## 1. Reference: the SAP rules we are implementing

The implementer should not have to look anything up. Everything needed for M0–M2 is here. If a rule is not listed, use the simplest reasonable interpretation, write it into this section, and lock it with a golden test.

### 1.1 Run structure

- A run is a sequence of **turns**. Each turn = shop phase, then battle phase.
- Player starts with **5 lives** and **0 trophies** (wins).
- Win the run at **10 trophies**. Lose the run at **0 lives**.
- Battle result: win → +1 trophy. Loss → −1 life. Draw → nothing.
- Turn counter starts at **1** and increments after each battle.

### 1.2 Shop phase

- Player gets **10 gold** at the start of every turn (not cumulative: gold resets to 10, leftover gold is lost).
- **Unit cost: 3 gold. Food cost: 3 gold. Roll cost: 1 gold.** Selling a unit gives gold equal to its **level** (1, 2, or 3).
- **Team has 5 slots.** Index 0 is the front.
- **Shop unit slots** by turn: turns 1–4 → 3 slots; turns 5–8 → 4 slots; turn 9+ → 5 slots.
- **Shop food slots** by turn: turns 1–2 → 1 slot; turn 3+ → 2 slots.
- **Tier availability** by turn: tier 1 from turn 1; tier 2 from turn 3; tier 3 from turn 5; tier 4 from turn 7; tier 5 from turn 9; tier 6 from turn 11. The shop rolls units uniformly from all available tiers' non-token units.
- **Freeze** toggles a shop slot. Frozen slots survive rolls and end-of-turn. Buying a frozen item unfreezes that slot.
- **Roll** replaces all non-frozen shop slots with new random picks. Costs 1 gold; refused if gold is 0.
- **Buy unit** into an empty team slot: costs 3 gold, unit enters with base stats, level 1, exp 0. Fires `onBuy` on the bought unit, then `onFriendSummoned` on the other friends is **not** fired for buys (only for summons in battle and `summon` effects).
- **Buy unit onto a friendly unit with the same `defId`** = **merge** (see 1.4). Costs 3 gold.
- **Buy food** onto a team unit: costs 3 gold, applies the food's effect to that unit, fires `onEatFood` on that unit.
- **Sell**: removes the unit, gives gold = level, fires `onSell` on the sold unit *before* removal (so it can still target friends).
- **Reorder**: drag a unit to another slot. Dragging onto an occupied slot **swaps** unless the target is the same `defId`, in which case it **merges**.
- **End turn**: fires `onEndOfTurn` on each unit, then the battle begins. Shop contents (except frozen slots) are discarded.
- **Start of turn**: gold set to 10, shop rolled for free, then `onStartOfTurn` fires on each unit.

### 1.3 Battle phase

1. Both teams are copied (the sim never mutates its inputs). Empty slots are compacted toward the front on both sides.
2. Fire `onStartOfBattle` for every unit on both sides through the trigger queue (ordering rule 1.5). Drain the queue.
3. **Attack loop**, repeated while both teams have at least one unit:
   a. Compact both teams toward the front.
   b. Let `A` and `B` be the front units. Fire `onBeforeAttack` for `A` and `B`. Fire `onFriendAheadAttacks` for the units directly behind `A` and `B`. Drain.
   c. If either front unit has fainted during (b), go back to (a).
   d. **Simultaneous attack:** `A` takes `B.atk` damage and `B` takes `A.atk` damage, modified by statuses (1.6). Emit one `attack` event.
   e. For each unit that took damage > 0, fire `onHurt`. For each unit whose hp ≤ 0, mark fainted, emit `faint`, and fire `onFaint` on it, `onFriendFaints` on its remaining friends, and `onKnockOut` on the attacker if the attacker is still alive. Drain.
   f. Fire `onAfterAttack` on `A` and `B` if they are alive. Drain.
4. **End:** if both sides are empty → `draw`. If only side A is empty → `b` wins. Else → `a` wins.
5. **Loop guard:** after 1000 attack rounds, the result is `draw` and an `end` event is emitted. This prevents infinite loops from bugs.
6. **Summons in battle** take the fainted unit's slot. If a summon happens with no free slot on that side, nothing is summoned. When a slot is taken by a summon, fire `onFriendSummoned` on all other friends and `onEnemySummoned` on all enemies.
7. **Temporary buffs** (from `temporary: true` effects) are held in `tmpAtk` / `tmpHp` on the instance and are added to `atk`/`hp` for all calculations. They are dropped when the battle ends (the shop-side team never sees them). The sim returns the *starting* snapshot in `BattleLog.teams`; the run state keeps its own copy of the team unchanged by battle.
8. **Damage and hp:** damage subtracts from hp. hp can go negative; a unit with hp ≤ 0 faints. There is **no max hp** in SAP, so healing is just `+hp` — a `buff` with `atk: 0`. There is no separate `heal` effect kind (Appendix C #2, resolved).

### 1.4 Levels, exp, merging

- `exp` runs 0–5. Level 1 = exp 0–1, level 2 = exp 2–4, level 3 = exp 5. `level` is derived from `exp`; store both but always recompute `level` from `exp` in one helper `levelFromExp(exp)`.
- **Merge** (buy same defId onto a unit, or drag same defId onto a unit): the surviving unit gets `exp = min(5, exp1 + exp2 + 1)`, `atk = max(atk1, atk2) + 1`, `hp = max(hp1, hp2) + 1`. If the merge crosses a level threshold, fire `onLevelUp` on the unit and add one random unit of `min(6, currentMaxTier + 1)` to the shop in a new temporary slot (the SAP "level-up bonus pet").
- **Merging never destroys a held item.** The survivor keeps its own statuses and **inherits any status the other unit held that it does not already have** (order: its own first, then the inherited ones). A shop unit carries no statuses, so for a buy-merge this is exactly "keeps its own perk"; it matters only for a drag-merge, where both units are on the board and the older wording ("keeps the perk of the unit already on the board") did not say which one wins. Locked by `shop.test.ts` / `shop-abilities.test.ts`.
- **Temporary buffs merge like permanent ones:** `tmpAtk = max(tmpAtk1, tmpAtk2)`, `tmpHp = max(tmpHp1, tmpHp2)` — the same `max` the base stats use, without the `+1` merge bonus (that is a one-off for base stats). A cupcake on the unit that is merged away is therefore not silently lost.
- Level 3 units cannot gain more exp; buying a same-defId onto a level 3 unit is refused (action is a no-op and returns `state` unchanged with no events).

### 1.5 Trigger ordering (a game rule, locked by golden tests)

When several units respond to the same event, resolve in this order:

1. Higher **effective attack** (atk + tmpAtk) first.
2. Tie → lower board position (closer to the front) first.
3. Tie → the team that owns the event source goes first, then alternate.

Triggers produced while draining are appended to the **end** of the queue. The queue is FIFO across "waves" and sorted by the rule above only *within a wave* (i.e. sort the batch of triggers produced by a single event, then append the whole batch).

### 1.6 Statuses (for M0 only `none`; M2 adds these)

| Status | Effect |
|---|---|
| `meleeShield` (Melon) | Blocks 20 damage from the next attack, then removed. |
| `garlic` | Reduces incoming attack damage by 2, minimum 1. |
| `bone` | +5 attack (implemented as a persistent atk bonus while held). |
| `honey` | On faint, summon a 1/1 `bee` in this unit's slot. |
| `poison` (Peanut) | Any damage dealt by this unit's attack that is > 0 kills the target outright. |

M0 (Phases 1–5) implements **none** of these: `statuses` is always `[]`. Phase 12 adds them together with foods.

### 1.7 The M0 roster (SAP tier 1)

Ids are SAP names. Display names are placeholders (`name` field); the owner renames later. Stats are `atk/hp`. Numbers in brackets are per level `[L1, L2, L3]`.

| id | atk/hp | trigger | effect |
|---|---|---|---|
| `ant` | 2/1 | onFaint | buff one random friend (excluding self) by `[+2/+1, +4/+2, +6/+3]` permanent |
| `beaver` | 2/2 | onSell | buff two random friends `+0/[+1,+2,+3]` permanent |
| `cricket` | 1/2 | onFaint | summon `zombieCricket` with stats `[1/1, 2/2, 3/3]` |
| `duck` | 1/3 | onSell | shop op: give every unit currently in the shop `+0/[+1,+2,+3]` |
| `fish` | 2/3 | onLevelUp | buff all friends (excluding self) `[+0/+0, +1/+1, +2/+2]` permanent (level-1 entry is unused; fish can't level up to level 1) |
| `horse` | 2/1 | onFriendSummoned | buff the summoned unit (`triggerSource`) `[+1,+2,+3]/+0` temporary |
| `mosquito` | 2/2 | onStartOfBattle | damage `[1,2,3]` random enemies for 1 each |
| `otter` | 1/2 | onBuy | buff `[1,2,3]` random friends (excluding self) `+1/+1` permanent |
| `pig` | 3/1 | onSell | gold `[+1,+2,+3]` |
| `sloth` | 1/1 | — | no ability |
| `zombieCricket` | 1/1 | — | **token**: `tier: 0`, never appears in the shop |

Content details: `mosquito` needs `randomEnemy` with `count` per level. To keep the DSL small, `Target.count` may be a number **or** an `Lvl3`. Zod schema accepts both; `resolveTarget` resolves `Lvl3` with `ctx.level`.

### 1.8 M0 foods

| id | cost | effect |
|---|---|---|
| `apple` | 3 | buff target `+1/+1` permanent |

Only `apple` in M0. Honey, meat, melon, garlic etc. arrive in Phase 12 with statuses.

### 1.9 Bot opponents (M1)

Until Supabase exists, the opponent for turn `t` is a hand-written team from `packages/content/src/bots.ts`: an array of 10 arrays (one per turn 1–10), each an array of `{ defId, atk, hp, level }` with 1–5 entries, using M0 units and stats that roughly match what a player has at that turn. Turn 11+ reuses the turn 10 entry. Phase 11 picks the bot by turn plus a seeded random choice if more than one bot exists for a turn (keep exactly one per turn in Phase 11; the plan allows more later).

---

## Phase 0 — Repo bootstrap

**Goal:** an npm-workspaces monorepo where `typecheck`, `lint`, `test` and `build` all run and pass with placeholder content.

**Deliverables**

```
package.json                    # workspaces root, scripts
tsconfig.base.json
eslint.config.js                # ESLint 10 flat config (chosen in Phase 0)
.prettierrc
.gitignore
.gitattributes
.editorconfig
.github/workflows/ci.yml
packages/sim/package.json
packages/sim/tsconfig.json
packages/sim/src/index.ts       # exports a placeholder `export const SIM_VERSION = '0.0.0'`
packages/sim/tests/smoke.test.ts
packages/content/package.json
packages/content/tsconfig.json
packages/content/src/index.ts   # placeholder
packages/content/tests/smoke.test.ts
CLAUDE.md                       # extended (see step 8)
```

**Steps**

1. `npm init -y` at the root; set `"private": true`, `"workspaces": ["packages/*", "tools/*"]`, `"type": "module"`. Node version: use the current LTS on the machine; record it in `"engines"` and in a `.nvmrc`-style file `.node-version`.
2. Install dev deps at the root: `typescript`, `vitest`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `prettier`, `cross-env`, `tsx`. Pin exact versions (`npm i -D --save-exact`).
3. `tsconfig.base.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `module: ESNext`, `moduleResolution: Bundler`, `target: ES2022`, `isolatedModules: true`. Each package's `tsconfig.json` extends it and sets `rootDir`/`outDir`. Use **TypeScript project references** or plain per-package `tsc --noEmit`; the simplest that works is per-package `tsc --noEmit` invoked by the root script.
4. `packages/sim/package.json`: name `@sam/sim`, `"main": "src/index.ts"`, `"types": "src/index.ts"`, **zero `dependencies`**. `packages/content/package.json`: name `@sam/content`, dependency `@sam/sim: "*"` and `zod` (Phase 3 adds zod; leave it out now).
5. Vitest: one root `vitest.config.ts` with `test.projects: ['packages/*']` (Vitest 5 has no workspace file) so `npm test` at root runs everything. Each package's smoke test asserts something trivial (`expect(1 + 1).toBe(2)`).
6. ESLint: base rules + these **inside `packages/sim` and `packages/content` only**:
   ```js
   'no-restricted-globals': ['error',
     { name: 'Math', message: 'Use the injected Rng (P2). Import math helpers from ./mathSafe if you need floor/max.' }, // see note
     { name: 'Date', message: 'The sim must be time-independent (P2).' },
     { name: 'setTimeout', message: 'No timers in the sim.' },
     { name: 'fetch', message: 'No I/O in the sim.' },
     { name: 'window', message: 'No DOM in the sim.' },
     { name: 'document', message: 'No DOM in the sim.' },
   ],
   'no-restricted-properties': ['error',
     { object: 'Math', property: 'random', message: 'Use the injected Rng (P2).' },
   ],
   'no-restricted-imports': ['error', { patterns: ['@sam/app*', '**/app/**', 'react', 'react-dom'] }],
   ```
   **Note:** banning the whole `Math` global is too aggressive (`Math.max`, `Math.floor` are needed). Use only the `no-restricted-properties` entry for `Math.random` and drop `Math` from `no-restricted-globals`. The line above is left in the plan so the implementer sees the reasoning; **do not ban `Math`**.
   Also add a rule in `packages/content` forbidding imports from `@sam/app`, and in `packages/sim` forbidding **all** package imports except relative ones (sim depends on nothing).
7. Root scripts:
   ```json
   "typecheck": "npm run typecheck --workspaces --if-present",
   "lint": "eslint . --ext .ts,.tsx",
   "test": "vitest run",
   "test:watch": "vitest",
   "format": "prettier --write .",
   "build": "npm run build --workspaces --if-present"
   ```
   Each package gets `"typecheck": "tsc --noEmit"`.
8. **CLAUDE.md**: keep the existing content and append a section "Project conventions" containing, verbatim from ARCHITECTURE.md §11: dependency direction, nondeterminism ban, "adding a unit is exactly three things", 300-line cap, one concept per PR, and a pointer to this PLAN.md and its rule list (§0.1). Also add: "Run `npm run typecheck && npm run lint && npm test` before declaring any task done."
9. `.github/workflows/ci.yml`: on `pull_request` and `push` to `main`: checkout, setup-node (with cache), `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. E2E is added in Phase 11.
10. `.gitignore`: `node_modules`, `dist`, `.env*.local`, `test-results`, `playwright-report`, `*.log`. Commit `package-lock.json`.
11. Move the existing `sprites/` folder to `packages/app/src/assets/units/` **later** (Phase 7). For now leave it where it is and add nothing.

**Automated tests**
- Two smoke tests pass.
- A deliberate `Math.random()` inserted temporarily into `packages/sim/src/index.ts` makes `npm run lint` fail. Remove it after confirming. Say in the PR that this was checked.

**Human check**
- Run `npm ci`, then `npm run typecheck && npm run lint && npm test && npm run build`. All succeed.
- Open the GitHub Actions tab (if the repo is on GitHub) and see a green run.

**Done when**
- [ ] All four root scripts pass locally.
- [ ] Lint catches `Math.random` in sim.
- [ ] CLAUDE.md contains the conventions section.
- [ ] CI config committed.

---

## Phase 1 — Sim types and seeded RNG

**Goal:** the core data types from ARCHITECTURE.md §4.1 and a deterministic, cross-platform RNG.

**Deliverables**

```
packages/sim/src/types.ts
packages/sim/src/rng.ts
packages/sim/src/level.ts        # levelFromExp, expForLevel
packages/sim/src/index.ts        # re-exports
packages/sim/tests/rng.test.ts
packages/sim/tests/level.test.ts
```

**Steps**

1. `types.ts`: copy the types from ARCHITECTURE.md §4.1, §4.3, §4.4, §4.5 exactly, with these additions:
   - `UnitInstance` gains `tmpAtk: number` and `tmpHp: number` (default 0) and `statuses: Status[]` where for now `export type Status = 'meleeShield' | 'garlic' | 'bone' | 'honey' | 'poison'` (the union exists; nothing uses it yet).
   - `BattleEvent` gains `{ t: 'gold'; amount: number }` and `{ t: 'shop'; op: string; amount: number }` (emitted by the shop reducer in Phase 5) and `{ t: 'levelUp'; unit: InstanceId; level: 2 | 3 }`.
   - `TriggerCtx`:
     ```ts
     export interface TriggerCtx {
       side: 0 | 1                    // side of the unit whose ability is firing
       source: InstanceId             // the unit whose ability is firing
       level: 1 | 2 | 3               // its level
       triggerSource?: InstanceId     // e.g. the unit that was summoned / fainted / bought
       position: number               // board index of `source` when the trigger was queued
     }
     ```
   - `Trigger` union exactly as §4.5.
2. `rng.ts`: implement **mulberry32** exactly as:
   ```ts
   export function makeRng(seed: number): Rng {
     let a = seed >>> 0
     const next = () => {
       a = (a + 0x6d2b79f5) >>> 0
       let t = a
       t = Math.imul(t ^ (t >>> 15), t | 1)
       t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
       return ((t ^ (t >>> 14)) >>> 0) / 4294967296
     }
     return {
       next,
       int: (maxExclusive) => Math.floor(next() * maxExclusive),
       pick: (xs) => xs[Math.floor(next() * xs.length)]!,
       shuffle: (xs) => { /* Fisher–Yates on a copy, using next() */ },
     }
   }
   ```
   `pick` on an empty array must throw with a clear message. `shuffle` must not mutate its input.
3. `level.ts`: `levelFromExp(exp: number): 1|2|3` (0–1 → 1, 2–4 → 2, 5 → 3) and `MAX_EXP = 5`.
4. Export everything from `index.ts`. Keep `index.ts` a list of `export * from` / `export type` lines only.

**Automated tests**
- `rng.test.ts`: (a) same seed → identical first 1000 values; (b) different seeds → different first value; (c) `int(n)` over 10 000 draws is always in `[0, n)`; (d) `shuffle` returns a permutation and does not mutate the input; (e) **golden**: `makeRng(42)`: record the first 5 values from your implementation in the test as literal numbers (this pins the algorithm so nobody can silently swap it).
- `level.test.ts`: table test over exp 0..5.

**Human check**
- `npx tsx -e "import {makeRng} from './packages/sim/src/index.ts'; const r = makeRng(42); console.log([r.next(), r.next(), r.next()])"` twice; output identical both times.

**Done when**
- [ ] Types compile and match ARCHITECTURE.md names.
- [ ] RNG tests pass, including the pinned values.
- [ ] `packages/sim/package.json` still has zero dependencies.

---

## Phase 2 — Battle loop without abilities, plus the CLI printer

**Goal:** `simulate()` runs a full battle with attacks and faints (no triggers yet), and `npm run sim` prints it readably.

**Deliverables**

```
packages/sim/src/battle.ts       # simulate()
packages/sim/src/board.ts        # compact(), front(), unitsOf(), findUnit(), positionOf()
packages/sim/src/instance.ts     # makeInstance(defLike, iid), effectiveAtk(), effectiveHp()
packages/sim/tests/battle.test.ts
packages/sim/tests/determinism.test.ts
tools/simcli/package.json        # name @sam/simcli, deps: @sam/sim, @sam/content (content is a stub until Phase 3)
tools/simcli/src/main.ts
tools/simcli/src/format.ts       # BattleLog -> string
```

**Steps**

1. `instance.ts`: `makeInstance({ defId, atk, hp, level?, exp? }, iid): UnitInstance`. Instance ids are generated by the caller (`${side}-${index}-${defId}` for teams built in tests/CLI; the shop reducer will use a counter in Phase 5). No global counters in sim.
2. `board.ts`: pure helpers over `Slots`. `compact(slots)` moves units toward index 0 preserving order and returns a **new** tuple.
3. `battle.ts`: implement §1.3 steps 1, 3a, 3d, 3e (faint marking only — no triggers), 4, 5. Structure it so the trigger hooks from Phase 4 slot in: write empty functions `fire(state, trigger, source, ctx)` and `drain(state, rng)` in a new `queue.ts` **stub** that does nothing yet, and call them at the exact points listed in §1.3. Phase 4 fills them in.
4. Event shapes: emit `startOfBattle`, `attack`, `damage` (one per unit that took damage), `faint`, `end`. `attack.dmgToA/dmgToB` are the amounts actually subtracted.
5. `simulate` must `structuredClone` both teams at entry and never touch the originals. Since `structuredClone` is a global, it is allowed (it is deterministic); but to keep the lint list simple, write a tiny `cloneTeam(team)` helper in `board.ts` using object spread.
6. **CLI** (`tools/simcli`): parse `--seed`, `--turn`, `--a`, `--b` (comma-separated def ids, with optional stat override `ant:3/2`). Until Phase 3 there is no content; the CLI uses a temporary inline table `{ ant: {atk:2,hp:1}, ... }` for the 10 M0 units. Replace it with the content registry in Phase 3. Root script: `"sim": "tsx tools/simcli/src/main.ts"`.
7. `format.ts` produces the format from ARCHITECTURE.md §10.1. Units are printed as `Name atk/hp` using **effective** stats. Faints print `-> X faints`.

**Automated tests**
- `battle.test.ts`:
  - 1v1 with `2/1` vs `2/2`: A takes 2 (faints), B takes 2 → both faint → `draw`, exactly one `attack` event.
  - 1v1 `1/5` vs `1/1`: B faints after one exchange; A survives with 4 hp; result `a`.
  - 2v1 where the front unit dies and the second unit finishes the enemy → result `a`, and the log shows `faint` for the first friend before the second `attack`.
  - Empty vs non-empty → `b` wins with no `attack` events. Empty vs empty → `draw`.
  - Loop guard: two `0/1` units never kill each other → `draw` after 1000 rounds; test runs in < 1s.
  - Input teams are unchanged after `simulate` (deep equality with a snapshot taken before).
- `determinism.test.ts`: for seeds 1..20, run `simulate` twice with the same inputs and `expect(JSON.stringify(log1)).toBe(JSON.stringify(log2))`.

**Human check**
- `npm run sim -- --seed 42 --a ant,cricket,horse --b beaver,duck` prints a header, a list of attacks, faints, and `RESULT: ...`. Change `--seed`; output is identical (no randomness yet). Change a team; result changes sensibly.

**Done when**
- [ ] All battle tests and determinism tests pass.
- [ ] `npm run sim` output is readable without knowing the code.
- [ ] `queue.ts` stub exists and is called from the exact §1.3 points (leave a `// Phase 4` comment at each call site).

---

## Phase 3 — Content package, zod schema, the 10 M0 units

**Goal:** units are declarative data validated at import time; a broken unit fails the build.

**Deliverables**

```
packages/content/src/schema.ts       # zod: UnitDefSchema, FoodDefSchema, EffectSchema, TargetSchema, Lvl3
packages/content/src/units/*.ts      # ant, beaver, cricket, duck, fish, horse, mosquito, otter, pig, sloth, zombieCricket
packages/content/src/units/index.ts  # one export line per unit
packages/content/src/foods/apple.ts
packages/content/src/foods/index.ts
packages/content/src/custom.ts       # export const CUSTOM = {} satisfies Record<string, CustomFn>  (empty for now)
packages/content/src/registry.ts     # UNITS, FOODS, getUnit(id), getFood(id), SHOP_POOL(tier)
packages/content/src/index.ts
packages/content/tests/validate.test.ts
packages/sim/src/content-types.ts    # the TS types for UnitDef/FoodDef/Effect/Target live in SIM (sim interprets them; content only validates)
```

**Steps**

1. **Where types live.** `sim` must be able to interpret an `Effect` without importing `content`. So the TypeScript types `UnitDef`, `FoodDef`, `Effect`, `Target`, `Lvl3`, `AbilityDef` live in `packages/sim/src/content-types.ts` (copy from ARCHITECTURE.md §5.1–5.3 with the `count: number | Lvl3` amendment from §1.7 above and `tier: 0 | 1 | 2 | 3 | 4 | 5 | 6` where 0 means token). `content` imports these types and defines **zod schemas that are checked against them** with `z.ZodType<UnitDef>` so the two cannot drift.
2. `custom` effects: the sim needs to call a function by id but cannot import `content`. Solution: `simulate()` and `shopReducer()` receive a `ContentApi` object:
   ```ts
   export interface ContentApi {
     getUnit(id: DefId): UnitDef
     getFood(id: DefId): FoodDef
     custom: Record<string, CustomFn>
     shopPool(maxTier: number): DefId[]     // sorted, deterministic
   }
   ```
   Update `simulate(teamA, teamB, seed, turn, content: ContentApi)`. `content` exports a ready-made `CONTENT: ContentApi`. Tests in sim build a tiny fake `ContentApi` inline so sim tests stay independent of the real content.
3. Write the 11 unit files from §1.7 and `apple`. `sprite` field = the unit id (the app maps id → file in Phase 7).
4. `registry.ts` parses every def with zod at import time (ARCHITECTURE.md §5.6). Any `parse` failure must throw with the unit id in the message.
5. Add `zod` as the only dependency of `content`.
6. **CLI:** replace the inline table with `CONTENT`.

**Automated tests**
- `validate.test.ts`: every def parses; ids unique; every `summon.defId` exists in `UNITS`; every `custom.fn` exists in `CUSTOM`; tiers within 0–6; every non-token unit has `tier >= 1`; `shopPool(1)` returns exactly the 10 non-token tier-1 ids in alphabetical order.
- A test that constructs an invalid unit (missing `hp`) and asserts `UnitDefSchema.parse` throws.

**Human check**
- Temporarily set `ant.tier` to `9`; `npm test` fails naming `ant`. Revert.
- `npm run sim -- --a ant --b sloth` still prints a battle, now using content stats.

**Done when**
- [ ] 11 units + apple committed, schema-validated.
- [ ] `ContentApi` threaded through `simulate` and the CLI.
- [ ] `content` depends only on `@sam/sim` and `zod`.

---

## Phase 4 — Trigger queue, effect interpreter, target resolution, golden tests

**Goal:** abilities fire in battle in the locked order (§1.5); golden fixtures freeze the behaviour.

**Deliverables**

```
packages/sim/src/queue.ts        # real implementation: enqueueBatch(), drain(), sortBatch()
packages/sim/src/triggers.ts     # fire(): collects responders for a trigger on one or both sides
packages/sim/src/effects.ts      # apply(): buff, damage, heal, summon, sequence, custom (status/gold/shop stubbed to throw 'not in battle')
packages/sim/src/targets.ts      # resolveTarget()
packages/content/tests/golden/*.json     # goldens live in CONTENT: they exercise real unit defs, and sim tests may not import content
packages/content/tests/golden.test.ts
packages/content/tests/golden-helpers.ts
packages/content/tests/determinism.test.ts  # real roster, 50 seeds
packages/sim/tests/queue.test.ts
packages/sim/tests/targets.test.ts
packages/sim/tests/effects.test.ts
package.json: "test:update-golden": "cross-env UPDATE_GOLDEN=1 vitest run --project @sam/content golden"
```

**Steps**

1. `triggers.ts` — `fire(state, trigger, opts)` where `opts` selects which units respond: `{ side, only?: InstanceId }` (one unit), `{ side, exclude?: InstanceId }` (all friends), `{ sides: 'both' }`. For each responder whose def has an ability with that trigger, create a `PendingTrigger` with a full `TriggerCtx`. Sort the batch by §1.5 and append to `state.queue`.
2. `queue.ts` — `drain(state, rng, content)`: `while (queue.length) { const p = queue.shift(); if (unit is fainted or no longer on board) continue; const events = apply(state, effect, p.ctx, rng, content); state.log.push(...events); }`. Faints caused during draining are processed **inside** `apply` for `damage` (mark faint, emit `faint`, and `fire(onFaint/onFriendFaints)`) so cascading works. Do not recurse into `drain` from `apply`.
3. `targets.ts` — every selector from ARCHITECTURE.md §5.3. Rules: `randomFriend` with `count` picks without replacement using `rng.shuffle` on the eligible list (alive, on board, excluding self if `excludeSelf`), taking the first `count`. Eligible lists are always built in **board order** before shuffling so results are deterministic. `ahead` = index−1, `behind` = index+1 on the same side, `null` if empty. `frontEnemy` = enemy index 0 after compaction.
4. `effects.ts` — implement `buff` (permanent → `atk/hp`; temporary → `tmpAtk/tmpHp`), `damage` (subtract, emit `damage`, handle faint as in step 2), `heal`, `summon` (§1.3 rule 6; the summoned instance id is `${side}-s${state.summonCounter++}-${defId}`; add `summonCounter: number` to `BattleState`), `sequence`, `custom`. `gold`, `shop`, `status` throw `Error('effect X is shop-only / not implemented until Phase 5/12')`.
5. Wire into `battle.ts` at the `// Phase 4` call sites.
6. **Golden harness** (`golden-helpers.ts`): fixture format
   ```json
   { "name": "ant-buffs-on-faint", "seed": 42, "turn": 3,
     "a": ["ant", "sloth"], "b": ["sloth:3/1"],
     "expectedEvents": [ ... ] }
   ```
   `golden.test.ts` globs `tests/golden/*.json`, builds teams via a shared `teamFromSpec(spec, side)`, runs `simulate`, and compares `log.events` to `expectedEvents` with `toEqual`. If `process.env.UPDATE_GOLDEN === '1'`, it writes the actual events back into the fixture (pretty-printed, 2-space) instead of asserting, and prints `UPDATED <name>`. A fixture with `"expectedEvents": null` is treated as "needs generation" and fails with a message telling you to run the update script.
7. Write these fixtures (create with `expectedEvents: null`, run the update script, **read every generated log by hand and confirm it matches §1.7** before committing):
   - `ant-buffs-on-faint` (ant front, sloth behind; ant dies; sloth gets +2/+1).
   - `cricket-summons-zombie` (cricket dies; zombieCricket appears at index 0; then fights).
   - `horse-buffs-summon` (cricket + horse; zombie gets +1 temp atk).
   - `mosquito-start-of-battle` (mosquito vs two enemies; one takes 1 damage; seed chooses which).
   - `mosquito-level-3` (mosquito with `level: 3` spec → three enemies hit).
   - `ordering-higher-atk-first` (two ants with different atk on side A both faint in the same attack... build a case where two units respond to one event; assert the higher-atk one's `ability` event comes first).
   - `ordering-front-first-on-tie` (equal atk; the front one fires first).
   - `summon-no-free-slot` (five-unit team where cricket dies but the slot... actually a slot frees when it dies, so build it with a friend that *also* summons; verify only one summon fits). If this case is too contrived, replace with `summon-fills-fainted-slot` and note it.
   - `loop-guard-draw`.
   Team spec syntax: `id`, `id:atk/hp`, `id:atk/hp:L2` (level from spec sets `exp` to the minimum for that level).
8. CLI: print `[ability] Name: <ability.text with numbers substituted> -> Target new/stats` for `ability` events, and `[summon]` lines.

**Automated tests**
- `queue.test.ts`: unit-tests `sortBatch` with hand-built pending triggers covering all three ordering rules.
- `targets.test.ts`: each selector on a fixed 3v3 board with a fixed seed; assert exact instance ids returned.
- `effects.test.ts`: `buff` permanent vs temporary fields; `damage` kills at exactly 0; `summon` refuses when full; `sequence` order.
- All goldens pass; determinism test still passes with abilities on (extend it to use the 10-unit roster with random 5v5 teams generated from a seeded RNG for 50 seeds).

**Human check**
- `npm run sim -- --seed 7 --a mosquito,ant,cricket --b horse,sloth,beaver --turn 3` shows `[ability]` lines for mosquito at start, ant on faint, cricket summon, horse buff. Read it like a story; it should make sense.
- Run `npm run test:update-golden` with no changes: no fixture file changes in `git status` (proves the harness is idempotent).

**Done when**
- [ ] 9 goldens committed with reviewed logs.
- [ ] Queue ordering tests pass.
- [ ] Update script works and is idempotent.
- [ ] CLI shows abilities.

---

## Phase 5 — Shop reducer and run state machine

**Goal:** a whole run is a pure fold over `{ seed, actions[] }`; the CLI can play a scripted run.

**Deliverables**

```
packages/sim/src/shop.ts         # ShopState, ShopAction, shopReducer
packages/sim/src/run.ts          # RunState, startRun(), applyAction(), endTurnAndBattle(), replayRun()
packages/sim/src/shopRules.ts    # slot counts by turn, tier by turn, costs (constants from §1.2)
packages/sim/tests/shop.test.ts
packages/sim/tests/run.test.ts
packages/content/tests/golden-run/*.json # { seed, turns: [{actions, opponent}], expected: { turn, phase, gold, lives, trophies, team } }
tools/simcli: `npm run sim -- run --seed 42 --script path.json` prints each turn
```

**Steps**

1. Types:
   ```ts
   export interface ShopSlot { kind: 'unit' | 'food'; defId: DefId; frozen: boolean; atk?: number; hp?: number } // atk/hp for shop-buffed units (duck)
   export interface ShopState {
     turn: number; gold: number; lives: number; trophies: number
     team: Slots
     shop: ShopSlot[]                     // units first, then foods
     nextIid: number
     phase: 'shop' | 'battle' | 'won' | 'lost'
   }
   export interface RunState { seed: number; state: ShopState; actions: ShopAction[]; lastBattle?: BattleLog }
   ```
2. `shopReducer(state, action, rng, content)` implements §1.2 and §1.4. Invalid actions (not enough gold, slot out of range, buying onto a level-3 unit, etc.) return `{ state, events: [] }` unchanged — **never throw** for player-reachable invalid input; throw only for malformed actions (e.g. negative index).
3. Shop-phase triggers reuse `queue.ts`/`effects.ts`. `effects.ts` now implements `gold` and `shop`. The shop-phase "battle state" is a `BattleState` with `teams: [playerTeam, emptyTeam]` so `resolveTarget` works unchanged; write `shopStateToBattleState()` and back in `shop.ts`.
4. **RNG discipline:** the run has **one** RNG created from `seed`; the reducer receives it and advances it. The battle uses **its own** RNG whose seed is derived only from `(runSeed, turn)` via `battleSeed()` in `run.ts`, never from the shop RNG. So shop randomness and battle randomness are decoupled, an extra roll cannot change the battle, and a battle can be replayed alone from `BattleLog.seed`. (Implemented in Phase 5; the earlier idea of drawing the battle seed from the shop RNG would have coupled them.)
5. `run.ts`: `startRun(seed, content)` → `RunState` with turn 1, 10 gold, rolled shop. `applyAction(run, action)` pushes the action and reduces. `endTurnAndBattle(run, opponent: Team)` runs the `endTurn` action, simulates, applies win/loss/draw, advances turn, rolls the new shop, fires `onStartOfTurn`. `replayRun(seed, actions, opponents, content)` re-folds from scratch and returns the final `RunState` — this is what server validation will use later.
6. Opponent selection is **not** in sim. `run.ts` takes the opponent `Team` as an argument.
7. CLI `run` subcommand reads a JSON script `{ seed, turns: [ { actions: [...], opponent: ["ant","sloth"] }, ... ] }` and prints each turn's shop, actions, and battle summary.

**Automated tests**
- `shop.test.ts` (each a small, named test): buy unit into empty slot (gold −3, `onBuy` fires: otter buffs a friend); buy with 2 gold → unchanged; sell pig at L1 → +1 gold... actually gold +1 for level then +1 from ability = +2; roll costs 1 and changes non-frozen slots; freeze then roll keeps the frozen slot; freeze then end turn keeps the slot next turn; merge two ants → 3/2 exp 1; merge to level 2 → `levelUp` event and a bonus tier-2 unit appears in the shop (at turn 1 the max tier is 1, so bonus is tier 2 — assert the bonus unit's tier is 2 using a fake content with a tier-2 unit); fish level-up buffs friends; duck sell buffs shop units (assert `shop[i].hp` increased); reorder swaps; reorder same-defId merges; buy apple → +1/+1.
- `run.test.ts`: a scripted 3-turn run against fixed opponents; assert trophies/lives/turn after each; `replayRun` of the same actions equals the incremental result (`JSON.stringify` equality); lives reach 0 → `phase: 'lost'`; 10 trophies → `phase: 'won'`.
- `golden-run/`: two fixtures generated with the same update mechanism as Phase 4 (`expected: null` → generate → review → commit).

**Human check**
- `npm run sim -- run --seed 42 --script tools/simcli/examples/basic-run.json` prints ~5 turns: shop contents, gold changes, battle results, lives/trophies. Check the gold math by hand for turn 1.

**Done when**
- [ ] Reducer tests pass for every action.
- [ ] `replayRun` equals incremental play.
- [ ] Battle RNG decoupled from shop RNG (test: changing an extra `roll` before `endTurn` changes the shop but not the battle result when the final team is identical — write this test).

---

## Phase 6 — DOM rendering performance spike on the Android phone

**Goal:** falsify or confirm the riskiest assumption (ARCHITECTURE.md §1, §12 M0) before building the UI.

**Deliverables**

```
spike/index.html          # single self-contained page, no framework
spike/README.md           # how it was run, device model, measured FPS, verdict
```

`spike/` is excluded from lint/typecheck/CI. It is a throwaway; keep it committed as evidence.

**Steps**

1. Build a page with a 16:9 stage scaled to the viewport, 12 `<div>`s (6 per side) with a background sprite (use `sprites/2.png` etc.), each running: an infinite idle bob (`transform: translateY` keyframes), and every 800 ms a random one does an attack lunge (`translateX` + `scale`), a hurt shake, and spawns a floating damage number (`opacity` + `translateY`, removed on `animationend`). Only `transform` and `opacity` may animate. Add `will-change: transform` on units.
2. Add an on-screen FPS counter (requestAnimationFrame delta, averaged over 60 frames).
3. Serve with `npx vite spike --host` (or `npx serve spike`). On the phone (same Wi-Fi), open `http://<pc-ip>:<port>` in Chrome.
4. Also open in the **Android WebView** proxy: use Chrome on the phone as the stand-in (Capacitor's WebView is Chrome-based; note this assumption in the README). Optionally test in Firefox for Android too.
5. Measure for 60 seconds. Record: phone model, Android version, Chrome version, average FPS, minimum FPS, any visible jank.
6. **Decision gate:** average ≥ 55 and min ≥ 45 → proceed with DOM (Phase 7). Otherwise stop and discuss with the owner; ARCHITECTURE.md §13 names PixiJS for the battle screen as the escape hatch.

**Automated tests**
- None. This phase is manual by design.

**Human check**
- Owner opens the page on the phone and watches the FPS counter; it should read close to 60 and the motion should look smooth. Owner confirms the verdict in `spike/README.md`.

**Done when**
- [ ] `spike/README.md` has device, numbers, verdict, and a screenshot from the phone.
- [ ] Verdict is "proceed" (or the owner has explicitly chosen the escape hatch, and this plan is updated).

---

## Phase 7 — App scaffold: Vite + React + zustand + menu screen

**Goal:** a browser app that boots, reads `?seed=`, and shows a menu that starts a run (no shop UI yet).

**Deliverables**

```
packages/app/package.json         # @sam/app; deps: react, react-dom, zustand; devDeps: vite, @vitejs/plugin-react
packages/app/index.html
packages/app/vite.config.ts
packages/app/tsconfig.json
packages/app/src/main.tsx
packages/app/src/App.tsx          # switches on uiStore.screen
packages/app/src/store/runStore.ts
packages/app/src/store/uiStore.ts
packages/app/src/store/urlParams.ts   # parse ?seed=&screen=&speed=&offline=
packages/app/src/screens/MenuScreen.tsx
packages/app/src/screens/ShopScreen.tsx      # placeholder: shows turn/gold/lives and "End turn" button that does nothing yet
packages/app/src/components/Stage.tsx        # adaptive logical stage (fixed 720 height, per-device width) scaled to fit the viewport, landscape
packages/app/src/assets/units/*.png          # move sprites/ here; rename to unit ids: e.g. ant.png, beaver.png, cricket.png, duck.png, fish.png (5 files → 5 units; others use the fallback)
packages/app/src/assets/units/index.ts       # `export const SPRITES: Record<string, string>` built with import.meta.glob
packages/app/src/styles/global.css
```

**Steps**

1. Vite app with React 18+, TypeScript, path aliases `@sam/sim` and `@sam/content` resolving to package `src` (Vite handles TS sources directly; no build step for sim/content).
2. **Layout decision (locked):** landscape. `Stage` is a logical canvas (a plain `div`) with a **fixed 720 logical height** and a **width that adapts to the device**, centered and scaled with `transform: scale(...)`. All screens render inside it with absolute logical coordinates for Y and lay out against the *current* stage width for X — never a hard-coded 1280.

   `stageLayout(vw, vh)` returns `{ width, scale }`: the width that would exactly fill the viewport (`vw / vh * 720`), clamped to `[MIN_W, MAX_W]` = `[1000, 1800]`, and `scale = min(vw / width, vh / 720)`. Inside the clamp both axes land on the viewport and the game fills the screen; outside it the smaller factor wins and the leftover shows as bars. 1280 (`STAGE_W`) is still the design width and is what a 16:9 device gets, so 16:9 layouts are unchanged.

   *Why not a fixed canvas:* the game ships to Android and iOS, where aspect ratios run from 4:3 to about 21:9. A fixed 16:9 canvas pillarboxed ultra-wide phones badly. The cost is that screens must not assume a width — read it from `useStageWidth()` — and that Playwright screenshots are only comparable at a fixed viewport size (the config pins 1280×720, so they still are). The rule is locked by `packages/app/tests/stage.test.ts`.

   On portrait phones show a full-screen "Rotate your device" overlay (`data-testid="rotate-overlay"`).
3. `runStore` (zustand): holds `RunState | null`, exposes `startRun(seed)`, `dispatch(action)` (calls `applyAction` from sim), and later `endTurn()`. It must be the **only** place that calls into `@sam/sim` mutators. Selectors for `team`, `shop`, `gold`, etc.
4. `uiStore`: `screen: 'menu' | 'shop' | 'battle' | 'runEnd'`, `speed: 1 | 2 | 'instant'`, `selected`, `drag` (Phase 9), `modal`.
5. `urlParams.ts`: on boot, if `?seed=` is present start a run with that seed and jump to `?screen=` (default `shop`). `?speed=` sets `uiStore.speed`. `?offline=1` is a no-op until Phase 13. Only enabled when `import.meta.env.DEV || import.meta.env.VITE_ALLOW_URL_PARAMS === '1'`; E2E builds set that env var.
6. Menu screen: title, "New run" button (`data-testid="new-run"`), and a seed input (`data-testid="seed-input"`) defaulting to a value from `rng`... no: the default seed is `Date.now() % 100000` — `Date` is allowed in `app`, never in `sim`.
7. Sprite mapping: `getSprite(defId)` returns the PNG URL or `undefined`. `UnitSprite` component renders the PNG or a fallback: a colored rounded square with the unit's first letter (color = hash of id). Re-export `sprites/1.jpg` as `ant.png` with transparent background if possible; if not, use it as-is and note it.
8. Root scripts: `"dev": "npm run dev -w @sam/app"`, `"build": ... includes app`, `"preview": "npm run preview -w @sam/app"`.
9. Add `packages/app` to lint (React rules) and typecheck.

**Automated tests**
- `packages/app/tests/urlParams.test.ts` (vitest, jsdom environment): parsing of each param.
- `packages/app/tests/runStore.test.ts`: `startRun(42)` twice yields identical `state` JSON; `dispatch` with an invalid action leaves state unchanged.
- Vitest config for app: `environment: 'jsdom'`.

**Human check**
- `npm run dev`, open the URL: menu appears inside the stage; resizing the window keeps the 720 logical height and widens the board until it hits the clamp. Click "New run" → placeholder shop screen shows "Turn 1 · Gold 10 · Lives 5 · Trophies 0". Open `/?seed=42` → lands directly on the shop.
- Open on the phone in landscape via `--host`: fills the screen; portrait shows the rotate overlay.

**Done when**
- [ ] App builds and runs; typecheck/lint/test green including app.
- [ ] Stage scaling works on desktop and phone.
- [ ] `runStore` is the only module importing sim mutators (add an ESLint `no-restricted-imports` rule for `@sam/sim` in `packages/app/src/**` except `store/runStore.ts`).

**As built (Phase 7)**
- Sprites are **copied** into `packages/app/src/assets/units/`, not moved: `spike/index.html` still serves `/sprites/` and that folder stays the owner's raw art drop. `ant` is still a `.jpg` (owner to re-export as a transparent PNG); `SPRITES` accepts `.png` and `.jpg`.
- The ESLint rule restricts the *mutator export names* of `@sam/sim` (`shopReducer`, `simulate`, `applyAction`, ...) with `allowTypeImports: true`, rather than the whole package: components legitimately need sim **types**. It is `@typescript-eslint/no-restricted-imports`, the variant that understands type imports.
- `RunEndScreen` (`data-testid="run-end"`, `back-to-menu`) was added so a finished run returns to the menu.

---

## Phase 8 — Shop screen, click-based

**Goal:** a fully playable shop phase using clicks/taps only (drag comes in Phase 9).

**Deliverables**

```
packages/app/src/screens/ShopScreen.tsx
packages/app/src/components/TeamBoard.tsx      # 5 slots, data-testid="team-slot-{i}"
packages/app/src/components/ShopRow.tsx        # unit + food slots, data-testid="shop-slot-{i}"
packages/app/src/components/UnitCard.tsx       # sprite, atk/hp badges, level pips, frozen badge; data-testid="unit-{iid}"
packages/app/src/components/GoldCounter.tsx    # data-testid="gold"
packages/app/src/components/TopBar.tsx         # turn, lives, trophies: data-testid="turn", "lives", "trophies"
packages/app/src/components/ActionBar.tsx      # Roll (data-testid="roll"), Sell (data-testid="sell"), Freeze (data-testid="freeze"), End turn (data-testid="end-turn")
packages/app/src/components/AbilityTooltip.tsx # shows ability text with level numbers substituted
```

**Steps**

1. Interaction model (click-based): tap a shop slot → it becomes `selected`; tap an empty team slot → `buyUnit`; tap a team unit with the same defId → merge (`buyUnit` with that slot); tap a team unit while a food is selected → `buyFood`. Tap a team unit → selected; tap another team slot → `reorder`. "Sell" and "Freeze" act on the current selection. Selection is `uiStore` state only.
2. Every action goes through `runStore.dispatch`. After dispatch, the store emits the reducer's `events`; for now show them in a small debug log panel (`data-testid="event-log"`, dev only) so the owner can see abilities firing in the shop.
3. Ability text: `AbilityTooltip` substitutes `{atk}`, `{hp}`, `{amount}`, `{count}` placeholders with the current-level numbers. Tap-and-hold or hover shows it. Keep text templating in `content` (a `describe(def, level)` helper next to the schema) so the CLI can reuse it.
4. Disabled states: Roll disabled at 0 gold; buy attempts with < 3 gold flash the gold counter (`class="shake"`) — the reducer already refuses; the UI just reacts to "no state change".
5. "End turn" button: for this phase it calls `runStore.endTurn()` against a bot from `content/bots.ts`, then shows a temporary text result screen ("You won / lost / drew · Trophies X · Lives Y" with `data-testid="battle-result"` and a "Continue" button `data-testid="continue"`) and returns to the shop for the next turn. Battle animation arrives in Phase 10.
6. Create `packages/content/src/bots.ts` per §1.9 (10 teams) and a `validate` test for it (defIds exist, ≤ 5 units).

**Automated tests**
- Component tests are optional; prefer **Playwright** from Phase 11. For this phase add vitest tests for the pure helpers only (`describe()` templating; selection reducer logic if extracted).
- All existing tests still green.

**Human check**
- `npm run dev`, `/?seed=42`. Buy a unit, roll, freeze a slot, roll again (frozen stays), sell a pig (gold +2), merge two of the same unit (stats up, exp pip), end turn → text result → continue → turn 2 with 10 gold and a new shop. Play until the run ends; the app returns to the menu.
- Same on the phone with taps.

**Done when**
- [ ] Every `ShopAction` is reachable by clicks.
- [ ] All `data-testid`s above exist.
- [ ] A full 10-turn run can be completed by clicking (with text-only battles).

**As built (Phase 8)**
- Taps and drags share **one** gesture path: `useDrag` (Phase 9) reports a press that moved < 6 logical px as a tap, so nothing from this phase had to be rewritten in Phase 9. The tap rules themselves are pure and live in `src/store/interaction.ts` (`resolveTap`), tested in `tests/interaction.test.ts`.
- The team is drawn **front-first on the right** (`flex-direction: row-reverse`), so slot 0 faces the enemy. Slot testids stay `team-slot-{i}` by index, not by screen position.
- Refused actions are detected in `runStore` by state identity (the reducer returns the same object) and counted in `refused`; `GoldCounter` uses that counter as its React key so the CSS shake replays with no timer and no effect.
- Team cards keep the `unit-{iid}` testid; shop cards are `shop-card-{i}` inside the `shop-slot-{i}` drop zones.

---

## Phase 9 — Drag and drop

**Goal:** reorder, merge, buy, and feed by dragging with pointer events, on mouse and touch.

**Deliverables**

```
packages/app/src/dnd/useDrag.ts           # pointer capture, lift, follow, drop hit-testing
packages/app/src/dnd/hitTest.ts           # pure: (pointer, slotRects) -> slot index | null
packages/app/src/dnd/DragLayer.tsx        # the floating copy of the dragged card
packages/app/tests/hitTest.test.ts
```

**Steps**

1. Follow ARCHITECTURE.md §6.3 exactly: `pointerdown` → `setPointerCapture`, lift (scale 1.1, z-index up), `pointermove` → hit-test against cached slot `getBoundingClientRect()`s (convert to stage logical coords by dividing by the stage scale), highlight the target slot (`data-drop-target="true"`), `pointerup` → dispatch. `touch-action: none` on all draggables. Drop outside any slot = cancel. Threshold: a press that moves < 6 logical px is a **click**, so Phase 8 tap behaviour keeps working.
2. Drop rules: team→team = `reorder` (reducer decides swap vs merge); shop unit→team = `buyUnit`; shop food→team unit = `buyFood`; team unit→sell zone (the ActionBar "Sell" button doubles as a drop zone, `data-testid="sell"`) = `sell`.
3. Keep the drag state in `uiStore.drag = { kind, from, pointer } | null`. The `DragLayer` reads it and renders the ghost at the pointer position with `transform` only.
4. Do not animate anything except `transform`/`opacity`.

**Automated tests**
- `hitTest.test.ts`: pure geometry cases, including scale ≠ 1.
- Playwright (added now, wired into CI in Phase 11): `e2e/shop-dnd.spec.ts` using `page.mouse` to drag shop slot 0 to team slot 0 and assert `team-slot-0` contains a unit; drag team 0 to team 1 and assert order swapped; drag onto the sell button and assert gold increased. Use `?seed=42` for determinism.

**Human check**
- Desktop: drag from shop to team, reorder, merge, sell by dragging to Sell. Phone: same with a finger; the page must not scroll or select text while dragging.

**Done when**
- [ ] Every drop rule works on desktop and phone.
- [ ] Taps from Phase 8 still work.
- [ ] `shop-dnd.spec.ts` passes locally (`npx playwright test`).

**As built (Phase 9)**
- Playwright lives in the app package: `packages/app/playwright.config.ts` and `packages/app/e2e/shop-dnd.spec.ts`, run with `npm run test:e2e` from the root. The config starts the dev server on port 5174 itself. Phase 11 wires it into CI from there.
- Drop zones are marked in the DOM with `data-drop-kind` / `data-drop-index` and collected once at drag start (`collectZones`), so all the geometry stays in one pure module (`dnd/hitTest.ts`), with `toStage` handling the stage scale.
- The fourth E2E case asserts that a plain click still buys: the regression guard for the shared tap/drag gesture.

---

## Phase 10 — Replay timeline and battle screen

**Goal:** a `BattleLog` plays back as animation; the UI computes nothing.

**Deliverables**

```
packages/app/src/replay/timeline.ts       # buildTimeline(log): Step[]
packages/app/src/replay/fold.ts           # boardAt(log, stepIndex): { teams, popups } — pure fold of events
packages/app/src/replay/durations.ts      # per-event-type ms table; 'instant' => 0
packages/app/src/replay/useReplay.ts      # plays steps with setTimeout/rAF, respects speed, supports skip
packages/app/src/screens/BattleScreen.tsx # data-testid="battle-screen"; speed buttons data-testid="speed-1|speed-2|speed-instant"; skip data-testid="skip"; result data-testid="battle-result"; continue data-testid="continue"
packages/app/src/components/BattleBoard.tsx
packages/app/src/components/Popup.tsx     # damage numbers, buff popups
packages/app/tests/timeline.test.ts
packages/app/tests/fold.test.ts
```

**Steps**

1. `fold.ts`: given `log` and `n`, replay `events[0..n)` onto a copy of `log.teams` and return the board plus the "current" event so the renderer knows what to animate. Because it is a pure fold, jumping to any step is trivial and idempotent (ARCHITECTURE.md §6.2). Faint removes the unit; summon inserts; buff/damage change numbers.
2. `durations.ts`: `startOfBattle 600, ability 500, attack 450, damage 0 (rides on attack), buff 350, summon 400, faint 350, end 800`. `parallelWith`: the `damage` events right after an `attack` play with it.
3. `useReplay`: state `{ index, playing }`; advances by `durationMs / speed`; `instant` sets `index` to the end synchronously. "Skip" = same as instant for the rest. Uses `setTimeout` (allowed in app). Pausing on tab hide is not required.
4. `BattleScreen` renders `boardAt(log, index)` with CSS classes for the current event (`.attacking`, `.hurt`, `.fainting`, `.summoned`) that run keyframe animations on `transform`/`opacity` only. When `index === events.length`, show `battle-result` text (`Victory` / `Defeat` / `Draw`) and the Continue button.
5. Replace Phase 8's text result with the battle screen: `runStore.endTurn()` stores `lastBattle` and `uiStore.screen = 'battle'`; Continue applies the result... **no**: the result is already applied inside `endTurnAndBattle` in sim. Continue only switches the screen back to the shop (or to run-end).
6. `?screen=battle&seed=42` in dev boots straight into a battle: start a run with the seed, auto-buy the first shop unit, end turn, show the battle. This is what Playwright uses.

**Automated tests**
- `fold.test.ts`: for a golden fixture's log, `boardAt(log, events.length)` matches the expected survivors; `boardAt` at the same index twice returns equal results.
- `timeline.test.ts`: total duration at `instant` is 0; `parallelWith` set on damage-after-attack.
- Playwright `e2e/battle.spec.ts`: `/?seed=42&screen=battle&speed=instant` → `battle-result` has one of `Victory|Defeat|Draw` within 5 s; `speed=1` → `battle-result` not visible immediately, visible after clicking `skip`.

**Human check**
- Play a turn; watch the battle: units lunge, damage numbers float, abilities show a popup with the ability text, fainted units fade out, summons pop in. Try 1x, 2x, instant, and skip. The final board matches what the CLI prints for the same battle: run `npm run sim -- --seed <BattleLog.seed> --a ... --b ...` (show the seed and teams in the dev event panel to make this easy).

**Done when**
- [ ] Battle animates from the log; no sim calls during playback.
- [ ] Speed and skip work.
- [ ] Both e2e specs pass locally.

**As built (Phase 10)**
- `fold.ts` keeps each side as a **dense list of units**, not a 5-slot array: compaction is a sim-internal detail and only the order matters on screen. `boardAt` applies `damage` events and ignores the `attack` event's `dmgToA`/`dmgToB` (the sim emits both, so counting the attack too would double the damage).
- Steps are grouped: any `damage` event is `parallelWith` the step before it, so the number pops while the attack or ability that caused it is playing. `groupAt(steps, i)` returns a head plus its followers.
- A `faint` is drawn **before** it is applied, so the unit can fade out while still on the board; the next step removes it.
- `useReplay` resets on a new log with React's "adjust state during render" pattern rather than a `setState` inside an effect, which the `react-hooks` lint rules reject.
- Phase 8's text result overlay was deleted; `BattleScreen` owns `battle-result` and `continue` now.

---

## Phase 11 — Full run loop, run-end screen, local save, Playwright in CI

**Goal:** M1 complete: a person can play a whole run in the browser, close the tab, come back, and continue; CI runs E2E.

**Deliverables**

```
packages/app/src/screens/RunEndScreen.tsx   # data-testid="run-end", shows won/lost, trophies, "Back to menu" data-testid="back-to-menu"
packages/app/src/store/persist.ts           # save { seed, actions, opponentsByTurn } to localStorage after every action; restore via replayRun on boot
packages/app/src/net/opponents.ts           # interface OpponentSource { pick(turn, trophies, rng): Team }; LocalBots implementation
e2e/playwright.config.ts
e2e/full-run.spec.ts
e2e/persist.spec.ts
.github/workflows/ci.yml                     # + install playwright browsers, build app with VITE_ALLOW_URL_PARAMS=1, run e2e
package.json: "test:e2e": "playwright test -c e2e/playwright.config.ts"
```

**Steps**

1. `OpponentSource` abstraction now, so Phase 13 can swap in ghosts. Opponent choice uses the run RNG (drawn in `runStore` before `endTurn`) so the whole run stays replayable; **store the chosen opponent team per turn in the saved run** so replay does not depend on the bot table staying the same.
2. Persistence: save after every dispatch; on boot, if a saved run exists, the menu shows "Continue run" (`data-testid="continue-run"`). Restore by `replayRun(seed, actions, opponentsByTurn)`. Corrupt or version-mismatched saves are discarded (store a `saveVersion` number).
3. Run end: when `phase` becomes `won`/`lost` after a battle, Continue leads to `RunEndScreen`, which clears the save.
4. Playwright config: `webServer` runs `vite preview` on the built app with `VITE_ALLOW_URL_PARAMS=1`; `baseURL`; chromium only; `use.viewport = { width: 1280, height: 720 }`; screenshots on failure; `trace: 'retain-on-failure'`. Keep `toHaveScreenshot` **out** of assertions for now (platform font differences between Windows and CI Linux make baselines brittle). Instead each spec saves a `page.screenshot()` into `test-results/` so the implementing model can look at it.
5. `full-run.spec.ts`: from `/?seed=42&speed=instant`, loop: buy the first affordable shop unit into the first empty slot, click end-turn, wait for `battle-result`, click continue; until `run-end` appears (cap at 25 iterations). Assert `run-end` shows either won or lost.
6. `persist.spec.ts`: play two turns, reload, click `continue-run`, assert `turn` text is unchanged and the team has the same units.
7. CI: add the e2e job after build; upload `test-results` as an artifact on failure.

**Automated tests**
- Everything so far + the three e2e specs (dnd, battle, full-run, persist) green in CI.

**Human check**
- Play a complete run in the browser from the menu. Close the tab mid-run, reopen, "Continue run" restores it. Finish; the run-end screen shows the result; back to menu. Owner's verdict per ARCHITECTURE.md M1: "you can complete a run and want to play again".

**Done when**
- [ ] CI green including E2E.
- [ ] Save/restore works and is replay-based (no serialized `ShopState` in localStorage; only `{seed, actions, opponentsByTurn, saveVersion}`).
- [ ] Owner has completed a run.

**As built (Phase 11)**
- **Opponent choice must not consume the run RNG.** A replay re-runs the shop actions against a fresh RNG and reuses the *stored* opponents, so any draw made for matchmaking during live play would desync the shop rolls on restore. `runStore` passes `LocalBots` a separate RNG derived from `(seed, turn)`; `LocalBots` ignores it entirely today.
- `RunEndScreen` already existed from Phase 7; this phase only added the save-clearing.
- Playwright config stayed in `packages/app/` (`playwright.config.ts`, `e2e/`) instead of a root `e2e/` folder, and now builds with `VITE_ALLOW_URL_PARAMS=1` and serves the result with `vite preview` — the same artifact CI and the phone get. `npm run test:e2e` from the root still works.
- CI gained a second job (`e2e`) that runs after `check`, installs chromium, and uploads `test-results/` and `playwright-report/` on failure.

---

## Phase 12 — Art pipeline, statuses/foods, 30 units (tiers 1–3)

**Goal:** M2: the game scales in content and has an identity.

**Owner input required before starting:** 30 sprites (one per unit id below), **512×512 PNG with transparent background**, trimmed, consistent style (pixel art like the Goku sprite is fine; then all should be pixel art). Name each file `<unitId>.png`. Until they arrive, the CSS fallback stays in place per unit, so this phase can proceed on content first and art second.

**Deliverables**

```
packages/content/src/units/*.ts        # +20 units (tier 2 and 3)
packages/content/src/foods/*.ts        # honey, meat, melon, garlic, cupcake, saladBowl, canned food (see below)
packages/sim/src/statuses.ts           # damage modification and on-faint hooks for §1.6
packages/sim/tests/golden/*.json       # one golden per new unit + per status
packages/app/src/assets/units/*.png    # 30 sprites
packages/app/scripts/check-sprites.ts  # fails if a non-token unit has no sprite (warning only until all 30 arrive; error after — flip a constant)
tools/simcli: `npm run sim -- list` prints all units with tier, stats, ability text
```

**Steps**

1. **Statuses** (§1.6) in sim: `damage` computation moves into `statuses.ts` with `modifyIncoming(unit, amount)` and `onFaintExtras(unit)` (honey → bee summon, `bee` is a token unit 1/1). Add `{ kind: 'status' }` effect implementation. Golden per status.
2. **Foods:** `apple` (+1/+1), `honey` (status honey), `meatBone` (status bone), `garlic` (status garlic), `melon` (status meleeShield), `cupcake` (+3/+3 temporary), `saladBowl` (+1/+1 to two random friends), `cannedFood` (shop op: all current and future shop units +2/+1 — implement as `ShopState.shopBuff: {atk, hp}` applied on roll). Tier: apple/honey tier 1; meatBone/cupcake tier 2; saladBowl/garlic tier 3; cannedFood tier 3; melon tier 4 (not yet reachable; still define it). Food slots roll from foods with `tier <= maxTier`.
3. **Units** (SAP standard tiers 2–3; stats and abilities as in SAP):
   - Tier 2: `crab` (3/3, onBuy copy hp of highest-hp friend — `custom: copyHighestHp`), `dodo` (2/3, onStartOfBattle give friend ahead 50%/100%/150% of its atk — `custom: dodoShare`), `elephant` (3/5, onAfterAttack deal 1 damage to 1/2/3 friends behind — `custom: elephantBehind`), `flamingo` (3/1, onFaint buff two friends behind +1/+1, +2/+2, +3/+3), `hedgehog` (3/2, onFaint damage all units on both sides 2/4/6 — needs `allUnits` target: add `{ kind: 'allUnits' }` to `Target`), `peacock` (2/5, onHurt gain +2/+4/+6 atk... SAP: gain 50% attack; use flat `[+2,+4,+6]`), `rat` (4/5, onFaint summon a 1/1 `dirtyRat` on the **enemy** side — `custom: summonEnemy`), `shrimp` (2/3, onSell buff one random friend +0/+1, +2, +3), `spider` (2/2, onFaint summon a random tier-3 unit as 2/2 — `custom: spiderSummon`), `swan` (1/3, onStartOfTurn gold +1/+2/+3).
   - Tier 3: `badger` (5/4, onFaint damage adjacent units (both sides) by its atk — `custom: badgerFaint`), `blowfish` (3/5, onHurt damage 2/4/6 to a random enemy), `camel` (2/5, onHurt buff friend behind +1/+2, +2/+4, +3/+6), `dog` (2/2, onFriendSummoned gain +1/+1, +2/+2, +3/+3 permanent), `giraffe` (2/5, onEndOfTurn buff 1/2/3 friends ahead +1/+1), `kangaroo` (1/2, onFriendAheadAttacks gain +2/+2, +4/+4, +6/+6), `ox` (1/4, onFriendFaints gain melon status and +2/+4/+6 atk — `sequence` of `status` and `buff`), `rabbit` (3/2, onEatFood... SAP: friend eats food → give it +1 hp; add trigger `onFriendEatsFood` to the union), `sheep` (2/2, onFaint summon two 2/2 `ram` tokens per... SAP: two rams 2/2, 4/4, 6/6), `snail` (2/2, onBuy if last battle was lost buff all friends +2/+1... needs `lastBattleResult` in `ShopState`; expose via `TriggerCtx.shop?: { lastResult }`).
   Tokens: `dirtyRat` (1/1), `ram` (2/2), `bee` (1/1).
   Add `Target` kinds only if listed here (`allUnits`, `friendsBehind`/`friendsAhead` with count). Everything else goes through `custom`.
4. **One golden per unit** (ARCHITECTURE.md §11). Name the fixture after the unit. Review each generated log against the ability text before committing. Do them in batches of 5 units per commit.
5. Shop tiers 2 and 3 become reachable at turns 3 and 5 (`shopRules.ts` already encodes this; add a test that `shopPool(3)` includes exactly the 30 non-token ids).
6. **Art pipeline:** `check-sprites.ts` run in `prebuild`. Document in `packages/app/README.md`: file naming, 512×512, transparent PNG, `image-rendering: pixelated` is applied globally, "put the file in `src/assets/units/` and nothing else is needed".
7. Bots: extend `bots.ts` to use tier 2–3 units from turn 3 on.
8. CLI `list` subcommand.

**Automated tests**
- Content validation: 30 non-token units + tokens; every `custom.fn` referenced exists; every `Target` kind is handled in `resolveTarget` (write a test that iterates the `Target` kinds listed in the zod enum and calls `resolveTarget` on a sample board without throwing).
- 20+ new goldens, 7 status/food goldens.
- Determinism test extended to the 30-unit roster.
- E2E unchanged but re-run: full-run must still pass (bots changed).

**Human check**
- `npm run sim -- list` prints 30 units with readable ability text.
- In the browser: turn 3 shows tier-2 units, turn 5 tier-3; buy honey onto a unit, watch the bee appear when it faints; garlic reduces damage numbers on screen.
- Real sprites visible for every unit that has art.

**Done when**
- [ ] 30 units + tokens + 8 foods + 5 statuses, all golden-tested.
- [ ] Sprites in place for all units the owner has delivered; fallback for the rest.
- [ ] CI green.

**As built (Phase 12)**
- `summonUnit` moved out of `effects.ts` into `packages/sim/src/summon.ts`, because honey makes `faint.ts` summon and faint must not depend on the effect interpreter.
- `CustomFn` now takes the `ContentApi` as a parameter (`(state, ctx, rng, content, args)`), so a custom function can summon and deal damage without content having to reach back into its own registry.
- `TriggerCtx` gained `atk`, the unit's effective attack when the trigger was queued. Badger needs it: by the time its faint ability resolves it is off the board.
- Statuses live in `packages/sim/src/statuses.ts` and apply to **all** damage, attack and ability alike. Melon is checked first and consumed by the hit; the `status` event for that is logged right after the `attack` event, so the replay shows the shield breaking on the hit that broke it. Meat bone is a flat bonus inside `effectiveAtk`.
- Goldens: 19 new battle fixtures (14 units + 5 statuses). Six abilities only exist in the shop — crab, shrimp, swan, giraffe, snail, rabbit — and are covered by `packages/content/tests/shop-abilities.test.ts` with the real `shopReducer` instead of a battle fixture that could never fire them. The same file covers cupcake, canned food and the salad bowl.
- The team-spec grammar gained status tokens (`sloth:1/20:garlic`) so a status golden needs no food purchase.
- `describeAbility` fills placeholders from a custom effect's `[L1, L2, L3]` args, so custom units get level-aware text too; a test asserts no `{placeholder}` survives for any unit or food at any level.
- `basic-run.json` (golden run) changed by exactly one line: honey joined the tier-1 food pool, so turn 1 rolls honey instead of apple and the mosquito no longer gets +1/+1.
- The bot table now uses tier-2 units from turn 3 and tier-3 from turn 5, locked by a test against `maxTierForTurn`.

---

## Phase 13 — Supabase: anonymous auth, profile, ghosts, matchmaking

**Goal:** M3: two devices fight each other's ghost teams. The game stays fully playable offline.

**Owner tasks (cannot be automated):**
1. Create a free Supabase account and a project (region closest to you). Save the **Project URL** and **anon public key**.
2. In *Authentication → Providers*, enable **Anonymous sign-ins**.
3. Put the two values in `packages/app/.env.local` as `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=` (this file is git-ignored; a `.env.example` with empty values is committed).
4. Run the SQL migration from `supabase/migrations/0001_init.sql` in the dashboard SQL editor (or with the Supabase CLI if installed).

**Deliverables**

```
supabase/migrations/0001_init.sql        # tables + RLS from ARCHITECTURE.md §8.2, plus the matchmaking function below
supabase/README.md                        # the owner tasks above, step by step with screenshots described in words
packages/app/.env.example
packages/app/src/net/supabase.ts          # createClient; null if env vars missing
packages/app/src/net/auth.ts              # ensureAnonymousSession()
packages/app/src/net/profile.ts           # load/create profile; update trophies
packages/app/src/net/ghosts.ts            # uploadGhost(turn, trophies, team); fetchGhost(turn, trophies)
packages/app/src/net/opponents.ts         # + SupabaseGhosts implements OpponentSource, falls back to LocalBots
packages/app/src/store/sessionStore.ts    # auth state, profile, sync status, offline flag
packages/app/src/screens/MenuScreen.tsx   # shows display name + trophies, "offline" badge when no backend (data-testid="net-status")
packages/app/tests/ghostSerialization.test.ts
```

**Steps**

1. **Schema:** ARCHITECTURE.md §8.2 tables + RLS policies: `profiles` select all, insert/update own; `ghosts` select all, insert own; `runs` insert own, select own. Add a Postgres function `pick_ghost(p_turn int, p_trophies int) returns setof ghosts` implementing the §8.3 query (`security definer`, excludes `auth.uid()`), so the client makes one RPC call.
2. **Boot:** if `supabase.ts` returns null (no env) or `?offline=1`, `sessionStore.offline = true` and everything uses `LocalBots`. Otherwise `ensureAnonymousSession()`, then load-or-create the profile (`display_name` = `Player-<first 6 chars of uid>`).
3. **Ghost upload:** on `endTurn`, before the battle, upload `{ turn, trophies, team }` where `team` is `Team` serialized as JSON with `tmpAtk/tmpHp` zeroed. Fire-and-forget; failures are logged and never block the turn.
4. **Matchmaking:** `SupabaseGhosts.pick(turn, trophies, rng)` calls `pick_ghost`; if it returns a row, parse and **validate** the team with the content zod schema (a malicious ghost must not crash the sim: unknown defIds → fall back to a bot). If no row or any error → `LocalBots.pick(...)`. Timeout 3 s.
5. **Replay integrity:** the chosen opponent team is stored in the local save per turn (Phase 11 already does this), so runs remain replayable regardless of network.
6. **Trophies to profile:** at run end, `profiles.trophies += runTrophies` (client-authoritative for v1; ARCHITECTURE.md §8.5).
7. **Run upload (optional, cheap):** at run end insert `{ seed, actions, result }` into `runs`. Include `opponentsByTurn` inside the `actions` JSON envelope so a future server validator has everything.
8. E2E keeps running with `?offline=1` appended by the Playwright config `baseURL`... simpler: the E2E build has no env vars, so `supabase.ts` returns null and everything is offline automatically. Add one assertion that `net-status` reads "offline" in E2E.

**Automated tests**
- `ghostSerialization.test.ts`: `Team` → JSON → `Team` round trip; a ghost with an unknown defId is rejected by the validator.
- Sim/content untouched; E2E offline path green.
- Manual integration only for the network path (no Supabase in CI).

**Human check**
- On the PC browser, play 2 turns. In the Supabase dashboard, `ghosts` has 2 rows with your uid.
- On the phone (Chrome, `--host` URL), play a run: from turn 1 the opponent should sometimes be the PC's ghost (make the PC's team recognizable, e.g. 3 pigs). Check the phone's battle shows that team.
- Kill the Wi-Fi mid-run: the next end-turn still works (bot opponent), `net-status` shows offline; reconnect and it recovers next turn.

**Done when**
- [ ] Migration committed and applied.
- [ ] Two devices have fought each other's ghosts (owner confirms).
- [ ] Offline path unchanged and E2E green.
- [ ] No secret committed (`git grep -i "anon"` returns only the example file).

---

## Phase 14 — Capacitor Android build on the physical phone

**Goal:** M4: an APK installed and played on the owner's Android phone.

**Owner prerequisites:** install **Android Studio** (which bundles a JDK; note the required JDK version in the README once verified) and enable **USB debugging** on the phone.

**Deliverables**

```
packages/app/capacitor.config.ts       # appId 'com.<owner>.superautomen' (owner picks), appName, webDir 'dist', android.allowMixedContent false, server.androidScheme 'https'
packages/app/android/                  # generated by `npx cap add android`, committed
packages/app/src/native/backButton.ts  # Android back button: confirm-exit on menu, otherwise no-op
packages/app/src/native/orientation.ts # lock landscape via AndroidManifest `android:screenOrientation="sensorLandscape"`
docs/android.md                        # the exact commands and Android Studio clicks, plus troubleshooting
package.json: "android:sync": "npm run build && npx cap sync android -w @sam/app" (adjust for workspace cwd), "android:open": "npx cap open android"
```

**Steps**

1. Add `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/app` to `packages/app`. `npx cap init` then `npx cap add android`. Commit the generated `android/` folder except build outputs (`android/app/build`, `android/.gradle`, `android/build` → `.gitignore`).
2. Vite `base: './'` so assets resolve from the WebView file scheme.
3. Manifest: landscape lock; `android:usesCleartextTraffic` not needed (Supabase is https). Keep `INTERNET` permission.
4. Back button via `@capacitor/app` `backButton` listener.
5. Safe areas: add `viewport-fit=cover` and `env(safe-area-inset-*)` padding on the stage container.
6. Build: `npm run android:sync`, `npm run android:open`, then in Android Studio: select the phone, Run. First launch on device; then `chrome://inspect` on the PC to see the WebView console.
7. Verify: FPS in battle looks like the spike (no counter needed; visual check), touch drag works, the app resumes correctly after backgrounding, Supabase ghosts work on the device.
8. Produce a **debug APK** (`Build → Build APK`) and record the path in `docs/android.md`. Release signing is M6 work; do not do it now.

**Automated tests**
- No new tests. Full suite + E2E remain green (the web build is what ships inside the APK).
- Add a CI step that runs `npx cap sync android` with `--dry-run`-equivalent? Capacitor has none; instead add a CI job on Ubuntu that installs the Android SDK via `android-actions/setup-android` and runs `./gradlew assembleDebug` in `packages/app/android`. If this is slow or flaky, make it `workflow_dispatch` only and note it.

**Human check**
- The owner installs the APK, plays a run start to finish on the phone, fights a ghost uploaded from the PC, backgrounds the app and returns without losing state.

**Done when**
- [ ] APK installs and a full run is playable on the phone.
- [ ] `docs/android.md` lets someone repeat the build without asking questions.
- [ ] `android/` committed; `.gitignore` excludes build outputs.

---

## Appendix A — Test inventory (what protects what)

| Layer | Tool | Runs on | Protects |
|---|---|---|---|
| `sim` unit tests | vitest | every `npm test` | RNG, ordering, targets, effects, shop reducer |
| Golden battles | vitest + JSON fixtures | every `npm test` | every unit's ability, every status, ordering rules |
| Golden runs | vitest + JSON fixtures | every `npm test` | whole-run replay, shop economy |
| Determinism | vitest | every `npm test` | no hidden randomness or iteration-order bugs |
| Content validation | vitest + zod | every `npm test` and at import in the app | data integrity, sprite presence |
| App pure helpers | vitest (jsdom) | every `npm test` | url params, fold/timeline, hit-testing, persistence format |
| E2E | Playwright (chromium) | `npm run test:e2e` + CI | the game is actually playable end to end |
| Manual | human + phone | each phase's "Human check" | feel, performance, network, device |

## Appendix B — Commands cheat sheet

```
npm ci                              # install
npm run typecheck && npm run lint && npm test     # the gate for every phase
npm run test:update-golden          # after reviewing a golden diff
npm run sim -- --seed 42 --a ant,cricket --b sloth --turn 1
npm run sim -- run --seed 42 --script tools/simcli/examples/basic-run.json
npm run sim -- list
npm run dev                         # web, http://localhost:5173/?seed=42
npm run dev -- --host               # expose to the phone on the LAN
npm run build && npm run preview    # production web build
npm run test:e2e                    # playwright
npm run android:sync && npm run android:open
```

## Appendix C — Open questions (append here as they arise; do not block on them)

1. Exact SAP tie-break for simultaneous triggers across sides (§1.5 rule 3 is our assumption; confirm during playtesting and update goldens if wrong).
2. ~~Whether `heal` should be a distinct effect kind or an alias of `buff` with `atk: 0`.~~ **Resolved (Phase 12 review):** alias. `heal` was never used by any unit or food and duplicated `buff` with `atk: 0`, so the effect kind was removed from the vocabulary. Healing content is written as a `buff`.
3. Sprite `1.jpg` needs a transparent-background re-export; until then the ant uses it with a white box.
4. Display names for the 30 units (owner will provide when renaming from SAP ids).
