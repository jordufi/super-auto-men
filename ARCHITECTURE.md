# Architecture — Super Auto Men

> **Status:** design locked, not yet implemented.
> **Stack:** TypeScript monorepo · pure sim core · React + Vite (DOM rendering) · Capacitor shell · Supabase backend.
> **Targets:** Web (playtest) → Android → iOS.
> **Dev machine:** Windows. No Mac required for daily work.

---

## 0. Version policy

Every version number in this document is **indicative, not verified**. Pin actual versions at install time and record them in `package.json`. Where this document and reality disagree, reality wins — update this file in the same commit.

---

## 1. What this game is, and why the architecture follows

Super Auto Men is an auto-battler. There is **no game loop, no physics, no real-time input, no scrolling world**.

The loop is:

```
shop phase  →  battle phase  →  repeat ~10 turns  →  win or lose the run
(drag units,    (deterministic
 buy, sell,      simulation,
 roll, freeze)   replayed as animation)
```

Three consequences drive the entire architecture:

1. **The game is a rules engine, not a renderer.** ~100 units each with a triggered ability, interacting combinatorially. This is where the bugs are and where the effort goes.
2. **The battle is fully deterministic.** Given two teams and a seed, the outcome is fixed. Nothing about it needs to be live.
3. **PvP is asynchronous.** You fight stored snapshots ("ghosts") of other players' teams. There is no realtime networking anywhere in this project.

Therefore the center of gravity is a **pure, headless, dependency-free TypeScript package** that knows the rules and nothing else. Rendering and platform packaging are thin, swappable, late-bound decisions layered on top.

### Why DOM/CSS rendering instead of a canvas engine

Twelve sprites, fixed positions, no scrolling, no particles beyond popups. CSS transforms are GPU-composited and hold 60fps on mid-range Android in a modern WebView at this scale.

The decisive argument is not performance, it is **inspectability**. A DOM tree can be queried, asserted on, and screenshotted by Playwright. A canvas is an opaque rectangle to every tool in the project. Since this codebase is written primarily by an LLM agent, the agent's ability to *see and verify its own work* outranks raw rendering throughput — which we do not need anyway.

**Revisit this decision only if** the week-1 performance spike (§12, M0) janks on real low-end hardware. The escape hatch is documented in §13.

---

## 2. Core principles

These are non-negotiable. Every one of them exists to keep the project verifiable without a human playing it.

| # | Principle | Consequence if violated |
|---|---|---|
| P1 | The sim is a pure function. It never imports from `app`, never touches the DOM, never does I/O. | Renderer and logic rot together; no server-side validation possible. |
| P2 | All randomness comes from a seeded PRNG passed explicitly. `Math.random()` and `Date.now()` are banned in `sim` and `content`. | Replays break, golden tests become flaky, cheating is undetectable. |
| P3 | The sim emits an event log. The UI plays the log back and computes nothing. | Logic leaks into components; animation bugs become gameplay bugs. |
| P4 | Content is declarative data validated at build time. | Unit #87 crashes on turn 7 instead of failing `npm run build`. |
| P5 | Triggers resolve through an explicit priority queue, never recursion. | Ability ordering becomes unfixable — the classic auto-battler death spiral. |
| P6 | Every rules change ships with a golden test. | Regressions land silently and are discovered by players. |

---

## 3. Repository layout

npm workspaces monorepo. Three packages with a strict one-way dependency graph:

```
content  →  sim              (content defines data; sim interprets it)
app      →  sim, content
server   →  sim, content     (later; §8.5)
```

`sim` depends on nothing. Ever.

