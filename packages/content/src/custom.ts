import type { CustomFn } from '@sam/sim'

/**
 * Escape-hatch functions for units that do not fit the declarative effect vocabulary
 * (ARCHITECTURE.md §5.5). Referenced from data as `{ kind: 'custom', fn: '<key>' }`.
 * Empty until a unit needs one.
 */
export const CUSTOM = {} satisfies Record<string, CustomFn>

export type CustomFnId = keyof typeof CUSTOM
