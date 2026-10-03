import { describe, expect, it } from "vitest"
import { doorOpen, type DoorMode } from "./doorOpen"
import { floorLock } from "./floorLock"
import { openGates, type LockConfig } from "./lockWalk"
import { openDoorsFor } from "./mechanismDoors"
import { cellAddress } from "./cellAddress"
import type { Direction, FloorGrid, GridCell, MechanismRecord } from "./siteTypes"

const everyBooleanList = (n: number): boolean[][] =>
  n === 0
    ? [[]]
    : everyBooleanList(n - 1).flatMap(rest => [
        [false, ...rest],
        [true, ...rest],
      ])

// What the contract says: `and` wants every owner to name the door, `any` wants one of them.
const contract = (says: boolean[], mode: DoorMode): boolean =>
  mode === "any" ? says.filter(Boolean).length >= 1 : says.filter(Boolean).length === says.length

const MODES: DoorMode[] = ["all", "any"]

describe("the rule for whether a door stands open", () => {
  it("is the contract's answer for every number of owners and every combination of what they say", () => {
    for (const mode of MODES)
      for (let owners = 1; owners <= 4; owners++)
        for (const says of everyBooleanList(owners))
          expect(doorOpen(says, mode), `${mode} ${says.join("/")}`).toBe(contract(says, mode))
  })

  it("reads no mode as every owner, and a door nobody owns as shut", () => {
    expect(doorOpen([true, false])).toBe(false)
    expect(doorOpen([true, true])).toBe(true)
    for (const mode of MODES) expect(doorOpen([], mode)).toBe(false)
  })
})

const G = "obstacle:doors#0#0:mixed"
const H = "obstacle:doors#0#0:bystander"
const keyId = (n: number) => `floorkey:${n}`

type Cell = Extract<GridCell, { type: "room" }>

// One row, walked west to east: the entrance, `mechanisms` levers that each name the door, a chest per
// floor key, a bystander lever whose own door keeps a lock on the floor when nothing else drives it, that
// door, the door under test (it asks for its gate key and every floor key), and the exit.
const rowOf = (mechanisms: number, keys: number, mode: DoorMode, minted = true) => {
  const dirs = new Set<Direction>(["e", "w"])
  const corridor = (): GridCell => ({ type: "corridor", dirs, state: "fogged" })
  const room = (extra: Partial<Cell> = {}): GridCell => ({
    type: "room",
    roomType: "encounter",
    dirs,
    state: "fogged",
    pathIndex: 1,
    ...extra,
  })
  const lever = (
    gateKeyId: string,
    any: boolean
  ): Pick<MechanismRecord, "states" | "initial" | "returnsToInitial" | "positions"> => ({
    states: ["rest", "thrown"],
    initial: "rest",
    returnsToInitial: true,
    positions: [{ state: "thrown", gateKeyId, ...(any ? { mode: "any" as const } : {}) }],
  })
  const cells: GridCell[] = [corridor()]
  const levers: number[] = []
  const addressed = (cell: GridCell): GridCell => ({ ...cell, sectionAddress: `s${cells.length}` }) as GridCell
  const add = (cell: GridCell) => cells.push(addressed(cell), corridor())
  for (let n = 0; n < mechanisms; n++) {
    levers.push(cells.length)
    add(room({ mechanism: lever(G, mode === "any" && n === 0) }))
  }
  const chests: number[] = []
  if (minted)
    for (let n = 0; n < keys; n++) {
      chests.push(cells.length)
      add(room({ reward: { type: "tombKey", keyId: keyId(n) } }))
    }
  const bystander = cells.length
  add(room({ mechanism: lever(H, false) }))
  add(room({ tags: ["gate"], requiredKeyId: H }))
  const door = cells.length
  add(
    room({
      tags: ["gate"],
      requiredKeyId: G,
      ...(keys > 0 ? { requiredKeyIds: Array.from({ length: keys }, (_, n) => keyId(n)) } : {}),
    })
  )
  cells.push(addressed(room()))
  const grid: FloorGrid = {
    cells: [cells],
    rows: 1,
    cols: cells.length,
    entrancePos: [0, 0],
    exitPos: [0, cells.length - 1],
    siteId: "doors",
    staircases: {},
  }
  return { grid, levers, bystander, door }
}