```
super-auto-men/
├─ ARCHITECTURE.md
├─ CLAUDE.md                     # agent conventions (§11)
├─ package.json                  # npm workspaces root
├─ tsconfig.base.json
│
├─ packages/
│  ├─ sim/                       # THE GAME. Pure TS, zero runtime deps.
│  │  ├─ src/
│  │  │  ├─ types.ts             # UnitInstance, Team, BattleState, BattleEvent
│  │  │  ├─ rng.ts               # seeded PRNG + helpers
│  │  │  ├─ battle.ts            # simulate(): the top-level entry point
│  │  │  ├─ queue.ts             # trigger priority queue
│  │  │  ├─ triggers.ts          # trigger dispatch + ordering rules
│  │  │  ├─ effects.ts           # the effect interpreter
│  │  │  ├─ targets.ts           # target selector resolution
│  │  │  ├─ shop.ts              # shop reducer (buy/sell/roll/freeze/reorder)
│  │  │  ├─ run.ts               # full-run state machine over turns
│  │  │  └─ index.ts             # public API surface — keep it small
│  │  ├─ tests/
│  │  │  ├─ golden/              # {teams, seed, expectedLog} fixtures
│  │  │  ├─ battle.test.ts
│  │  │  ├─ determinism.test.ts  # same seed twice → identical log
│  │  │  └─ shop.test.ts
│  │  └─ package.json
│  │
│  ├─ content/                   # the data table
│  │  ├─ src/
│  │  │  ├─ schema.ts            # zod schemas for UnitDef / FoodDef / Effect
│  │  │  ├─ units/               # one file per unit
│  │  │  │  ├─ ant.ts
│  │  │  │  └─ ...
│  │  │  ├─ foods/
│  │  │  ├─ custom.ts            # escape-hatch functions (§5.4)
│  │  │  ├─ registry.ts          # id → def, validated at import
│  │  │  └─ index.ts
│  │  ├─ tests/
│  │  │  └─ validate.test.ts     # every def parses; every id unique
│  │  └─ package.json
│  │
│  ├─ app/                       # React + Vite + Capacitor
│  │  ├─ src/
│  │  │  ├─ main.tsx
│  │  │  ├─ screens/             # ShopScreen, BattleScreen, MenuScreen, RunEndScreen
│  │  │  ├─ components/          # UnitCard, ShopSlot, TeamBoard, GoldCounter, ...
│  │  │  ├─ replay/              # BattleLog → animation timeline
│  │  │  ├─ store/               # zustand slices
│  │  │  ├─ net/                 # supabase client + queries
│  │  │  ├─ assets/              # sprites, audio
│  │  │  └─ styles/
│  │  ├─ public/
│  │  ├─ index.html
│  │  ├─ vite.config.ts
│  │  ├─ capacitor.config.ts
│  │  ├─ android/                # generated by Capacitor, committed
│  │  ├─ ios/                    # generated by Capacitor, committed
│  │  └─ package.json
│  │
│  └─ tools/
│     └─ simcli/                 # headless battle printer (§10.1)
│
├─ e2e/                          # Playwright specs + screenshot baselines
└─ .github/workflows/            # CI (§9)
```

---

## 4. The sim core

### 4.1 Core types

```ts
// packages/sim/src/types.ts

export type DefId = string          // content id, e.g. 'ant'
export type InstanceId = string     // runtime id, unique within a run

export interface UnitInstance {
  iid: InstanceId
  defId: DefId
  atk: number
  hp: number
  level: 1 | 2 | 3
  exp: number                       // 0-5, drives level
  perk?: DefId                      // held food item
  statuses: Status[]                // weak, poison, shield, ...
}

/** Fixed length 5. Index 0 is the FRONT (attacks first). null = empty slot. */
export type Slots = [
  UnitInstance | null, UnitInstance | null, UnitInstance | null,
  UnitInstance | null, UnitInstance | null,
]

export interface Team {
  name: string
  slots: Slots
}

export interface BattleState {
  teams: [Team, Team]
  turn: number                      // run turn number, for scaling abilities
  log: BattleEvent[]
  queue: PendingTrigger[]
}
```

### 4.2 Seeded RNG (P2)

