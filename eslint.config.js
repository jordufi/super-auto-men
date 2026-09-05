import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'

/** Globals and imports that would make the sim/content non-deterministic or impure (ARCHITECTURE.md P1, P2). */
const pureRules = {
  'no-restricted-globals': [
    'error',
    { name: 'Date', message: 'The sim must be time-independent (P2).' },
    { name: 'setTimeout', message: 'No timers in the sim (P1).' },
    { name: 'setInterval', message: 'No timers in the sim (P1).' },
    { name: 'fetch', message: 'No I/O in the sim (P1).' },
    { name: 'window', message: 'No DOM in the sim (P1).' },
    { name: 'document', message: 'No DOM in the sim (P1).' },
    { name: 'localStorage', message: 'No storage in the sim (P1).' },
  ],
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: 'Use the injected Rng (P2).' },
    { object: 'crypto', property: 'getRandomValues', message: 'Use the injected Rng (P2).' },
  ],
}

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', 'spike/**', '**/android/**', '**/ios/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    // sim depends on nothing: only relative imports allowed.
    files: ['packages/sim/**/*.ts'],
    rules: {
      ...pureRules,
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^[^.]',
              message:
                'sim must not import any package (ARCHITECTURE.md §3). Use relative imports only.',
            },
          ],
        },
      ],
    },
  },
  {
    // Tests inside sim may import vitest.
    files: ['packages/sim/tests/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@sam/*'],
              message: 'sim tests import sim via relative paths.',
            },
          ],
        },
      ],
    },
  },
  {
    // React rules for the app package only.
    files: ['packages/app/**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    // Only runStore may call sim mutators; everything else in the app reads state from the stores
    // (PLAN.md Phase 7 "Done when"). Type-only imports are fine anywhere.
    files: ['packages/app/src/**/*.{ts,tsx}'],
    ignores: ['packages/app/src/store/runStore.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@sam/sim',
              importNames: [
                'shopReducer',
                'startTurn',
                'simulate',
                'startRun',
                'applyAction',
                'endTurnAndBattle',
                'replayRun',
                'apply',
                'summonUnit',
                'killUnit',
                'dealDamage',
                'fire',
                'drain',
              ],
              message: 'Gameplay state changes only through store/runStore.ts (CLAUDE.md).',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    // content depends only on sim and zod.
    files: ['packages/content/**/*.ts'],
    rules: {
      ...pureRules,
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@sam/app*', '**/app/**', 'react', 'react-dom'],
              message: 'content must not import from app (ARCHITECTURE.md §3).',
            },
          ],
        },
      ],
    },
  },
)
