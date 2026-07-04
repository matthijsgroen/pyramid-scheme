import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import type { FloorConfig } from "@/game/siteTypes"
import { encodeEdge, useAssembledFloor } from "./useAssembledFloor"

// Same shape as the HiddenPassage story: a hidden side section reachable only via a fork.
const SEED = 17
const JOURNEY_ID = "hidden-test"
const CONFIG: FloorConfig = {
  pathPuzzles: 2,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "expert", end: "treasure" },
    { pathPuzzles: 0, difficulty: "expert", end: "treasure", hidden: true, endReward: { type: "mosaicPiece" } },
  ],
}

describe("useAssembledFloor — hidden junctions", () => {
  it("marks a masked junction reachable for a detector-equipped player, even when it was only auto-glided through as a plain corridor", () => {
    const assembled = assembleFloor(JOURNEY_ID, CONFIG, SEED)
    if (!assembled.success) throw new Error("assembly failed")
    const grid = assembled.grid

    // At this seed, the hidden treasure sits two cells past a fork: fork -> corridor -> hidden
    // treasure. Only the endpoint is tagged `hidden`, so the corridor cell has no turn of its
    // own on the unmasked graph — completeCell treats it as an ordinary straight passthrough
    // and marks it "visible" while auto-revealing past it, rather than stopping there.
    // Completing just the fork (not the corridor itself) reproduces that real play sequence.
    const fork = grid.cells[10][14]
    if (fork.type !== "room" || fork.roomType !== "fork") {
      throw new Error("site generation changed — fork is no longer at (10,14) for this seed/config")
    }
    const exploredSections = { [fork.sectionHash ?? ""]: [encodeEdge(0, 10, 14)] }

    const { result } = renderHook(() =>
      useAssembledFloor(JOURNEY_ID, CONFIG, SEED, 0, exploredSections, new Set(), null, 1, new Set())
    )

    expect(result.current.hiddenJunctions.size).toBeGreaterThan(0)
    for (const key of result.current.hiddenJunctions) {
      const [r, c] = key.split(",").map(Number)
      const cell = result.current.grid?.cells[r]?.[c]
      if (cell?.type === "empty") throw new Error(`expected a real cell at ${key}`)
      expect(cell?.state).toBe("reachable")
    }
  })

  it("leaves the junction alone without a detector, so the player glides through unaware", () => {
    const assembled = assembleFloor(JOURNEY_ID, CONFIG, SEED)
    if (!assembled.success) throw new Error("assembly failed")
    const grid = assembled.grid
    const fork = grid.cells[10][14]
    if (fork.type !== "room" || fork.roomType !== "fork") {
      throw new Error("site generation changed — fork is no longer at (10,14) for this seed/config")
    }
    const exploredSections = { [fork.sectionHash ?? ""]: [encodeEdge(0, 10, 14)] }

    const { result } = renderHook(() =>
      useAssembledFloor(JOURNEY_ID, CONFIG, SEED, 0, exploredSections, new Set(), null, 0, new Set())
    )

    const [r, c] = [...result.current.hiddenJunctions][0].split(",").map(Number)
    const cell = result.current.grid?.cells[r]?.[c]
    if (cell?.type === "empty") throw new Error(`expected a real cell at ${r},${c}`)
    expect(cell?.state).toBe("visible")
  })
})
