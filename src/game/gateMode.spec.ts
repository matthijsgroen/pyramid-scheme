import { describe, expect, it } from "vitest"
import type { Direction, FloorGrid, GridCell, MechanismRecord } from "./siteTypes"
import { floorLock } from "./floorLock"
import { openGates, type LockConfig, type LockSpec } from "./lockWalk"
import { openDoorsFor } from "./mechanismDoors"
import { cellAddress } from "./cellAddress"

// One row of cells, walked west to east: entrance, three levers, then a door for every kind of
// condition a gate can carry, then the exit.
const key = (id: string) => `obstacle:spec#0#0:${id}`
const AND = key("and")
const ANY = key("any")
const MIXED = key("mixed")
const SOLO = key("solo")
const TRI = key("tri")

const lever = (
  states: string[],
  initial: string,
  positions: MechanismRecord["positions"]
): Pick<MechanismRecord, "states" | "initial" | "returnsToInitial" | "positions"> => ({
  states,
  initial,
  returnsToInitial: true,
  positions,
})

const S1 = lever(
  ["rest", "thrown"],
  "rest",
  [AND, ANY, MIXED, SOLO].map(gateKeyId => ({
    state: "thrown",
    gateKeyId,
    ...(gateKeyId === ANY ? { mode: "any" as const } : {}),
  }))
)
const S2 = lever(["rest", "thrown"], "rest", [
  { state: "thrown", gateKeyId: AND },
  { state: "thrown", gateKeyId: ANY, mode: "any" },
  { state: "rest", gateKeyId: MIXED },
])
const S3 = lever(["a", "b", "c"], "a", [{ state: "b", gateKeyId: TRI }])

/** Author the row as [kind, extra] per column; a lever stands in a room carrying its mechanism. */
const row = (): FloorGrid => {
  const dirs = new Set<Direction>(["e", "w"])
  const corridor = (): GridCell => ({ type: "corridor", dirs, state: "fogged" })
  const room = (c: number, extra: Partial<Extract<GridCell, { type: "room" }>> = {}): GridCell => ({
    type: "room",
    roomType: "encounter",
    dirs,
    state: "fogged",
    sectionAddress: `s${c}`,
    pathIndex: 1,
    ...extra,
  })
  const withMech = (m: typeof S1) => ({ mechanism: { ...m } })
  const door = (id: string) => ({ tags: ["gate"], requiredKeyId: id })
  const cells: GridCell[] = [
    corridor(), // 0 entrance
    room(1, withMech(S1)),
    corridor(),
    room(3, withMech(S2)),
    corridor(),
    room(5, withMech(S3)),
    corridor(),
    room(7, door(AND)),
    corridor(),
    room(9, door(ANY)),
    corridor(),
    room(11, door(MIXED)),
    corridor(),
    room(13, door(SOLO)),
    corridor(),
    room(15, door(TRI)),
    corridor(),
    room(17),
  ]
  return {
    cells: [cells],
    rows: 1,
    cols: cells.length,
    entrancePos: [0, 0],
    exitPos: [0, cells.length - 1],
    siteId: "gate-mode",
    staircases: {},
  }
}

const mechanismAt = (grid: FloorGrid, col: number) => {
  const cell = grid.cells[0][col]
  return cell.type === "room" ? cell.mechanism! : undefined
}
const LEVER_COLS = [1, 3, 5]
const doorCols = (grid: FloorGrid) =>
  grid.cells[0].flatMap((cell, c) => (cell.type === "room" && cell.requiredKeyId ? [c] : []))

const spec = (grid: FloorGrid): LockSpec => floorLock(grid)!
const mechanismIdAt = (lock: LockSpec, col: number) =>
  Object.keys(lock.mechanisms).find(id => id.endsWith(` 0,${col}`))!

