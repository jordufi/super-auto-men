# @sam/app

The browser game: React + Vite on top of `@sam/sim` and `@sam/content`.

```
npm run dev            # from the repo root
npm run dev -- --host  # same, reachable from the phone on the same Wi-Fi
npm run test:e2e       # Playwright against the production build
```

## Art pipeline

One image per unit **and per food**, named after the **id** (`packages/content/src/units/<id>.ts`,
`packages/content/src/foods/<id>.ts`):

| | |
|---|---|
| Location | `src/assets/units/<id>.png` — foods live here too, despite the folder name |
| Formats | `.png`, `.webp`, `.jpg` (prefer PNG or WebP; JPG cannot be transparent) |
| Size | 512x512, or any square — 32x32 pixel art is fine and is what most of the roster uses |
| Background | transparent |
| Framing | trimmed, the character filling the square |
| Style | consistent across the roster (pixel art is fine — then *everything* is pixel art) |

The filename must match the id **exactly**, camelCase included: `cannedFood.png`, `meatBone.png`,
`zombieCricket.png`. Tokens (tier 0) need art too — they are summoned mid-battle.

Dropping the file in that folder is the whole job: `src/assets/units/index.ts` picks it up with
`import.meta.glob`, and `UnitSprite` uses it automatically. A unit with no file gets a coloured
tile with its first letter, so the game is playable long before the art is finished.

`npm run check-sprites` (also run by `prebuild`) lists the units that still have no art. It warns
today; once all 30 sprites exist, set `REQUIRE_ALL = true` in `scripts/check-sprites.ts` so a
missing sprite fails the build instead.

Sprites are rendered with `image-rendering: pixelated` (the `.sprite` class in `global.css`), so
pixel art stays crisp when the stage is scaled up.

### Current mapping

The roster uses the owner's own characters, so the id says which *slot* a sprite fills, not what it
depicts. Swapping any of them is just renaming a file — nothing in the code refers to these names.

| Source | Slot |
|---|---|
| `calamardo.webp` | sloth |
| `america.webp` | horse |
| `sonic.webp` | mosquito |
| `pato.webp` | otter |
| `dora.webp` | pig |
| `alcachofa.webp` | saladBowl |
| `onion-rings.webp` | cannedFood |
| `apple.png` | apple |
| `Portraits_*.png` (15 characters) | the tier 2 roster and half of tier 3 |
| `Portraits2_*.png` (the same 15, cooler palette) | the rest of tier 3, plus zombieCricket |
| `Dude_/Owlet_/Pink_Monster.png` | ram, dirtyRat, bee |

Known gaps, in `improvements.md`: six foods still have no art, five slots reuse a palette variant of
a character already on the board, and `ant.jpg` needs a transparent re-export (it renders in a white
box today).

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
