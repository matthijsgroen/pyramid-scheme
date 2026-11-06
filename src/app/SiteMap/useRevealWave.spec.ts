import { describe, expect, it } from "vitest"
import type { Direction, GridCell } from "@/game/siteTypes"
import { floorFrom } from "./floorFixtures.testing"
import { REVEAL_STEP_MS, revealWave } from "./useRevealWave"

const hidden = (dirs: Direction[]): GridCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state: "reachable",
  hidden: true,
})

describe("a corridor coming out of the rock", () => {
  it("runs out step by step from the floor already seen", () => {
    const grid = floorFrom(["E..Rhhh"], { h: hidden })
    const before = new Set(["0,0", "0,1", "0,2", "0,3"])
    const delays = Object.fromEntries(revealWave(before, grid).map(({ at, delay }) => [at.join(","), delay]))
    expect(delays).toEqual({ "0,4": 0, "0,5": REVEAL_STEP_MS, "0,6": 2 * REVEAL_STEP_MS })
  })

  it("leaves alone what appears without having been hidden", () => {
    const grid = floorFrom(["E..R"], {})
    expect(revealWave(new Set(["0,0"]), grid)).toEqual([])
  })
})

describe("a corridor opened into the dark", () => {
  it("brings out only what the opening lays bare", () => {
    const fogged = (dirs: Direction[]): GridCell => ({
      type: "corridor",
      dirs: new Set(dirs),
      state: "fogged",
      hidden: true,
    })
    const lit = (dirs: Direction[]): GridCell => ({
      type: "corridor",
      dirs: new Set(dirs),
      state: "reachable",
      hidden: true,
    })
    const grid = floorFrom(["E..Rlff"], { l: lit, f: fogged })
    expect(revealWave(new Set(["0,0", "0,1", "0,2", "0,3"]), grid).map(({ at }) => at.join(","))).toEqual(["0,4"])
  })
})
