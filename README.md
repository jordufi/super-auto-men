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
```

The gate before any change is considered done:

```
npm run typecheck && npm run lint && npm test
```

Commands that arrive in later phases (`npm run sim`, `npm run dev`, `npm run test:e2e`, `npm run android:sync`) are listed in PLAN.md Appendix B.

## Project status

Phases 0 to 5 of PLAN.md are complete: the headless rules engine (battle, triggers, effects, shop, whole runs) with golden tests and the CLI printer. Phase 6 (the phone performance spike in `spike/`) passed at a flat 60 fps, so DOM rendering is confirmed. See the phase map in PLAN.md §0.3.

## Layout

```
packages/sim/        pure rules engine
packages/content/    unit and food data
tools/               CLI tools
.github/workflows/   CI: typecheck, lint, test, build
sprites/             raw art drops (moved into the app in Phase 7)
```
