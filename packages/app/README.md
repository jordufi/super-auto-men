# @sam/app

The browser game: React + Vite on top of `@sam/sim` and `@sam/content`.

```
npm run dev            # from the repo root
npm run dev -- --host  # same, reachable from the phone on the same Wi-Fi
npm run test:e2e       # Playwright against the production build
```

## Art pipeline

One PNG per unit, named after the **unit id** (`packages/content/src/units/<id>.ts`):

| | |
|---|---|
| Location | `src/assets/units/<unitId>.png` |
| Size | 512x512 |
| Background | transparent |
| Framing | trimmed, the character filling the square |
| Style | consistent across the roster (pixel art is fine — then *everything* is pixel art) |

Dropping the file in that folder is the whole job: `src/assets/units/index.ts` picks it up with
`import.meta.glob`, and `UnitSprite` uses it automatically. A unit with no file gets a coloured
tile with its first letter, so the game is playable long before the art is finished.

`npm run check-sprites` (also run by `prebuild`) lists the units that still have no art. It warns
today; once all 30 sprites exist, set `REQUIRE_ALL = true` in `scripts/check-sprites.ts` so a
missing sprite fails the build instead.

Sprites are rendered with `image-rendering: pixelated`, so pixel art stays crisp when the stage
is scaled up.

## Layout

| Folder | What lives there |
|---|---|
| `src/screens` | one file per screen: menu, shop, battle, run end |
| `src/components` | presentational pieces (cards, board, bars, popups) |
| `src/store` | zustand stores; `runStore.ts` is the only module that calls sim mutators |
| `src/replay` | turning a `BattleLog` into an animation (pure fold + timeline + the player hook) |
| `src/dnd` | pointer-capture drag and drop; `hitTest.ts` is pure geometry |
| `src/net` | where opponents come from (bots today, Supabase ghosts in Phase 13) |
| `e2e` | Playwright specs |