type Asked = { runtime: boolean; solver: boolean }

// The same door asked of the walk (`openDoorsFor`) and of the proof (`openGates` over `floorLock`), with
// each lever in `thrown`'s state and each floor key `held` or not.
const ask = (built: ReturnType<typeof rowOf>, thrown: boolean[], held: boolean[], keys: number): Asked => {
  const { grid, levers, door } = built
  const positions = new Map(
    levers.map((col, n) => [cellAddress(grid, 0, 0, col)!, thrown[n] ? "thrown" : "rest"] as const)
  )
  const heldKeys = new Set(held.flatMap((isHeld, n) => (isHeld && n < keys ? [keyId(n)] : [])))
  const lock = floorLock(grid)!
  const config: LockConfig = Object.fromEntries(
    Object.entries(lock.mechanisms).map(([id, mechanism]) => [id, mechanism.initial])
  )
  for (const [n, col] of levers.entries()) config[`obstacle 0,${col}`] = thrown[n] ? "thrown" : "rest"
  for (const [n, isHeld] of held.entries()) if (n < keys && isHeld) config[`key ${keyId(n)}`] = "held"
  const gates = Object.keys(lock.gates).filter(id => id.startsWith(`door 0,${door}|`))
  const open = openGates(lock, config)
  const sides = gates.map(id => open.has(id))
  expect(new Set(sides).size, "both sides of one door answer alike").toBe(1)
  return { runtime: openDoorsFor(grid, 0, positions, heldKeys).has(G), solver: sides[0] }
}

describe("a door owned by any mix of mechanisms and floor keys", () => {
  for (const mode of MODES)
    for (let mechanisms = 0; mechanisms <= 2; mechanisms++)
      for (let keys = 0; keys <= 2; keys++) {
        if (mechanisms + keys === 0 || (mode === "any" && mechanisms === 0)) continue
        it(`${mechanisms} mechanisms and ${keys} floor keys under ${mode}: the walk, the proof and the rule agree in every state`, () => {
          const built = rowOf(mechanisms, keys, mode)
          // Nothing names the door's own gate key when no mechanism does, so it is an owner that never says yes.
          const unnamed = mechanisms === 0 ? [false] : []
          for (const thrown of everyBooleanList(mechanisms))
            for (const held of everyBooleanList(keys)) {
              const want = doorOpen([...unnamed, ...thrown, ...held], mode)
              expect(want, "the rule").toBe(contract([...unnamed, ...thrown, ...held], mode))
              expect(ask(built, thrown, held, keys), `thrown ${thrown.join("/")} held ${held.join("/")}`).toEqual({
                runtime: want,
                solver: want,
              })
            }
        })
      }

  it("a mechanism and a floor key under any: the key alone opens the door while the mechanism rests", () => {
    const built = rowOf(1, 1, "any")
    expect(ask(built, [false], [true], 1)).toEqual({ runtime: true, solver: true })
    expect(ask(built, [true], [false], 1)).toEqual({ runtime: true, solver: true })
    expect(ask(built, [false], [false], 1)).toEqual({ runtime: false, solver: false })
  })

  it("a mechanism and a floor key no chest mints: shut under and, open under any only once the mechanism names it", () => {
    for (const [mode, thrown, want] of [
      ["all", true, false],
      ["all", false, false],
      ["any", true, true],
      ["any", false, false],
    ] as const) {
      const { grid, levers, door } = rowOf(1, 1, mode, false)
      const positions = new Map([[cellAddress(grid, 0, 0, levers[0])!, thrown ? "thrown" : "rest"]])
      const lock = floorLock(grid)!
      const config: LockConfig = Object.fromEntries(Object.entries(lock.mechanisms).map(([id, m]) => [id, m.initial]))
      config[`obstacle 0,${levers[0]}`] = thrown ? "thrown" : "rest"
      const open = openGates(lock, config)
      const solver = Object.keys(lock.gates)
        .filter(id => id.startsWith(`door 0,${door}|`))
        .every(id => open.has(id))
      expect({ runtime: openDoorsFor(grid, 0, positions).has(G), solver }, `${mode} thrown ${thrown}`).toEqual({
        runtime: want,
        solver: want,
      })
    }
  })
})