/** Every configuration: the product of each lever's states, as a save's positions and as a lock config. */
const everyConfiguration = (grid: FloorGrid, lock: LockSpec) => {
  let combos: string[][] = [[]]
  for (const col of LEVER_COLS) combos = combos.flatMap(done => mechanismAt(grid, col)!.states.map(s => [...done, s]))
  return combos.map(states => ({
    states,
    positions: new Map(LEVER_COLS.map((col, i) => [cellAddress(grid, 0, 0, col)!, states[i]])),
    config: Object.fromEntries(LEVER_COLS.map((col, i) => [mechanismIdAt(lock, col), states[i]])) as LockConfig,
  }))
}

const openDoorColsFromRuntime = (grid: FloorGrid, positions: Map<string, string>) => {
  const open = openDoorsFor(grid, 0, positions)
  return doorCols(grid).filter(c => open.has((grid.cells[0][c] as { requiredKeyId: string }).requiredKeyId))
}
const openDoorColsFromWalk = (lock: LockSpec, config: LockConfig) =>
  [...new Set([...openGates(lock, config)].map(id => Number(id.split("|")[0].split(",")[1])))].sort((a, b) => a - b)

describe("a gate carries its own opening condition", () => {
  it("the runtime and the soundness walk agree on every door in every configuration", () => {
    const grid = row()
    const lock = spec(grid)
    const configurations = everyConfiguration(grid, lock)

    expect(configurations).toHaveLength(2 * 2 * 3)
    for (const { states, positions, config } of configurations)
      expect(openDoorColsFromRuntime(grid, positions), `levers ${states.join("/")}`).toEqual(
        openDoorColsFromWalk(lock, config)
      )
  })

  it("carries the authored mode to the lock: only the gates authored any answer to one owner", () => {
    const grid = row()
    const lock = spec(grid)
    const modeAt = (col: number) =>
      Object.entries(lock.gates)
        .filter(([id]) => id.startsWith(`door 0,${col}|`))
        .map(([, gate]) => gate.mode)

    expect(modeAt(7)).toEqual([undefined, undefined])
    expect(modeAt(9)).toEqual(["any", "any"])
    expect(modeAt(11)).toEqual([undefined, undefined])
    expect(modeAt(13)).toEqual([undefined, undefined])
    expect(modeAt(15)).toEqual([undefined, undefined])
  })

  const doorState = (col: number) =>
    everyConfiguration(row(), spec(row())).map(({ states, positions }) => ({
      states,
      open: openDoorColsFromRuntime(row(), positions).includes(col),
    }))

  it("and: open only while both owners' current states name it, in each of the four combinations", () => {
    const four = ["rest/rest", "rest/thrown", "thrown/rest", "thrown/thrown"]
    const opens = four.map(pair => {
      const [s1, s2] = pair.split("/")
      return doorState(7)
        .filter(({ states }) => states[0] === s1 && states[1] === s2)
        .every(({ open }) => open)
    })
    expect(opens).toEqual([false, false, false, true])
    // and never open in a configuration that is not the thrown/thrown pair
    for (const { states, open } of doorState(7))
      expect(open, states.join("/")).toBe(states[0] === "thrown" && states[1] === "thrown")
  })

  it("any: open in three of the four combinations of its two levers", () => {
    for (const { states, open } of doorState(9))
      expect(open, states.join("/")).toBe(states[0] === "thrown" || states[1] === "thrown")
    const pairs = new Map(doorState(9).map(({ states, open }) => [`${states[0]}/${states[1]}`, open]))
    expect([...pairs.values()].filter(Boolean)).toHaveLength(3)
    expect(pairs.size).toBe(4)
  })

  it("mixed: open only when S1 is thrown and S2 is at rest", () => {
    for (const { states, open } of doorState(11))
      expect(open, states.join("/")).toBe(states[0] === "thrown" && states[1] === "rest")
  })

  it("a one-owner gate with no authored mode stands open exactly while its owner names it", () => {
    for (const { states, open } of doorState(13)) expect(open, states.join("/")).toBe(states[0] === "thrown")
    for (const { states, open } of doorState(15)) expect(open, states.join("/")).toBe(states[2] === "b")
  })

  it("a mechanism with no stored position opens what its initial position names", () => {
    const grid = row()
    expect(openDoorColsFromRuntime(grid, new Map())).toEqual([])
  })
})
