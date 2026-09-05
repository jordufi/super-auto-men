# Phase 6 — DOM rendering performance spike

Throwaway page that answers one question before any UI is built: **do 12 CSS-transformed sprites
with attack/hurt animations and floating damage numbers hold 60 fps on the owner's real Android
phone?** (ARCHITECTURE.md §1, §12 M0; PLAN.md Phase 6.)

Excluded from lint, typecheck and CI. Kept committed as evidence of the decision.

## How to run it

1. In the repo root: `npx vite --host`
2. Note the `Network:` URL Vite prints (e.g. `http://192.168.1.23:5173`).
3. On the phone (same Wi-Fi), open `http://<that-ip>:5173/spike/` in **Chrome**. Turn the phone to landscape.
4. Leave it for about a minute. The HUD in the corner shows the current fps, the minimum and the average over a 60 s sample (the first 2 s are ignored as warm-up).
5. Optional: repeat in Firefox for Android. Optional: open `chrome://inspect` on the PC with USB debugging to look at the Performance panel.

Chrome on the phone stands in for Capacitor's WebView, which is Chrome-based on Android.

## Decision gate

- average ≥ 55 fps **and** minimum ≥ 45 fps → **proceed with DOM rendering** (Phase 7).
- otherwise → stop and discuss. ARCHITECTURE.md §13 names PixiJS for the battle screen as the escape hatch.

## Result (measured 2026-09-05)

| | |
|---|---|
| Phone model | (owner to fill in) |
| Android version | (owner to fill in) |
| Chrome version | (owner to fill in) |
| Average fps (60 s) | 60 |
| Minimum fps | 60 |
| Visible jank? | no |
| Screenshot | not taken |
| **Verdict** | **proceed with DOM rendering** (Phase 7) |

Notes: current, minimum and average all read 60 fps for the full 60 s sample in Chrome on the phone over Wi-Fi. The gate (avg >= 55, min >= 45) is passed with margin; the PixiJS escape hatch is not needed.
