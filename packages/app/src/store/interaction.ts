// Pure tap-interaction rules (PLAN.md Phase 8 step 1). No state is changed here: the caller
// dispatches the returned action and applies the returned selection.
import type { ShopAction, ShopSlot, Slots } from '@sam/sim'
import type { Selection } from './uiStore'

export type Tap = { kind: 'shop'; index: number } | { kind: 'team'; slot: number }

export interface TapResult {
  action?: ShopAction
  selection: Selection
}

export function resolveTap(
  selected: Selection,
  tap: Tap,
  shop: readonly ShopSlot[],
  team: Slots,
): TapResult {
  if (tap.kind === 'shop') {
    const same = selected?.kind === 'shop' && selected.index === tap.index
    return { selection: same ? null : { kind: 'shop', index: tap.index } }
  }

  if (selected?.kind === 'shop') {
    const item = shop[selected.index]
    if (!item) return { selection: null }
    const action: ShopAction =
      item.kind === 'unit'
        ? { t: 'buyUnit', shopIndex: selected.index, slot: tap.slot }
        : { t: 'buyFood', shopIndex: selected.index, target: tap.slot }
    return { action, selection: null }
  }

  if (selected?.kind === 'team') {
    if (selected.slot === tap.slot) return { selection: null }
    return { action: { t: 'reorder', from: selected.slot, to: tap.slot }, selection: null }
  }

  return { selection: team[tap.slot] ? { kind: 'team', slot: tap.slot } : null }
}