```ts
// packages/sim/src/rng.ts

export interface Rng {
  next(): number                    // [0, 1)
  int(maxExclusive: number): number
  pick<T>(xs: readonly T[]): T
  shuffle<T>(xs: readonly T[]): T[]
}

/** mulberry32 — small, fast, good enough, and identical across platforms. */
export function makeRng(seed: number): Rng { /* ... */ }
```

The `Rng` is threaded explicitly through every function that needs it. It is never a module-level singleton — that would make partial replay impossible.

### 4.3 The battle: one pure function

```ts
// packages/sim/src/battle.ts

export function simulate(
  teamA: Team,
  teamB: Team,
  seed: number,
  turn: number,
): BattleLog
```

`BattleLog` is a flat array of events plus a result:

```ts
export type BattleEvent =
  | { t: 'startOfBattle' }
  | { t: 'ability';  source: InstanceId; trigger: Trigger }
  | { t: 'attack';   a: InstanceId; b: InstanceId; dmgToA: number; dmgToB: number }
  | { t: 'damage';   unit: InstanceId; amount: number; from?: InstanceId }
  | { t: 'buff';     unit: InstanceId; atk: number; hp: number; temporary: boolean }
  | { t: 'status';   unit: InstanceId; status: Status; applied: boolean }
  | { t: 'summon';   unit: UnitInstance; side: 0 | 1; position: number }
  | { t: 'faint';    unit: InstanceId; side: 0 | 1; position: number }
  | { t: 'end';      result: 'a' | 'b' | 'draw' }

export interface BattleLog {
  seed: number
  teams: [Team, Team]      // starting snapshot — makes the log self-contained
  events: BattleEvent[]
  result: 'a' | 'b' | 'draw'
}
```

**This type is the contract between game logic and presentation.** The UI's entire job is to turn this array into motion. It never asks the sim a question mid-animation.

A `BattleLog` is also a complete, self-contained bug report: `{seed, teams}` is ~200 bytes and reproduces any battle exactly.

### 4.4 Trigger resolution — the part that must not be got wrong (P5)

When an ability fires and causes further triggers, those are **appended to a queue**, not resolved by recursive call. The queue drains in a defined order.

```ts
// packages/sim/src/queue.ts

export interface PendingTrigger {
  source: InstanceId
  trigger: Trigger
  ctx: TriggerCtx        // who died, who was hurt, what was bought, ...
}

/**
 * Resolution order when several units respond to the same event:
 *   1. higher attack first
 *   2. tie -> lower board position (closer to front) first
 *   3. still tied -> the two teams alternate, starting with the team that owns
 *      the event source
 *
 * This ordering is a GAME RULE. It is not an implementation detail.
 * Any change to it must land with updated golden fixtures.
 */
export function drain(state: BattleState, rng: Rng): void
```

> **Note:** the tie-break rule above is the working assumption. Confirm it against real SAP behaviour during playtesting, then lock it with golden tests and update this section. Do not let it stay implicit in the code.

### 4.5 Triggers

```ts
export type Trigger =
  // shop phase
  | 'onBuy' | 'onSell' | 'onLevelUp' | 'onEatFood'
  | 'onStartOfTurn' | 'onEndOfTurn' | 'onShopRoll'
  // battle phase
  | 'onStartOfBattle' | 'onBeforeAttack' | 'onAfterAttack'
  | 'onHurt' | 'onFaint' | 'onKnockOut'
  | 'onFriendFaints' | 'onFriendSummoned' | 'onFriendAheadAttacks'
  | 'onEnemySummoned'
```

### 4.6 The shop, and the whole run, are also pure

```ts
// packages/sim/src/shop.ts

export type ShopAction =
  | { t: 'buyUnit';  shopIndex: number; slot: number }
  | { t: 'buyFood';  shopIndex: number; target: number }
  | { t: 'sell';     slot: number }
  | { t: 'reorder';  from: number; to: number }
  | { t: 'freeze';   shopIndex: number }
  | { t: 'roll' }
  | { t: 'endTurn' }

export function shopReducer(
  state: ShopState,
  action: ShopAction,
  rng: Rng,
): { state: ShopState; events: BattleEvent[] }
```

