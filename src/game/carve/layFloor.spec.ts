import { describe, expect, it, vi } from "vitest"
import { leverLock } from "../testSupport/floorLockFixtures"
import { BINDING, mirrorForkLock } from "../testSupport/lockFixtures"
import { freshState, plainFloor, prepOf } from "./carveFixtures"
import { layFloor } from "./layFloor"

// Off by default, so every test but the one injecting it lays with the real fill.
const fault = vi.hoisted(() => ({ misplace: false }))
vi.mock("../laidFloor", async importOriginal => {
  const actual = await importOriginal<typeof import("../laidFloor")>()
  return {
    ...actual,
    fillLaidFloor: (...args: Parameters<typeof actual.fillLaidFloor>) => {
      const filled = actual.fillLaidFloor(...args)
      if (!fault.misplace || !("placed" in filled)) return filled
      const [floor, , demands] = args
      const assigned = demands.find(demand => demand.corridor !== undefined)!
      const corridor = new Set(floor.stretches.get(`corridor:${assigned.corridor}`))
      const elsewhere = [...floor.label.keys()].find(key => !corridor.has(key))!
      return {
        placed: filled.placed.map(place =>
          place.section === assigned.section ? { ...place, cells: [elsewhere, ...place.cells.slice(1)] } : place
        ),
      }
    },
  }
})

describe("layFloor", () => {
  it("lays nothing on a floor without a lock, and leaves the grid to the rung", () => {
    const state = freshState(prepOf(plainFloor()))
    expect(layFloor.run(prepOf(plainFloor()), state)).toBeUndefined()
    expect(state.lay).toBeNull()
    expect(state.laidN).toBe(state.rung.n)
  })

  it("lays a lock floor's route and names the grid it grew to", () => {
    const prep = prepOf(
      plainFloor({ pathPuzzles: 0, difficulty: "expert", locks: [{ lock: mirrorForkLock() }], realisations: BINDING })
    )
    const state = freshState(prep)
    expect(layFloor.run(prep, state)).toBeUndefined()
    expect(state.lay?.laid.route.length).toBeGreaterThan(1)
    expect(state.laidN).toBe(state.lay?.laid.n)
    expect(state.laidN).toBeGreaterThanOrEqual(state.rung.n)
  })

  it("an assigned section seated off its corridor refuses the attempt", () => {
    const prep = prepOf(
      plainFloor({
        pathPuzzles: 1,
        difficulty: "expert",
        locks: [{ lock: leverLock() }],
        realisations: BINDING,
        sideSections: [{ pathPuzzles: 1, difficulty: "expert", end: "treasure" }],
      })
    )
    expect(prep.sections.corridorAssignments).toHaveLength(1)
    expect(layFloor.run(prep, freshState(prep))).toBeUndefined()
    fault.misplace = true
    try {
      const state = freshState(prep)
      expect(layFloor.run(prep, state)).toEqual({ retry: [{ type: "contentNotLaid", kinds: ["puzzle", "reward"] }] })
      expect(state.lay).toBeUndefined()
    } finally {
      fault.misplace = false
    }
  })
})
