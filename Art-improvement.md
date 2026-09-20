# Art Improvement Plan

Companion to [ARCHITECTURE.md](ARCHITECTURE.md) §6 and [PLAN.md](PLAN.md). Read
[CLAUDE.md](CLAUDE.md) first — the implementer rules apply here unchanged.

## Context

The game plays well but looks flat. The visuals are geometry, not art: the backdrop is procedurally
generated flat SVG (`Scenery.tsx` — a sky gradient, four blob clouds, two triangle mountain ranges,
a row of ellipse canopies, five solid-fill bands) and the UI is white pills and grey rounded
rectangles. Nothing has material, depth or light.

The target is a painted scene with real depth, carved wood and parchment chrome, and buttons that
feel physical.

## Status

PRs 1-8 are done. PR 9 (phone perf pass) is only partly done: see "Performance" below.

Deviations from the plan as written:

- **Battle backdrop is a composite.** The generated `B.jpg` had a banner, a text card and a
  washed-out band baked into rows 172-327. `art/build-scene-assets.py` takes `A.jpg` above row 328
  and `B.jpg`'s arena below it, feathered. Regenerating B cleanly would let that step go.
- **`F.jpg` came back as a JPG on white**, so the script keys the white out into real alpha.
- **The foreground layer is 200 KB**, over the 120 KB per-layer target; the six assets total
  358 KB, inside the 400 KB budget.
- **Font lives in `src/assets/fonts/`**, not `public/fonts/`, so Vite fingerprints it and it
  survives the Capacitor `base: './'` switch. No preload link for the same reason.
- **The UI kit is CSS classes plus 9-slice SVG ribbons**, not a set of React components. Restyling
  `.big-btn`, `.hud-pill`, `.sign`, `.ability-card` etc. left every call site unchanged.
  Ribbons, medallions and the VS crest are `ribbon` / `medallion` / `crest` classes.
- **No `?screen=styleguide` gallery, no "round" plank**; the real screens were reviewed directly.
- **The battle board moved from `top: 380` to `BATTLE_TOP = 440`** so units stand on the arena
  floor of the painted scene. Locked in `tests/scene.test.ts`.
- **Opponents carry no names**, so the battle header says YOU / RIVAL instead of inventing data.
- **PR 8 shipped reduced motion, not parallax or drift.** `?motion=reduced` and the OS setting both
  set `data-motion="reduced"` on the stage (`useMotion`), which shortens event animations to 1ms
  and hides projectiles, never touching the replay clock (`e2e/scene.spec.ts` proves a battle
  still finishes). The foreground sway was built, then removed: an infinite full-screen animation
  is the one piece of ambient motion that could plausibly cost a low-end phone, and it was never
  worth that. Foreground parallax on battle steps and safe-area insets are not done.
- **Known, pre-existing:** at the 4:3 minimum stage width (1000) a 5-unit army is clipped at the
  screen edge. Not caused by this work.

## Scope

| In | Out (deferred) |
|---|---|
| Background art and the layer system that renders it | Unit sprite replacement |
| Ornate UI: banners, planks, medallions, coins, parchment cards | The cast / naming |
| Buttons | Idle bob and other per-unit life |
| Typography and the token system underneath both | Rim light and environment tint on sprites |
| **Contact shadows under units** — see below | |

Contact shadows are the one borderline item and they are in deliberately. A flat sprite standing on
flat ground is coherent; the same sprite standing on *painted* ground with no shadow looks broken.
Grounding is part of the background landing well, not part of the sprite work.

## What is actually wrong

1. **The intended font has never loaded.** `packages/app/src/styles/global.css:36` declares
   `font-family: 'Baloo 2', 'Comic Sans MS', …` and there is no `@font-face`, no font link and no
   font file anywhere in the repo. On Windows every word in the game renders in **Comic Sans MS**;
   on Android it falls to `system-ui`. Nobody has ever seen the intended typeface. This is the
   largest perceived change per line of diff in the whole plan.

2. **The backdrop has no depth cues.** Every element in `Scenery.tsx` is a solid fill — no haze, no
   foreground occluders, no vignette, no light direction, no texture.

