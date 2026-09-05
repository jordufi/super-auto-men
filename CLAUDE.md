# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project conventions (Super Auto Men)

Rationale lives in [ARCHITECTURE.md](ARCHITECTURE.md) §11. The phase-by-phase plan and the implementer rules live in [PLAN.md](PLAN.md) §0.1 — read them before starting any phase.

- **Dependency direction is enforced, not suggested.** `sim` imports nothing (relative imports only). `content` imports only `sim` types and `zod`. Neither ever imports from `app`. ESLint `no-restricted-imports` enforces this; do not disable it.
- **Nondeterminism is banned at the lint level** in `packages/sim` and `packages/content`: `Math.random`, `Date`, timers, `fetch`, `window`, `document`. All randomness comes from the injected `Rng`.
- **Gameplay state changes only through `shopReducer` / `simulate`.** No component, store, or helper mutates `UnitInstance`, `Team`, or `ShopState` directly.
- **Adding a unit is exactly three things:** `packages/content/src/units/<id>.ts`, one export line in `units/index.ts`, one golden fixture in `packages/content/tests/golden/` covering the ability (create it with `"expectedEvents": null`, run `npm run test:update-golden`, review the log, commit). If it needs more, it needs a `custom` function — a deliberate decision, not a shortcut. An ability that can only fire in the shop (onBuy, onSell, onStartOfTurn, onEndOfTurn, onEatFood, onFriendEatsFood) gets a case in `packages/content/tests/shop-abilities.test.ts` instead of a battle golden, because a battle fixture could never trigger it.
- **Golden tests are never regenerated blind.** Read the diff, confirm the change is intended, then run `npm run test:update-golden` and say in the commit which goldens changed and why.
- **File size cap ~300 lines.** Split before exceeding it.
- **One concept per PR.**
- **When a rule is ambiguous, write it down** in ARCHITECTURE.md or PLAN.md §1, then lock it with a test.
- **Run `npm run typecheck && npm run lint && npm test` before declaring any task done.** From Phase 11 on, also `npm run test:e2e`.
- Windows dev machine: use `cross-env` for env vars in npm scripts and forward slashes in paths.
