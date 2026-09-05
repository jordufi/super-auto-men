# Super Auto Men

An auto-battler in the style of Super Auto Pets: shop phase, deterministic battle, repeat ~10 turns, win or lose the run. Asynchronous PvP against stored "ghost" teams. Targets web first, then Android and iOS.

- [ARCHITECTURE.md](ARCHITECTURE.md) — the design and the reasons behind it.
- [PLAN.md](PLAN.md) — the phase-by-phase implementation plan, with tests and a human check per phase.
- [CLAUDE.md](CLAUDE.md) — conventions for agent-driven development.

## Stack

TypeScript npm-workspaces monorepo:

| Package | Purpose | Depends on |
|---|---|---|
| `packages/sim` | The game rules. Pure, headless, zero dependencies. | nothing |
| `packages/content` | Unit and food definitions as validated data. | `sim`, `zod` |
| `packages/app` | React + Vite UI, Capacitor shell (from Phase 7). | `sim`, `content` |
| `tools/simcli` | Headless battle printer (from Phase 2). | `sim`, `content` |

## Requirements

- Node.js 24 or newer (see `.node-version`)
- npm 11 or newer
- Windows, macOS or Linux. Development happens on Windows; no Mac is needed until iOS.

## Setup

```
git clone <repo-url>
cd super-auto-men
npm ci
```

## Everyday commands

```
npm run typecheck     # tsc --noEmit in every package
npm run lint          # eslint (enforces the purity rules on sim and content)
npm test              # vitest, all packages
npm run test:watch    # vitest in watch mode
npm run build         # build every package that has a build step
npm run format        # prettier
npm run sim -- --seed 42 --a ant,cricket,horse --b beaver,duck --turn 3   # print a battle
npm run sim -- run --script tools/simcli/examples/basic-run.json           # play a scripted run
npm run test:update-golden   # regenerate golden fixtures AFTER reviewing the diff
npm run dev           # the game in a browser (Vite dev server)
npm run preview       # serve the production build
npm run test:e2e      # Playwright: the drag-and-drop and tap flows
```

The gate before any change is considered done:

```
npm run typecheck && npm run lint && npm test
```

Commands that arrive in later phases (`npm run android:sync`) are listed in PLAN.md Appendix B.

## Playing it

```
npm run dev
```

Open the printed `Local:` URL. The game is **landscape only**: a portrait window shows a "Rotate your device" overlay. Everything is drawn inside a 1280x720 logical stage scaled to fit, so every device sees the same layout.

In the shop you can either **tap** or **drag**:

- tap a shop card, then a team slot, to buy it (or drag the card onto the slot)
- tap a team unit, then another slot, to reorder or merge (or drag it there)
- drag a team unit onto **Sell**, or select it and press Sell
- select a shop card and press **Freeze** to keep it through the next roll
- **Roll** costs 1 gold; **End turn** fights the bot for that turn

Dev-only URL parameters (also enabled in a build with `VITE_ALLOW_URL_PARAMS=1`):

| Parameter | Effect |
|---|---|
| `?seed=42` | start a run with that seed and go straight to the shop |
| `?screen=shop` | which screen to land on |
| `?speed=1\|2\|instant` | replay speed (used from Phase 10) |
| `?offline=1` | reserved for Phase 13 |

### On the phone

```
npm run dev -- --host
```

Open the `Network:` URL on a phone on the same Wi-Fi, in landscape.

### Playwright

The first run needs the browser once: `npx playwright install chromium`. After that `npm run test:e2e` starts the dev server on port 5174 by itself.

## Project status

Phases 0 to 9 of PLAN.md are complete: the headless rules engine (battle, triggers, effects, shop, whole runs) with golden tests and the CLI printer, plus a playable browser app — menu, shop screen, taps and drag-and-drop, bot opponents and text-only battle results. Phase 6 (the phone performance spike in `spike/`) passed at a flat 60 fps, so DOM rendering is confirmed. Next up is Phase 10, the animated battle screen that replays a `BattleLog`. See the phase map in PLAN.md §0.3.

## Layout

```
packages/sim/        pure rules engine
packages/content/    unit and food data
tools/               CLI tools
.github/workflows/   CI: typecheck, lint, test, build
packages/app/        React + Vite UI (src/screens, src/components, src/store, src/dnd, e2e/)
sprites/             raw art drops; copied into packages/app/src/assets/units/ named after the unit ids
```
