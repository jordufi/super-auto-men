import { beforeEach, describe, expect, it } from 'vitest'
import { SAVE_VERSION, clearRun, loadRun, saveRun } from '../src/store/persist'
import { useRunStore } from '../src/store/runStore'

const save = { saveVersion: SAVE_VERSION, seed: 42, actions: [], opponents: [] }

describe('persist', () => {
  beforeEach(() => {
    localStorage.clear()
    useRunStore.getState().reset()
  })

  it('round-trips a save', () => {
    saveRun(save)
    expect(loadRun()).toEqual(save)
    clearRun()
    expect(loadRun()).toBeNull()
  })

  it('drops a save from another version or a corrupt one', () => {
    saveRun({ ...save, saveVersion: 99 })
    expect(loadRun()).toBeNull()
    localStorage.setItem('sam.run.v1', 'not json')
    expect(loadRun()).toBeNull()
  })
})

describe('runStore persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    useRunStore.getState().reset()
  })

  it('a played run is restored exactly by continueRun', () => {
    const store = useRunStore.getState()
    store.startRun(42)
    store.dispatch({ t: 'buyUnit', shopIndex: 0, slot: 0 })
    store.dispatch({ t: 'roll' })
    store.endTurn()
    const played = JSON.stringify(useRunStore.getState().state)

    useRunStore.setState({ run: null, state: null }) // as if the tab had been closed
    expect(useRunStore.getState().continueRun()).toBe(true)
    expect(JSON.stringify(useRunStore.getState().state)).toBe(played)
  })

  it('only the seed, the actions and the opponents are stored', () => {
    const store = useRunStore.getState()
    store.startRun(7)
    store.dispatch({ t: 'buyUnit', shopIndex: 0, slot: 0 })
    store.endTurn()
    const saved = loadRun()!
    expect(Object.keys(saved).sort()).toEqual(['actions', 'opponents', 'saveVersion', 'seed'])
    expect(saved.actions.map((a) => a.t)).toEqual(['buyUnit', 'endTurn'])
    expect(saved.opponents).toHaveLength(1)
  })

  it('continueRun is false with no save, and reset clears the save', () => {
    expect(useRunStore.getState().continueRun()).toBe(false)
    useRunStore.getState().startRun(1)
    expect(loadRun()).not.toBeNull()
    useRunStore.getState().reset()
    expect(loadRun()).toBeNull()
  })

  it('the same opponent is fought on replay as in the played run', () => {
    const store = useRunStore.getState()
    store.startRun(3)
    store.endTurn()
    const opponent = JSON.stringify(useRunStore.getState().run!.opponents)
    useRunStore.getState().continueRun()
    expect(JSON.stringify(useRunStore.getState().run!.opponents)).toBe(opponent)
  })
})
