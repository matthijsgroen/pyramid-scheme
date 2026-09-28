import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { Direction, FloorConfig, FloorGrid, RoomCell } from "./siteTypes"
import { openDoorsFor } from "./mechanismDoors"
import { cellAddress } from "./cellAddress"
import { cellSlot } from "./cellSlot"

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

// Two gates in sequence on the same three-region layout: gA on mouth—hall, gB on hall—vault, one
// control opening either or both. Module-scoped because both the three-state control test and the
// two-gated-regions test below need this exact two-obstacle shape.
const twoGatesFloor = (): FloorConfig => ({
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
  it("carries all three states and every position each one opens", () => {
    const grid = carve(twoGatesFloor())
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

// Neither names its own `encounter`, so both resolve to the same family ("handle") — the case that
// crashes the carve if a control's room is named by family alone, the same way one obstacle gate
// each on the main path would collide before Task 3's gate fix.
describe("two controls on one floor", () => {
  const twoControls = (): FloorConfig => ({
    ...gatedFloor(),
    obstacles: [
      { id: "gA", kind: "gate", at: { on: "connection", between: ["mouth", "hall"] } },
      { id: "gB", kind: "gate", at: { on: "connection", between: ["hall", "vault"] } },
    ],
    controls: [
      {
        id: "s1",
        in: "mouth",
        states: ["left", "right"],
        initial: "right",
        returnsToInitial: true,
        opens: { right: ["gA"] },
      },
      {
        id: "s2",
        in: "hall",
        states: ["left", "right"],
        initial: "right",
        returnsToInitial: true,
        opens: { right: ["gB"] },
      },
    ],
  })

  it("carves, and names both control rooms by their own authored id", () => {
    const grid = carve(twoControls())
    const slots = grid.cells
      .flatMap((row, r) => row.map((cell, c) => (cell.type === "room" && cell.mechanism ? cellSlot(grid, r, c) : null)))
      .filter((slot): slot is string => slot !== null)
      .sort()

    expect(slots).toEqual(["xhandle:s1", "xhandle:s2"])
  })
})

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

/** Every cell of `region` that opens onto a cell outside it, as "r,c". The gate room should be the
 * only one: a gate is a region's only legitimate entrance, so anything else here is a way round it. */
const waysIn = (grid: FloorGrid, region: string): string[] => {
  const found: string[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "empty" || cell.region !== region) continue
      for (const dir of cell.dirs) {
        const [dr, dc] = MOVES[dir]
        const other = grid.cells[r + dr]?.[c + dc]
        if (!other || other.type === "empty" || other.region === region) continue
        found.push(`${r},${c}`)
        break
      }
    }
  return found
}

/** The "r,c" of the room wearing `requiredKeyId`. */
const cellAt = (grid: FloorGrid, requiredKeyId: string): string => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && cell.requiredKeyId === requiredKeyId) return `${r},${c}`
    }
  throw new Error(`no room wearing requiredKeyId ${requiredKeyId}`)
}

// `gatedFloor()` (2 path puzzles, 1 side section) cannot exercise this guard: at any seed it touches
// the rest of the maze at exactly one physical point regardless of whether the isolation registration
// runs, so a passing test here proves nothing — the same small floor still passes with the
// gatedCellKeys/needsDoor registration commented out (checked by hand while building this test). A
// bigger floor is what gives the maze's leftover tree edges (see the "Gate isolation" comment in
// siteAssembler.ts) somewhere else to land a vault-region node next to a non-vault one.
//
// This fixture (10 main-path puzzles, 4 side sections, same three-region layout/obstacle/control as
// `gatedFloor()`) was swept over seeds 0-59 with the registration commented out: 20 of 60 seeds carved
// a genuine second way into "vault" (one not merely the seam's own connector cell reported under its
// own coordinate — connectors take their `region` tag from whichever endpoint node sorts lower, so the
// seam sometimes surfaces one cell over from the gate room itself; that is not a second entrance). With
// the registration restored, 0 of 60 seeds leaked. Seed 4 is pinned because it is clean either way: with
// the registration in place `waysIn` is exactly the gate room, and with it removed `waysIn` gains
// "10,7" — two full node-widths from the gate room, so not the seam connector.
const bigGatedFloor = (): FloorConfig => ({
  pathPuzzles: 10,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 3, difficulty: "starter", end: "treasure" },
    { pathPuzzles: 3, difficulty: "starter", end: "treasure" },
    { pathPuzzles: 3, difficulty: "starter", end: "treasure" },
    { pathPuzzles: 2, difficulty: "starter", end: "treasure" },
  ],
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
const PINNED_SEED = 4

describe("what a gated region shuts off", () => {
  it("has exactly one way in, and it is the gate room", () => {
    const result = assembleFloor("test-journey", bigGatedFloor(), PINNED_SEED)
    if (!result.success) throw new Error(`did not carve: ${JSON.stringify(result.reasons)}`)
    const grid = result.grid
    const gate = rooms(grid).find(room => room.requiredKeyId === GATE_KEY)!
    const gateAt = grid.cells.flatMap((row, r) => row.map((cell, c) => (cell === gate ? `${r},${c}` : null)))

    expect(waysIn(grid, "vault")).toEqual(gateAt.filter((a): a is string => a !== null))
  })
})

// mouth—hall gated by gA, hall—vault gated by gB: hall stands behind {gA}, vault behind {gA,gB}.
// Different sets, so no leftover edge may join them. `twoGatesFloor()` is too small to exercise this
// (same reason as `gatedFloor()` above: at any seed it touches the rest of the maze at exactly one
// physical point), so this borrows `bigGatedFloor()`'s two extra gates instead.
const bigTwoGatesFloor = (): FloorConfig => ({
  ...bigGatedFloor(),
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
// hall sits between two gates, so ONE of its two boundary connectors always reads as "hall" under
// `waysIn`'s own "whichever endpoint sorts lower" convention (see the comment above bigGatedFloor) —
// swept seeds 0-99: vault clean 44/100, hall clean 0/100, in this fixture and in `twoGatesFloor()`'s
// smaller one alike. That is a limitation of reading a boundary off a corridor's `region` tag, not of
// the carve, and it cannot be dodged by seed choice. Checking vault alone still proves the guard this
// test exists for: a rejoin crossing hall's {gA} into vault's {gA,gB} can only ever surface as an
// extra vault entrance, which this would catch. Seed 6 is one of the 44 clean ones, and — like seed 4
// above — it is pinned because it demonstrably leaks under broken code, not because it happened to be
// green: with `crossesNoDoor` forced to `return true`, `waysIn(grid, "vault")` gains "12,2" alongside
// the gate room at "12,0".
const PINNED_SEED_TWO_GATES = 6

describe("two gated regions in sequence", () => {
  it("gives the far region exactly one way in, and it is its own gate room", () => {
    const result = assembleFloor("test-journey", bigTwoGatesFloor(), PINNED_SEED_TWO_GATES)
    if (!result.success) throw new Error(`did not carve: ${JSON.stringify(result.reasons)}`)
    const grid = result.grid

    expect(waysIn(grid, "vault")).toEqual([cellAt(grid, "obstacle:test-journey#0#0:gB")])
  })
})