3. **Nothing sits in the world.** The only shadow in the app is
   `drop-shadow(0 3px 0 rgba(0,0,0,0.18))` on `.unit-sprite-wrap` — a hard offset, not a contact
   shadow. Units float over a grey `.slab`.

4. **There is no colour system.** `:root` holds two stacked palettes, ~15 more hexes are hardcoded
   inside `Scenery.tsx`, and six components carry one-off literals. There is no spacing, radius,
   stroke, shadow, z-index or type scale at all — `3px solid var(--ink)` alone is written out 14+
   times. The last two commits are literally "scale up the text" done by hand in inline styles.

5. **Emoji stand in for icons.** `❤️ ⏳ 🏆 🪙 🎲 💰 ❄ ⚔` render in the platform emoji font — a
   different art style on every OS, and the only thing on screen that cannot be art-directed.

Not wrong, and preserved: the adaptive `Stage` (fixed 720 logical px tall, width clamped 1000–1800,
CSS-scaled) and the transform/opacity-only animation rule.

---

## Part 1 — Prompts for the image generator

Written against the real layout geometry. The stage is **720 logical px tall** and its width varies
**1000–1800** with device aspect ratio, so scenes are generated ultrawide and center-cropped on
narrower devices.

### Rules applying to every scene prompt

| Rule | Value | Why |
|---|---|---|
| Aspect ratio | **2.5:1** preferred (2560×1024). 21:9 acceptable. | 1800 ÷ 720 = 2.5 is the widest stage we ever render. |
| Safe area | Everything that matters lives in the **center 16:9**. | A 4:3 phone crops to the center 55%. The outer bands are extension only. |
| Baked vignette | **None.** | Cropping is off-center, so a baked vignette would land crooked. Added in CSS, where it is tunable. |
| Light direction | **Warm sun upper left, cool blue-violet shadows.** Identical in every scene. | Contact shadows and haze are coded to one `--sun-dir` token. One inconsistent scene breaks the illusion everywhere. |
| Lane detail | Bands where units stand must be **low detail, low contrast**. | Sprites and cards sit on top. Busy ground destroys their read. |

### Shared style preamble — prepend to A, B and C

> Hand-painted 2D game background for a premium mobile storybook game. Digital painting with soft
> airbrushed shading over clean cel-shaped forms. Warm saturated palette, gentle rim light, slight
> atmospheric haze toward the horizon. Whimsical and inviting. Painterly, not photoreal, not pixel
> art, no black outlines on landscape forms.
>
> Negative: no characters, no animals, no people, no text, no letters, no numbers, no logos, no
> watermark, no UI, no buttons, no frames, no border, no vignette, no edge darkening, no lens flare.

### Prompt A — Shop backdrop (two unit rows)

```
[STYLE PREAMBLE]

Ultrawide 2.5:1 landscape. A sunlit forest clearing, composed in horizontal bands (percentages
are of image height, top to bottom):

0-20%    Open blue sky with soft rounded clouds. The brightest area of the image. Calm and
         uncluttered.
20-36%   Distant blue-hazed mountains, then a soft rounded treeline of full deciduous canopies.
36-62%   A wide flat clearing of warm packed earth and short grass, gently sunlit. Very low
         detail, very low contrast: no rocks, no flowers, no paths, no logs in this band.
62-66%   A narrow band of bright green grass with soft tufts, separating the two clearings.
66-88%   A second wide flat clearing of warm packed earth matching the first. Again very low
         detail, empty and quiet.
88-100%  Foreground grass and a few soft ferns, slightly darker and cooler than the clearings.

Framing: tall trees and hanging foliage enter from the extreme left and right edges, occupying
only the outer 15% of the width, darker and cooler than the midground. The center two thirds of
the image stays open.
```

### Prompt B — Battle backdrop (one wide row, card floats in the upper third)

