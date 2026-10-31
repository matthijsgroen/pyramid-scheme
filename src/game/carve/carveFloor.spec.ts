import { describe, expect, it } from "vitest"
import type { FloorConfig, FloorGrid } from "../siteTypes"
import { carveFloor } from "./carveFloor"
import { LATTICE_ENGINE, type Engine } from "./engines"
import { prepareFloor } from "./prepareFloor"
import { pass } from "./state"
import type { CarveState, Finish, Rung } from "./state"

const prep = (() => {
  const config: FloorConfig = {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [],
  }
  const result = prepareFloor("site", config, 1)
  if (!result.ok) throw new Error(JSON.stringify(result.reasons))
  return result.prep
})()

const grid = { rows: 1, cols: 1 } as FloorGrid
const engineOf = (passes: Engine["passes"], finish: Finish): Engine => ({ ...LATTICE_ENGINE, passes, finish })
const refuse: Finish = () => ({ retry: [] })

describe("the attempt loop", () => {
  it("hands back the grid of the first attempt that finishes one", () => {
    const finishAtThree: Finish = (_, state) => (state.attempt === 3 ? grid : { retry: [] })
    expect(carveFloor(prep, engineOf([], finishAtThree))).toEqual({ success: true, grid, attempt: 3 })
  })

  it("names what the attempts came up short on once the budget is spent", () => {
    const short = pass("short", [], [], () => ({ retry: [{ type: "controlNotSeated", ids: ["lever"] }] }))
    expect(carveFloor(prep, engineOf([short], refuse))).toEqual({
      success: false,
      reasons: [{ type: "controlNotSeated", ids: ["lever"] }, { type: "layoutNotFound" }],
    })
  })

  it("ends the floor on a fatal refusal without taking another attempt", () => {
    const attempts: number[] = []
    const fatal = pass("fatal", ["attempt"], [], (_, state) => {
      attempts.push(state.attempt)
      return { fatal: [{ type: "duplicateCellSlot", slot: "x" }] }
    })
    expect(carveFloor(prep, engineOf([fatal], refuse))).toEqual({
      success: false,
      reasons: [{ type: "duplicateCellSlot", slot: "x" }],
    })
    expect(attempts).toEqual([0])
  })

  it("stops an attempt at the first pass that refuses", () => {
    const ran: string[] = []
    const first = pass("first", [], [], () => {
      ran.push("first")
      return { retry: [] }
    })
    const second = pass("second", [], [], () => void ran.push("second"))
    carveFloor({ ...prep, input: { ...prep.input, maxAttempts: 1 } }, engineOf([first, second], refuse))
    expect(ran).toEqual(["first"])
  })

  it("starts the next rung from the grid the lay grew to, even on an attempt that failed", () => {
    const rungs: Rung[] = []
    const lay = pass("lay", ["rung"], ["laidN"], (_, state) => {
      rungs.push(state.rung)
      state.laidN = 41
      return { retry: [] }
    })
    carveFloor({ ...prep, input: { ...prep.input, maxAttempts: 2 } }, engineOf([lay], refuse))
    expect(rungs[1].n).toBe(41)
  })

  it("gives every attempt a fresh state", () => {
    const seen: (keyof CarveState)[][] = []
    const look = pass("look", [], ["laidN"], (_, state) => {
      seen.push(Object.keys(state) as (keyof CarveState)[])
      state.laidN = 9
    })
    carveFloor({ ...prep, input: { ...prep.input, maxAttempts: 2 } }, engineOf([look], refuse))
    expect(seen).toEqual([
      ["attempt", "rung", "rand"],
      ["attempt", "rung", "rand"],
    ])
  })

  it("refuses to run a pass reading what no earlier pass wrote", () => {
    const reader = pass("reader", ["maze"], [], () => undefined)
    expect(() => carveFloor(prep, engineOf([reader], refuse))).toThrow("reader reads maze")
  })
})