Because the shop is a seeded reducer, **an entire run is replayable from `{seed, actions[]}`**. That is worth stating plainly: it gives you free bug reproduction, free replay sharing, and server-side run validation later (§8.5) at no additional design cost.

---

## 5. Content: units as data

### 5.1 A unit definition

```ts
// packages/content/src/units/ant.ts
import type { UnitDef } from '../schema'

export const ant: UnitDef = {
  id: 'ant',
  name: 'Ant',
  tier: 1,
  base: { atk: 2, hp: 1 },
  sprite: 'ant',
  ability: {
    trigger: 'onFaint',
    text: 'Give a random friend +{atk}/+{hp}.',   // rendered in-game from the numbers below
    effect: {
      kind: 'buff',
      target: { kind: 'randomFriend', count: 1 },
      atk: [1, 2, 3],      // indexed by level — the level system, for free
      hp:  [1, 2, 3],
      temporary: false,
    },
  },
}
```

Level scaling is expressed as a 3-tuple on every numeric field. This removes an entire category of "level 2 does nothing" bugs and makes balance passes a matter of editing numbers.

### 5.2 The effect vocabulary

Keep it small. Every addition is a permanent maintenance cost.

```ts
export type Lvl3 = [number, number, number]

export type Effect =
  | { kind: 'buff';     target: Target; atk: Lvl3; hp: Lvl3; temporary: boolean }
  | { kind: 'damage';   target: Target; amount: Lvl3 }
  | { kind: 'heal';     target: Target; amount: Lvl3 }
  | { kind: 'summon';   defId: DefId; count: Lvl3; stats?: { atk: Lvl3; hp: Lvl3 } }
  | { kind: 'status';   target: Target; status: Status }
  | { kind: 'gold';     amount: Lvl3 }
  | { kind: 'shop';     op: 'discount' | 'extraSlot' | 'freeze'; amount: Lvl3 }
  | { kind: 'sequence'; effects: Effect[] }
  | { kind: 'custom';   fn: CustomFnId; args?: Record<string, unknown> }
```

### 5.3 Target selectors

```ts
export type Target =
  | { kind: 'self' }
  | { kind: 'triggerSource' }
  | { kind: 'ahead' | 'behind' | 'adjacent' }
  | { kind: 'frontFriend' | 'backFriend' }
  | { kind: 'randomFriend'; count: number; excludeSelf?: boolean }
  | { kind: 'allFriends' }
  | { kind: 'randomEnemy'; count: number }
  | { kind: 'allEnemies' }
  | { kind: 'frontEnemy' }
  | { kind: 'highestAtkEnemy' | 'lowestHpEnemy' | 'lowestHpFriend' }
```

`resolveTarget()` returns `UnitInstance[]` and is the **only** place that consumes RNG for targeting. Concentrating it there is what makes seeded replay reliable.

### 5.4 The interpreter

```ts
// packages/sim/src/effects.ts

export function apply(
  s: BattleState,
  e: Effect,
  ctx: TriggerCtx,
  rng: Rng,
): BattleEvent[] {
  switch (e.kind) {
    case 'buff': {
      const targets = resolveTarget(s, e.target, ctx, rng)
      const atk = e.atk[ctx.level - 1]
      const hp  = e.hp[ctx.level - 1]
      return targets.map(t => {
        t.atk += atk
        t.hp  += hp
        return { t: 'buff', unit: t.iid, atk, hp, temporary: e.temporary }
      })
    }

    case 'sequence':
      return e.effects.flatMap(sub => apply(s, sub, ctx, rng))

    case 'custom':
      return CUSTOM[e.fn](s, ctx, rng, e.args)

    // damage, heal, summon, status, gold, shop ...
  }
}
```