```
[STYLE PREAMBLE]

Ultrawide 2.5:1 landscape. A forest battle clearing, composed in horizontal bands:

0-22%    Open blue sky with soft rounded clouds, brightest at the upper left. Very calm and
         uncluttered: a gold banner sits over this band.
22-40%   Distant blue-hazed mountains and a soft rounded treeline. Muted and low contrast: a
         card of text floats over this band.
40-50%   Rolling midground grass sloping down toward the clearing, with a few soft bushes.
50-78%   A broad flat arena floor of warm packed earth with a faint worn circular track. Very
         low detail, very low contrast, empty and quiet.
78-100%  Foreground grass, ferns and two or three soft rounded rocks in the bottom corners,
         darker and cooler than the arena floor.

Framing: tall trees on the extreme left and right edges arching slightly inward at the top
corners, occupying only the outer 15% of the width, in near-silhouette. The center two thirds of
the image stays open.
```

### Prompt C — Title backdrop

```
[STYLE PREAMBLE]

Ultrawide 2.5:1 landscape. A golden-hour hero vista:

0-55%    A dramatic sky, warm gold near the horizon fading to deep blue at the top, with tall
         billowing clouds lit from the upper left. The exact horizontal center is a clean, calm
         value field with no cloud detail: a title sits there.
55-100%  Rolling green hills receding into haze, one large silhouetted tree on the left third,
         and a soft dirt path curving from the bottom center toward the horizon.

Framing: darker foreground grass and foliage across the bottom edge and creeping up both outer
edges. Richer and more saturated than the two gameplay backdrops.
```

### Prompts D and E — UI material swatches, 1024×1024

These fill the coded UI shapes, so they must be flat material with no lighting of their own.

```
D — A single flat swatch of aged golden oak wood, photographed straight-on from directly above.
Warm honey tone, visible but subtle grain, gentle wear. Even flat lighting, no shadows, no
highlights, no edges, no objects, no background, no perspective. Fills the entire frame.
```

```
E — A single flat swatch of weathered cream parchment, photographed straight-on from directly
above. Soft mottled texture, faint age spots, slightly warmer toward the center. Even flat
lighting, no shadows, no torn edges, no objects, no background, no perspective. Fills the
entire frame.
```

### Prompt F — optional, only if the generator does clean transparency

```
F — Foreground framing foliage on a fully transparent background. Dark, near-silhouette leaves
and hanging vines entering from the left and right edges and across the top corners, same
hand-painted style. Ultrawide 2.5:1. The entire center of the image is empty and fully
transparent. PNG with alpha.
```

Worth trying. It is the difference between a painted picture behind the board and a scene the board
sits *inside* — it is the only layer that can parallax against the rest. If the generator can't do
it cleanly we approximate with a CSS vignette and lose some depth.

### Where the files go

Raw drops land in `art/` as `shop.png`, `battle.png`, `menu.png`, `wood.png`, `parchment.png` and
optionally `foreground.png`. Cropping, resizing and WebP conversion happen on the way into
`packages/app/src/assets/scene/`. `art/` stays the raw source folder, the same relationship
`sprites/` already has with `src/assets/units/`.

---

## Part 2 — How the art gets assembled

### One art-directed image per screen, not tiling bands

The alternative was generating seamlessly-tileable band strips (mountains, treeline, grass) and
repeating them horizontally. That is technically cleaner at extreme widths, but image generators are
unreliable at seamless tiles and it would take five prompts per screen to get one composition. One
wide, deliberately composed image is what actually matches the reference art, and the safe-area rule
above is what makes the crop safe. Depth is bought back with the sky gradient and the optional
transparent foreground layer, which is enough — the performance budget caps drifting layers at two
regardless.

Layer stack, back to front:

| Layer | Source | Notes |
|---|---|---|
| Sky | CSS `linear-gradient` | Zero bytes, never stretches, tokenised so a dusk palette is one selector later |
| Scene | Prompt A/B/C, `object-fit: cover`, centered | The art |
| Haze + light rays | CSS gradients with alpha | No `blur()` — see invariants |
| Vignette | CSS radial gradient | In CSS so it stays centered under any crop |
| Foreground | Prompt F, over-wide, `pointer-events: none` | The parallax layer, if we get it |

