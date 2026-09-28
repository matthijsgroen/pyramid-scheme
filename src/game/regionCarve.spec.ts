import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { CorridorCell, FloorConfig, RoomCell } from "./siteTypes"

const SEED = 99

const threeRegions = {
  regions: [
    { name: "mouth", appetite: "nothing" as const },
    { name: "hall", appetite: "puzzles" as const },
    { name: "vault", appetite: "reward" as const },
  ],
  connections: [["mouth", "hall"] as const, ["hall", "vault"] as const],
  in: "mouth",
  out: "vault",
}

const floor = (regionLayout?: FloorConfig["regionLayout"]): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
  regionLayout,
})

const carvedCells = (config: FloorConfig): Array<RoomCell | CorridorCell> => {
  const result = assembleFloor("test-journey", config, SEED)
  if (!result.success) throw new Error(`did not carve: ${JSON.stringify(result.reasons)}`)
  return result.grid.cells
    .flat()
    .filter((cell): cell is RoomCell | CorridorCell => cell.type === "room" || cell.type === "corridor")
}

describe("a carved cell knows its region", () => {
  it("labels every carved cell when the floor authors a layout", () => {
    const unlabelled = carvedCells(floor(threeRegions)).filter(cell => cell.region === undefined)

    expect(unlabelled).toEqual([])
  })

  // Depends on the main path having at least as many steps as the route has regions — with
  // `pathPuzzles: 2` it does. If this fails counting 2 regions rather than 3, the path is shorter than
  // the route and `regionOfStep` has correctly dealt only what there was; say so rather than widening
  // the assertion, because a route longer than its path is a fault a later slice reports.
  it("uses every region of the route and none that is not on it", () => {
    const used = new Set(carvedCells(floor(threeRegions)).map(cell => cell.region))

    expect([...used].sort()).toEqual(["hall", "mouth", "vault"])
  })

  it("labels nothing at all when the floor authors no layout", () => {
    const labelled = carvedCells(floor(undefined)).filter(cell => cell.region !== undefined)

    expect(labelled).toEqual([])
  })
})