### 5.5 The escape hatch

Roughly 80% of units fit the declarative vocabulary. The remaining ~15–20 do something genuinely strange. Do not contort the DSL for them:

```ts
// packages/content/src/custom.ts

export const CUSTOM = {
  /** Swaps the atk/hp of the two frontmost units on both sides. */
  swapFrontStats: (s, ctx, rng) => { /* ... */ },
} satisfies Record<string, CustomFn>

export type CustomFnId = keyof typeof CUSTOM
```

Referenced from data as `{ kind: 'custom', fn: 'swapFrontStats' }`. Type-safe, discoverable, and — importantly — **still bundled code**, which matters for remote content updates (§8.4).

**Rule of thumb:** if you are about to add a third variant of an existing effect kind to serve one unit, use `custom` instead.

### 5.6 Build-time validation (P4)

`registry.ts` parses every definition through zod **at import time**. An invalid unit fails `npm run build`, not turn 7.

```ts
// packages/content/src/registry.ts
import { UnitDefSchema } from './schema'
import * as units from './units'

export const UNITS = Object.fromEntries(
  Object.values(units).map(u => {
    const parsed = UnitDefSchema.parse(u)          // throws loudly, with a path
    return [parsed.id, parsed]
  }),
)
```

`validate.test.ts` additionally asserts: ids unique, sprite files exist, `summon` targets reference real defs, `custom.fn` exists in `CUSTOM`, tier within 1–6.

---

## 6. The app layer

### 6.1 Rendering model

Plain React components with CSS transforms. No canvas, no scene graph, no game loop.

- **A unit is a `<div>`** with a background sprite, positioned by `transform: translate()`.
- **Animation is CSS/Motion**, driven by the replay timeline.
- **The board is CSS grid** — five fixed slots per side.
- **Damage numbers and buff popups** are absolutely-positioned elements with a keyframe animation and auto-removal.

Only ever animate `transform` and `opacity`. Animating `width`, `top`, or `left` forces layout and is where WebView jank actually comes from.

### 6.2 The replay player

The single most important component in `app`. It converts `BattleEvent[]` into a timed animation sequence.

```ts
// packages/app/src/replay/timeline.ts

interface Step {
  event: BattleEvent
  durationMs: number       // from a per-event-type table
  parallelWith?: number    // events that animate simultaneously
}

export function buildTimeline(log: BattleLog): Step[]
```

Requirements:

- **Skippable and speed-adjustable** (1x / 2x / instant). Players will want this by turn 5, and instant mode makes E2E tests fast.
- **Idempotent** — replaying the same log always renders the same thing.
- **State is derived** — the component holds "board state at step N", recomputed by folding events. It never mutates a shared game state.

### 6.3 Drag and drop

Five fixed slots. Hand-roll it with pointer events — a generic DnD library is more constraint than help here.

- `pointerdown` on a unit → lift (scale up, raise z-index, follow pointer)
- `pointermove` → hit-test against slot bounding boxes, show the drop indicator
- `pointerup` → dispatch `{t:'reorder'}` or `{t:'buyUnit'}` to the shop reducer

Use `setPointerCapture` and `touch-action: none` on draggables. Without the latter, mobile Safari will steal the gesture for scrolling and the drag will feel broken.

### 6.4 State management

Zustand, three slices:

| Slice | Holds |
|---|---|
| `runStore` | The authoritative `ShopState` / run state. Mutated **only** by dispatching through `shopReducer`. |
| `uiStore` | Selection, drag state, modals, animation speed. Never gameplay state. |
| `sessionStore` | Auth, profile, trophies, sync status. |

The boundary matters: if gameplay state is ever edited outside the reducer, replay and validation both break silently.

### 6.5 Sprite pipeline

**v1: one static PNG per unit.** All motion (idle bob, attack lunge, hurt shake, faint) is a CSS transform on that single sprite. This is how the reference game reads at a glance, it is a fraction of the art effort, and it removes the entire spritesheet toolchain from the critical path.