### The rule that shapes the whole build: one transform job per element

An element cannot own two transforms. A `transition` on `transform` is silently discarded if a
keyframe animation also targets it, and two `animation-name`s on one element do not compose — the
last one wins outright and the other vanishes. So every independent motion gets its own nesting
level:

```
.unit           ← layout only. NEVER transformed. This is the measurement anchor.
  .unit-ground  ← contact shadow: owns its own transform (shrinks on landing, does NOT shake)
  .unit-body    ← the only element the classFor() state classes animate
    .unit-art   ← facing flip (scaleX(-1))
```

`classFor()` in `packages/app/src/components/BattleBoard.tsx:26-34` does not change at all — its
class string stays on the same div, that div just stops being the animated one. The CSS selectors
gain one descendant step:

```css
.battle-unit[data-side='0'].attacking .unit-body   { animation: lungeRight … }
.battle-unit.attacking                .unit-shadow { animation: shadowLunge … }
.battle-unit.hurt                     .unit-body   { animation: hurtShake … }
/* .hurt .unit-shadow: nothing. The ground does not shake. */
```

The shadow is a `radial-gradient` ellipse, not `filter: blur()` and not `box-shadow` — a gradient is
one cheap paint; a blur is a separate render target per element and ten of those is exactly the jank
the DOM-rendering bet in ARCHITECTURE.md §6.1 was made against.

`.slab` is currently rendered independently by `BattleBoard`, `TeamBoard` and `ShopRow`. It gets
extracted to one `UnitGround` component or the shop and the battle diverge on the first tweak. In
battle the slab goes away entirely (units stand on ground with a shadow); in the shop it stays,
repainted as a stone ring, because `TeamBoard.tsx:42-48` uses the bare slab as the empty-slot
affordance.

### Materials, not pictures, for the UI

Frames and banners are **coded SVG geometry filled with the generated wood/parchment textures**.
Geometry stays crisp at every stage width, recolours for free and needs no alpha from the generator;
the texture supplies the material; carved depth comes from one shared SVG filter (inner shadow +
bevel highlight) defined once and referenced by every piece.

| Component | Used for |
|---|---|
| `Ribbon` — scroll banner with rolled ends | team names, battle narration |
| `Plank` — wooden plaque on a driven stake | lane signs, `Lv.` badges, round indicator |
| `Medallion` — gold-ringed disc | player portraits, the VS crest |
| `Coin` — metal-rimmed disc | gold, attack, shop prices |
| `Heart` — shaped badge | health, lives |
| `Parchment` — aged card with a wooden edge | ability card and tooltip |
| `CarvedButton` — wooden face, carved text, collapsing bevel | every button |

The eight emoji become SVG icons drawn to the same palette.

---

## Part 3 — Phases

One concept per PR, each independently shippable and visibly better than the last.

**PR 1 — Font loading and the type scale.**
Self-host Baloo 2 as WOFF2 (Latin subset, weights 600 + 800) in `packages/app/public/fonts/` —
which does not exist yet — with `font-display: swap` and a `<link rel=preload as=font crossorigin>`.
Not Google Fonts: a bundled Capacitor app has no network guarantee. Add the type scale tokens.
First because it is the biggest perceived change per line of diff, carries no structural risk, and
every later typography decision depends on the real font's metrics.
*Verify:* `npm run build && npm run preview`, Network shows the woff2. Watch the `shop-dnd`
tooltip-edge e2e test — a wider real font could push a tooltip off-stage, and that test will say so.

**PR 2 — Design tokens. Explicitly no visual change.**
New `styles/tokens.css` in three tiers: primitive (`--c-wood-400`) → semantic (`--surface-wood`) →
component. Scales for space, radius, stroke, elevation, z-index, type and motion. Pull `Scenery`'s
15 hexes and the six magic z-indexes in. Units stay **`px`, never `rem`** — the whole stage is CSS
`scale()`d and `rem` would break the logical-pixel contract `useDrag`, `hitTest` and `Projectiles`
all depend on.
Delete only the 4 genuinely unreferenced tokens (`--panel`, `--atk`, `--hp`, `--accent`). The other
five legacy dark tokens are load-bearing via the `button {}` reset at `global.css:48` — mention,
don't remove.
*Verify:* a before/after screenshot pair of the shop at 1280×720 that should be pixel-identical.

