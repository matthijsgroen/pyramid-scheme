import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, FloorGrid, RoomCell } from "./siteTypes"

const SEED = 99

const threeRegions: FloorConfig["regionLayout"] = {
  regions: [
    { name: "mouth", appetite: "free" },
    { name: "hall", appetite: "free" },
    { name: "vault", appetite: "free" },
  ],
  connections: [
    ["mouth", "hall"],
    ["hall", "vault"],
  ],
  in: "mouth",
  out: "vault",
}

// One gate between hall and vault, one lever in mouth that opens it on `right` and shuts it on `left`.
const gatedFloor = (): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
  regionLayout: threeRegions,
  obstacles: [{ id: "vaultDoor", kind: "gate", at: { on: "connection", between: ["hall", "vault"] } }],
  controls: [
    {
      id: "s1",
      in: "mouth",
      states: ["left", "right"],
      initial: "right",
      returnsToInitial: true,
      opens: { right: ["vaultDoor"] },
    },
  ],
})

const carve = (config: FloorConfig): FloorGrid => {
  const result = assembleFloor("test-journey", config, SEED)
  if (!result.success) throw new Error(`did not carve: ${JSON.stringify(result.reasons)}`)
  return result.grid
}

const rooms = (grid: FloorGrid): RoomCell[] =>
  grid.cells.flatMap(row => row.filter((cell): cell is RoomCell => cell.type === "room"))

const GATE_KEY = "obstacle:test-journey#0#0:vaultDoor"

describe("a gate standing on a connection", () => {
  it("carves exactly one room wearing the obstacle's key", () => {
    const gates = rooms(carve(gatedFloor())).filter(room => room.requiredKeyId === GATE_KEY)

    expect(gates).toHaveLength(1)
  })

  it("tags that room as a gate, so the map and openWaysOut both know it", () => {
    const gate = rooms(carve(gatedFloor())).find(room => room.requiredKeyId === GATE_KEY)!

    expect(gate.tags).toContain("gate")
  })

  it("stands it in the far region of the connection", () => {
    const gate = rooms(carve(gatedFloor())).find(room => room.requiredKeyId === GATE_KEY)!

    expect(gate.region).toBe("vault")
  })

  it("stands it on the first cell of that region, so nothing of the region is in front of the bars", () => {
    const grid = carve(gatedFloor())
    const gate = rooms(grid).find(room => room.requiredKeyId === GATE_KEY)!
    // Room ordinals only, not every cell: a corridor connector's ordinal is a compound pair ("7|8"), and Number() turns that into NaN, which poisons Math.min regardless of which cell is actually first.
    const vaultOrdinals = rooms(grid)
      .filter(room => room.region === "vault" && room.ordinal !== undefined)
      .map(room => Number(room.ordinal))

    expect(Number(gate.ordinal)).toBe(Math.min(...vaultOrdinals))
  })

  it("carves no gate room at all when the floor authors no obstacle", () => {
    const { obstacles: _obstacles, controls: _controls, ...plain } = gatedFloor()
    const gates = rooms(carve(plain)).filter(room => room.requiredKeyId?.startsWith("obstacle:"))

    expect(gates).toEqual([])
  })
})
