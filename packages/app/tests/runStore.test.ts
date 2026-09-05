import { beforeEach, describe, expect, it } from 'vitest'
import { useRunStore } from '../src/store/runStore'

const snapshot = (): string => JSON.stringify(useRunStore.getState().state)

describe('runStore', () => {
  beforeEach(() => useRunStore.getState().reset())

  it('startRun is deterministic for a seed', () => {
    useRunStore.getState().startRun(42)
    const first = snapshot()
    useRunStore.getState().startRun(42)
    expect(snapshot()).toBe(first)
  })

  it('different seeds give different shops', () => {
    useRunStore.getState().startRun(1)
    const a = snapshot()
    useRunStore.getState().startRun(2)
    expect(snapshot()).not.toBe(a)
  })

  it('an invalid action leaves the state untouched and counts as refused', () => {
    useRunStore.getState().startRun(42)
    const before = useRunStore.getState().state
    useRunStore.getState().dispatch({ t: 'buyUnit', shopIndex: 99, slot: 0 })
    expect(useRunStore.getState().state).toBe(before)
    expect(useRunStore.getState().refused).toBe(1)
  })

  it('buying a unit spends gold and fills the slot', () => {
    useRunStore.getState().startRun(42)
    useRunStore.getState().dispatch({ t: 'buyUnit', shopIndex: 0, slot: 0 })
    const s = useRunStore.getState().state!
    expect(s.gold).toBe(7)
    expect(s.team[0]).not.toBeNull()
  })

  it('a whole run can be played to the end through the store', () => {
    const store = useRunStore.getState()
    store.startRun(7)
    for (let guard = 0; guard < 60; guard++) {
      const s = useRunStore.getState().state!
      if (s.phase === 'won' || s.phase === 'lost') break
      // Buy the first shop unit into the first free slot, then fight.
      const free = s.team.findIndex((u) => u === null)
      if (free >= 0 && s.shop[0]?.kind === 'unit')
        store.dispatch({ t: 'buyUnit', shopIndex: 0, slot: free })
      store.endTurn()
    }
    const end = useRunStore.getState().state!
    expect(['won', 'lost']).toContain(end.phase)
    expect(end.trophies >= 10 || end.lives <= 0).toBe(true)
  })

  it('endTurn fights a bot and moves to the next turn', () => {
    useRunStore.getState().startRun(42)
    useRunStore.getState().dispatch({ t: 'buyUnit', shopIndex: 0, slot: 0 })
    useRunStore.getState().endTurn()
    const s = useRunStore.getState().state!
    expect(useRunStore.getState().lastBattle).not.toBeNull()
    expect(s.turn).toBe(2)
    expect(s.gold).toBe(10)
  })
})