```
packages/app/src/assets/units/ant.png        # 512×512, transparent, trimmed
```

- Author at a single high resolution (512px) and scale down in CSS. Skip @1x/@2x/@3x variants until size becomes a real problem.
- Pixel art → `image-rendering: pixelated`.
- Vite fingerprints and inlines small assets automatically; no manual atlas needed at this scale.
- **If** frame animation is wanted later: Aseprite → spritesheet + JSON, played with a CSS `steps()` animation over `background-position`. Add this per-unit, never globally.

### 6.6 Audio

Howler.js, loaded lazily after the first user interaction (mobile browsers block autoplay). Keep a single sprite-sheet audio file for SFX. Music is optional and should sit behind a setting that defaults to off on mobile.

---

## 7. Determinism and the seed as a first-class citizen

The app accepts `?seed=<n>` and `?replay=<base64>` URL parameters in dev builds.

This is small to implement and disproportionately valuable: any bug — found by a player, by you, or by the agent — becomes reproducible by pasting a URL. It is also how Playwright drives deterministic screenshot tests (§10.3).

---

## 8. Backend (Supabase)

Deliberately minimal for v1. The game is fully playable offline; the backend adds identity, persistence, and ghosts.

### 8.1 Auth

Anonymous sign-in on first launch, upgradeable to email/OAuth later without losing progress. Never gate the first run behind a login screen.

### 8.2 Schema

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  trophies int not null default 0,
  created_at timestamptz not null default now()
);

-- Snapshots of player teams, used as asynchronous opponents.
create table ghosts (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users on delete cascade,
  turn int not null,               -- which turn this team existed at
  trophies int not null,           -- MMR bucket
  team jsonb not null,             -- serialized Team
  created_at timestamptz not null default now()
);
create index ghosts_matchmaking on ghosts (turn, trophies);

-- Optional: full run records for validation and replay sharing.
create table runs (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users on delete cascade,
  seed bigint not null,
  actions jsonb not null,          -- the full ShopAction[] — replays the run
  result text not null,
  created_at timestamptz not null default now()
);
```

RLS: players read any ghost, but insert/update only rows where `owner = auth.uid()`.

### 8.3 Ghost matchmaking

At the end of each shop phase the client uploads its team as a ghost and requests an opponent:

```sql
select * from ghosts
where turn = $1
  and trophies between $2 - 100 and $2 + 100
  and owner <> auth.uid()
