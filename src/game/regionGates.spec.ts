import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, FloorGrid, RoomCell } from "./siteTypes"
import { openDoorsFor } from "./mechanismDoors"
import { cellAddress } from "./cellAddress"

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
    // Main-path rooms only: a side chain inherits its host's region but carries chain-local ordinals
    // starting at 0, so a side room attached inside "vault" would poison Math.min for a reason having
    // nothing to do with gate placement.
    const vaultOrdinals = rooms(grid)
      .filter(room => room.region === "vault" && room.sectionAddress === "main" && room.ordinal !== undefined)
      .map(room => Number(room.ordinal))

    expect(Number(gate.ordinal)).toBe(Math.min(...vaultOrdinals))
  })

  it("carves no gate room at all when the floor authors no obstacle", () => {
    const { obstacles: _obstacles, controls: _controls, ...plain } = gatedFloor()
    const gates = rooms(carve(plain)).filter(room => room.requiredKeyId?.startsWith("obstacle:"))

    expect(gates).toEqual([])
  })
})

describe("a control standing in a region", () => {
  const controlRoom = (grid: FloorGrid): RoomCell => rooms(grid).find(room => room.mechanism !== undefined)!

  it("stands one room in the region the control names", () => {
    expect(controlRoom(carve(gatedFloor())).region).toBe("mouth")
  })

  it("carries every state the control authors, in order", () => {
    expect(controlRoom(carve(gatedFloor())).mechanism!.states).toEqual(["left", "right"])
  })

  it("starts in the state the control authors", () => {
    expect(controlRoom(carve(gatedFloor())).mechanism!.initial).toBe("right")
  })

  it("carries one position per obstacle each state opens, and none for a state that opens nothing", () => {
    expect(controlRoom(carve(gatedFloor())).mechanism!.positions).toEqual([{ state: "right", gateKeyId: GATE_KEY }])
  })

  it("opens the gate in the state that names it and nothing in the other", () => {
    const grid = carve(gatedFloor())
    const room = controlRoom(grid)
    const at = grid.cells
      .flatMap((row, r) => row.map((cell, c) => (cell === room ? cellAddress(grid, 0, r, c) : null)))
      .find((a): a is string => a !== null)!

    expect(openDoorsFor(grid, 0, new Map([[at, "right"]]))).toEqual(new Set([GATE_KEY]))
    expect(openDoorsFor(grid, 0, new Map([[at, "left"]]))).toEqual(new Set())
  })

  it("opens the gate on arrival, with no stored position at all, because that is the initial state", () => {
    const grid = carve(gatedFloor())

    expect(openDoorsFor(grid, 0, new Map())).toEqual(new Set([GATE_KEY]))
  })
})

// THREE STATES, not two: the authoring is generic, and a wheel is the case this proves is already
// carried — it needs art, not a second authoring path.
describe("a control with more than two states", () => {
  const threeWay = (): FloorConfig => ({
    ...gatedFloor(),
    obstacles: [
      { id: "gA", kind: "gate", at: { on: "connection", between: ["mouth", "hall"] } },
      { id: "gB", kind: "gate", at: { on: "connection", between: ["hall", "vault"] } },
    ],
    controls: [
      {
        id: "w1",
        in: "mouth",
        states: ["n", "e", "s"],
        initial: "n",
        returnsToInitial: true,
        opens: { n: ["gA"], e: ["gB"], s: ["gA", "gB"] },
      },
    ],
  })

  it("carries all three states and every position each one opens", () => {
    const grid = carve(threeWay())
    const mechanism = rooms(grid).find(room => room.mechanism !== undefined)!.mechanism!
    const keyA = "obstacle:test-journey#0#0:gA"
    const keyB = "obstacle:test-journey#0#0:gB"

    expect(mechanism.states).toEqual(["n", "e", "s"])
    expect(mechanism.positions).toEqual([
      { state: "n", gateKeyId: keyA },
      { state: "e", gateKeyId: keyB },
      { state: "s", gateKeyId: keyA },
      { state: "s", gateKeyId: keyB },
    ])
  })
})