**PR 3 — Unit transform hierarchy and contact shadows.**
`BattleBoard.tsx`, `UnitCard.tsx`, new `UnitGround.tsx`, keyframes move out of `global.css` into
`styles/motion.css`. Remove the blanket `will-change: transform` on `.battle-unit` (it permanently
promotes ten layers and is on the wrong element under the new hierarchy) and the
`.unit-sprite-wrap` drop-shadow.
Must land before the backdrop, because the backdrop is what makes ungrounded sprites look wrong.
*Verify:* `?screen=battle&speed=manual`, step through, confirm the shadow neither shakes on `hurt`
nor lunges 1:1 with the body. Full e2e.

**PR 4 — The painted backdrop.**
New `src/scene/` split: `lanes.ts` (the `LANE` constants, moved out of the art module), `layers.ts`
(the per-screen manifest), `Scenery.tsx`, `SceneLayer.tsx`, `Atmosphere.tsx`, plus
`styles/scene.css` and `assets/scene/*.webp`. `vite.config.ts` gets `assetsInlineLimit` as a
function excluding `assets/scene/**`.
Free win included: **hoist `<Scenery/>` into `App.tsx`**. It is currently mounted separately by all
four screens, so every screen change remounts the entire backdrop. Four deleted lines.
Ships **static** — no parallax yet, so the diff is art plus structure with nothing timing-related.
*Verify:* new `tests/lanes.test.ts` and `tests/layers.test.ts`; manually at 1024×768 and at 1800
wide, confirming no stretch and nothing important cropped.

**PR 5 — Ornate UI kit.**
`components/ui/` with the seven components, one shared SVG `<defs>` for filters and gradients, and
the eight SVG icons. Plus a dev-only `?screen=styleguide` gallery — `urlParams.ts` already has the
hook, and it is how this gets reviewed without clicking through a run.
*Verify:* the gallery, in the browser, at three stage widths.

**PR 6 — HUD and buttons.**
`TopBar` and `GoldCounter` → medallions and coins. `ActionBar` and the battle speed row →
`CarvedButton`. Lane signs → `Plank`. Fix the `button {}` reset, which currently paints any button
that forgets `.big-btn` in the dead dark theme.
*Verify:* tap targets unchanged, every testid intact, `e2e/shop-dnd.spec.ts` green.

**PR 7 — Screen composition.**
Battle: the ornate top ribbon with both team names and the VS crest, player medallions carrying
lives, round plank bottom-right, narration → `Ribbon`, ability card → `Parchment`, result overlay
reskinned. Shop: price coin, `Lv.` plank, drag-layer shadow, sell-zone treatment.
Last among the visual PRs deliberately — most opinion-dependent, least structural, and it benefits
from reacting against a finished backdrop and a real font.
*Verify:* `e2e/battle.spec.ts` and `e2e/full-run.spec.ts`; the latter's
`test-results/full-run-end.png` is a free look at the finished art.

**PR 8 — Motion policy, shipped with its off-switch.**
Foreground parallax on battle-step cues, slow cloud drift, button squash and overshoot easing,
screen transition, safe-area insets (`index.html` sets `viewport-fit=cover` but no
`env(safe-area-inset-*)` padding exists). `prefers-reduced-motion` **and** a `?motion=reduced` URL
param in the same PR, so the reduced path is never the untested path — Android WebView's
reduced-motion reporting is inconsistent and the param makes it deterministically testable.
*Verify:* new `e2e/scene.spec.ts` asserting `team-slot-0`'s bounding box is identical at
`motion=full` and `motion=reduced`.

**PR 9 — Perf pass on the phone.**
Extend `spike/index.html` (it already has an FPS HUD and is excluded from lint and CI). Gate:
**avg ≥ 55 fps, min ≥ 45 fps**, matching PLAN.md Phase 6. Record the layer count and total layer
memory from the Layers panel in `spike/README.md`.

