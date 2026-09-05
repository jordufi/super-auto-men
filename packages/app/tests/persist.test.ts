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
    expect(loadRun()).toEqual({ run: save, error: null })
    clearRun()
    expect(loadRun()).toEqual({ run: null, error: null })
  })

  it('drops a save from another version or a corrupt one, and says why', () => {
    saveRun({ ...save, saveVersion: 99 })
    const wrongVersion = loadRun()
    expect(wrongVersion.run).toBeNull()
    expect(wrongVersion.error).toMatch(/version/)

    localStorage.setItem('sam.run.v1', 'not json')
    const corrupt = loadRun()
    expect(corrupt.run).toBeNull()
    expect(corrupt.error).toMatch(/JSON/)
  })

  it('rejects a save whose opponent team the sim could not survive', () => {
    // The crash vector: `content.getUnit` throws on an unknown id, so an edited save (or, from
    // Phase 13, a hostile ghost) must never reach the sim.
    const bad = {
      ...save,
      opponents: [{ name: 'Bot', slots: [{ iid: 'x', defId: 'notAUnit', atk: 1, hp: 1, level: 1, exp: 0, tmpAtk: 0, tmpHp: 0, statuses: [] }, null, null, null, null] }],
    }
    localStorage.setItem('sam.run.v1', JSON.stringify(bad))
    const r = loadRun()
    expect(r.run).toBeNull()
    expect(r.error).toMatch(/opponent team/)
    expect(localStorage.getItem('sam.run.v1')).toBeNull() // and it is not left behind to fail again
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
    const saved = loadRun().run!
    expect(Object.keys(saved).sort()).toEqual(['actions', 'opponents', 'saveVersion', 'seed'])
    expect(saved.actions.map((a) => a.t)).toEqual(['buyUnit', 'endTurn'])
    expect(saved.opponents).toHaveLength(1)
  })

  it('continueRun is false with no save, and reset clears the save', () => {
    expect(useRunStore.getState().continueRun()).toBe(false)
    useRunStore.getState().startRun(1)
    expect(loadRun().run).not.toBeNull()
    useRunStore.getState().reset()
    expect(loadRun().run).toBeNull()
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