order by random()
limit 1;
```

`order by random()` is fine at small scale and will need replacing once the table is large — swap to a random-offset-into-the-index approach then, not now.

**Cold start:** with no players there are no ghosts. Seed the table with 50–100 hand-built teams per turn bucket before launch. Plan for this; it is a launch-day problem that looks like a bug.

### 8.4 Remote content updates

Serve `content.json` from Supabase Storage with a version number. On boot the app fetches it, falls back to the bundled copy on failure, and caches locally.

**This can only tune data-driven definitions** — stats, numbers, which units exist, tier assignments. It cannot add units that need new `custom` functions, because those are code and must ship in a store build. Keep this distinction sharp: shipping executable code out-of-band is what actually violates store rules, and staying on the data side of the line is what buys you same-day balance patches without review.

### 8.5 Server-side validation (later)

Ship v1 **client-authoritative**. Cheating on a cosmetic-only asynchronous ladder is a problem worth having.

When it matters, the `sim` package runs unchanged in a Supabase Edge Function: replay `{seed, actions[]}` from the `runs` table and confirm the reported result. This is an afternoon of work precisely because P1 was respected from day one.

---

## 9. Build, shells, and CI

### 9.1 Web (daily driver)

```bash
npm run dev          # vite dev server — this is where 95% of development happens
npm run build        # tsc + vite build → packages/app/dist
```

The browser build is a first-class deliverable, not a side effect: it is how you playtest with friends (send a URL) and how the agent verifies its own work.

### 9.2 Android (from Windows, locally)

```bash
npm run build
npx cap sync android
npx cap open android          # Android Studio → run on device
```

Requires Android Studio + JDK on the Windows machine. Full local loop, no cloud needed.

### 9.3 iOS (from Windows, via CI)

Capacitor has no equivalent of Expo's EAS, so iOS builds go through a hosted macOS runner. Options, in order of likely fit:

1. **Codemagic** — has a free macOS tier; straightforward for Capacitor.
2. **GitHub Actions `macos-*` runners** — free for public repos; private repos are billed at a multiplier.
3. **Ionic Appflow** — first-party, generally the most expensive.

The runner checks out the repo, runs `npm ci && npm run build && npx cap sync ios`, then builds and signs the Xcode project and uploads to TestFlight.

**Costs to actually ship:** Apple Developer Program ~$99/yr, Google Play Console ~$25 one-time, plus macOS CI minutes beyond the free tier. Verify all three before committing — pricing and policy move.

> **Unverified, confirm early:** Google Play has historically required new *personal* developer accounts to run a closed test with a minimum number of testers over a minimum period before production release. If that still applies, it is a multi-week calendar dependency — check it in week 1, not the week you want to launch.

### 9.4 CI pipeline

```
on: pull_request
  → npm ci
  → npm run typecheck        (all packages)
  → npm run test             (vitest: sim + content)
  → npm run test:e2e         (playwright against the built web app)
  → npm run build

on: tag v*
  → the above, plus Android release build and the macOS iOS job
```

---

## 10. Testing — how the agent verifies itself

This section is the reason the project is buildable by prompting. Each layer gives the agent a way to check its work without a human looking at a screen.

### 10.1 The headless battle printer

Build this **first**, before any UI exists.

```bash
npm run sim -- --seed 42 --a ant,cricket,horse --b beaver,duck
```

```
Turn 3 · seed 42
  A: Ant 2/1 · Cricket 1/2 · Horse 2/1
  B: Beaver 2/2 · Duck 1/3

  [startOfBattle] Horse: give friend ahead +1 atk -> Cricket 2/2
  [attack] Ant(2/1) vs Beaver(2/2) -> Ant faints, Beaver 2/0 -> Beaver faints
  ...
  RESULT: A wins