---

## Invariants and traps

These are the things that will silently break if not written down.

- **`.unit` and `[data-drop-kind]` must never be transformed.** `Projectiles.tsx:35` measures
  `[data-testid="battle-unit-*"]` with `getBoundingClientRect()` and `hitTest.ts:39` measures the
  slot divs. Today it works by luck. Keep both transform-free and `Projectiles.tsx` needs zero
  changes; transform them and projectile endpoints jitter and `shop-dnd.spec.ts` goes flaky.
- **Every scene, atmosphere and foreground element gets `pointer-events: none`** — on the shared
  class, not per element. The foreground layer sits *above* the board, and `battle.spec.ts` clicks
  `next` sixty times.
- **Never change `MIN_W` / `MAX_W`.** If foreground foliage eats usable width, do it with a
  `--frame-inset` token consumed by screens. `stage.test.ts` is the gate that stops a gameplay
  layout change wearing an art costume.
- **Motion tokens are UI only.** Replay durations live in `replay/durations.ts` and drive
  `setTimeout`. Unifying them breaks the replay clock. Comment this in both files.
- **No `blur()`, no `backdrop-filter`.** `backdrop-filter` forces a readback of everything beneath
  it every composited frame and has known bugs interacting with an ancestor CSS `scale()` — which
  `.stage` always has.
- **WebP, not AVIF.** AVIF decode is much slower on mid-range ARM and runs on the main thread; a
  large band can cost 40–80ms, a visible hitch on screen change. On painted low-frequency artwork
  the size win is only ~15–20%.
- **Don't transition a registered custom property.** Flip the variable discretely and put the
  `transition` on each layer's own `transform`.

## Verification

Every PR: `npm run typecheck && npm run lint && npm test && npm run test:e2e`, then `npm run dev`
and a look at all four screens at three stage widths. `?seed=42&screen=battle&speed=instant` boots
straight into a fight.

Four small tests get added along the way, all pure: `lanes.test.ts` (four lines asserting
`LANE = { team: 275, shop: 465, height: 160 }` — the machine-checkable form of "screens don't
move"), `layers.test.ts` (manifest invariants, every asset key resolves), one e2e at **1800×720**
(`playwright.config.ts` pins 1280×720, so wide stages are never currently exercised), and
`e2e/scene.spec.ts`.

Explicitly **not** tested: keyframe values, easing, shadow opacity, or whether it looks good. No
screenshot baselines for the scenery — the art changes across six consecutive PRs and baselines
would be pure churn.

## Open items

- PRs 1, 2, 3 and 5 do not need the art and can start immediately. PR 4 needs prompts A/B/C
  returned; PR 5 needs D and E.
- `sonic.webp`, `calamardo.webp`, `dora.webp` and the Goku/Pikachu tiles in
  `packages/app/src/assets/units/` are recognizable third-party IP. Out of scope here, but it blocks
  shipping and should be tracked.

## Performance

What was measured, and what was not. Headless Chromium here uses software compositing and the
machine was busy, so frame timings were too noisy to conclude anything: the *previous* build also
stalled (5 of 8 runs had a >100ms frame; the new build 8 of 8, median 36 vs 55 fps), while a
Chrome trace of either showed no task over 40ms. Composited layers, which do not depend on timing,
were 14-21 for both builds against the budget of 24; the new build composites ~40% more pixels
(6.9 vs 4.9 Mpx), i.e. the foreground and light layers.

Changes made because of it, which cost nothing visually: glow and vignette are one layer, not two,
and there is no infinite full-screen animation.

**Still to do:** the gate in PLAN.md Phase 6 (avg >= 55 fps, min >= 45) has not been run on a real
phone. Do that through `chrome://inspect` with the Layers and Performance panels, and record the
result in `spike/README.md`. If it fails, the first things to cut are the foreground layer
(200 KB, full-screen, alpha) and then the parchment `box-shadow` blurs on the HUD.
