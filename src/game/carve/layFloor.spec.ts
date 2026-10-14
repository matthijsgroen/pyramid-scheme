import { describe, expect, it } from "vitest"
import { BINDING, mirrorForkLock } from "../testSupport/lockFixtures"
import { freshState, plainFloor, prepOf } from "./carveFixtures"
import { layFloor } from "./layFloor"

describe("layFloor", () => {
  it("lays nothing on a floor without a lock, and leaves the grid to the rung", () => {
    const state = freshState(prepOf(plainFloor()))
    expect(layFloor(prepOf(plainFloor()), state)).toBeUndefined()
    expect(state.lay).toBeNull()
    expect(state.laidN).toBeUndefined()
  })

  it("lays a lock floor's route and names the grid it grew to", () => {
    const prep = prepOf(
      plainFloor({ pathPuzzles: 0, difficulty: "expert", locks: [{ lock: mirrorForkLock() }], realisations: BINDING })
    )
    const state = freshState(prep)
    expect(layFloor(prep, state)).toBeUndefined()
    expect(state.lay?.laid.route.length).toBeGreaterThan(1)
    expect(state.laidN).toBe(state.lay?.laid.n)
    expect(state.laidN).toBeGreaterThanOrEqual(state.rung.n)
  })
})