```

A text-mode game the agent can run, read, and reason about. It closes the loop on the hardest part of the project with no graphics involved at all.

### 10.2 Golden tests (the safety net)

`packages/sim/tests/golden/*.json`, each holding `{teams, seed, turn, expectedEvents}`.

```bash
npm test                      # fails with a readable event-log diff
npm test -- --update-golden   # regenerate AFTER you have reviewed the diff
```

Workflow when changing rules: run tests → read the diff → confirm the change is intended → update goldens **in the same commit**. Never regenerate blind; the goldens are the only thing standing between you and silent balance drift.

Plus `determinism.test.ts`: run the same seed twice, assert byte-identical logs. This catches accidental `Math.random()` and iteration-order bugs immediately.

### 10.3 Visual verification

Playwright against the web build, with `?seed=` for determinism:

```ts
test('battle replay renders', async ({ page }) => {
  await page.goto('/?seed=42&screen=battle&speed=instant')
  await expect(page.getByTestId('battle-result')).toHaveText('Victory')
  await expect(page).toHaveScreenshot('battle-end.png')
})
```

The agent can take a screenshot and **look at it**. This is the single biggest reason this architecture was chosen over the alternatives.

### 10.4 What is not tested

Animation timing and feel. That is a human judgement call, made by playing the browser build. Accept it and do not build elaborate machinery to automate it.

---

## 11. Conventions for agent-driven development

Put these in `CLAUDE.md` too — this section is their rationale.

**Dependency direction is enforced, not suggested.** `sim` imports nothing. `content` imports only `sim` types. Neither ever imports from `app`. Add an ESLint `no-restricted-imports` rule.

**Ban nondeterminism at the lint level:**

```js
// packages/sim/.eslintrc — and content/
'no-restricted-globals': ['error',
  { name: 'Math.random', message: 'Use the injected Rng (P2).' },
  { name: 'Date',        message: 'The sim must be time-independent (P2).' },
]
```

**Adding a unit is exactly three things** — this is the shape of most prompts on this project:

1. `packages/content/src/units/<id>.ts`
2. one export line in `units/index.ts`
3. one golden test covering the ability

If a unit needs more than that, it needs a `custom` function — and that is a deliberate decision worth pausing on, not a shortcut.

**File size cap ~300 lines.** Past that, split. Long files are where agents lose the thread and start duplicating logic.

**One concept per PR.** "Add 10 tier-2 units" is a good change. "Add units and refactor the trigger queue" is two changes and will produce a diff nobody can review.

**When a rule is ambiguous, write it down here.** The tie-break ordering in §4.4 is the model: state the assumption explicitly, lock it with a test, and revise the document when playtesting corrects it.

---

## 12. Milestones

| | Milestone | Proves | Done when |
|---|---|---|---|
| **M0** | Sim core, 10 units, golden tests, CLI printer. **Plus:** a throwaway HTML page with 12 animated sprites, run on the worst real Android phone available. | The rules engine works headlessly, and DOM rendering is fast enough. | `npm run sim` prints a correct battle; the spike holds 60fps. |
| **M1** | Browser UI: shop, drag and drop, replay player, full 10-turn run vs a hardcoded opponent. | The game is playable. | You can complete a run in a browser and want to play again. |
| **M2** | Art pipeline + 30 units. | Content scales; the game has an identity. | 30 units playable with real sprites. |
| **M3** | Supabase: auth, cloud save, ghost upload and matchmaking. | Async PvP works. | Two devices fight each other's ghosts. |
| **M4** | Capacitor Android build on a physical device. | The shell works; perf holds under real conditions. | APK installed and played on a phone. |
| **M5** | iOS via macOS CI → TestFlight. | The Windows→iOS pipeline works end to end. | A TestFlight build installs on an iPhone. |
| **M6** | 60+ units, balance pass, seeded ghost pool, store submission. | Shippable. | Submitted. |

**M0 is deliberately doing double duty.** It builds the hardest part of the game *and* falsifies the riskiest assumption in the architecture (WebView rendering performance) in the same week. If the spike fails, you have lost days, not months, and §13 says where to go next.

---

## 13. Escape hatches

Written down in advance so that changing course is a decision rather than a crisis.

**If DOM rendering janks on low-end Android:** replace only the battle screen's rendering with PixiJS. The shop screen stays DOM. `sim`, `content`, the replay timeline, and all state are untouched — `BattleLog` is the boundary and it does not move.

**If Apple rejects the Capacitor shell under guideline 4.2:** migrate the shell to Expo + React Native. `sim` and `content` port with zero changes; React component logic and state port with moderate changes; CSS animation is the part that gets rewritten. Estimate weeks, not months — and this is precisely why P1 and P3 exist.

**If the effect DSL becomes unwieldy past ~60 units:** stop extending it and move new units to `custom` functions. The DSL earning its keep for 80% of content is a success, not a compromise; forcing it to 100% is how it becomes unreadable.

---

## 14. Open decisions

Resolve these before they block work; none of them block M0.

1. **Art style and canonical sprite resolution** — needed by M2.
2. **Rule fidelity** — is this a faithful clone with new art, or are the rules diverging? Affects how much reference playtesting is required. Answer before M1.
3. **Monetization** — cosmetics only, or something more? Affects whether server authority matters. Can wait until after M4.
4. **Google Play testing requirements** (§9.3) — verify in week 1 because it is a calendar dependency, not an engineering one.
5. **macOS CI provider** — decide by M4; do not discover the pricing at M5.
