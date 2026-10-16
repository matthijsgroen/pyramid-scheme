import { describe, expect, it } from "vitest"
import { openDoorsFor } from "./mechanismDoors"
import { compileSequence, progressState, spoiledState } from "./sequence"
import { orderRead, withWalked, type SequenceRead } from "./sequenceReads"
import { walkedSteps } from "./sequencePlay"
import type { FloorGrid, GridCell, MechanismRecord, RoomCell } from "./siteTypes"
import { gridWithMechanism } from "./testSupport/mechanismFixtures"

const GATE = "gate:door"
const SEQUENCE = "s0#0/p1"
const LEVER = "s0#0/p2"
const DONE = progressState(3)

/** A three-step sequence's record opening GATE: hiding its order when `hides`, under `mode`. */
const sequenceRecord = (hides: boolean, mode?: "any"): MechanismRecord =>
  compileSequence({
    tiles: [[[0, 0]], [[0, 1]], [[0, 2]]],
    door: [2, 2],
    gates: [{ gateKeyId: GATE, ...(mode ? { mode } : {}) }],
    ...(hides ? { orderReader: "made-up-reader" } : {}),
  })

/** The sequence's home at (1,1); with `lever`, a lever at (1,2) owning GATE too, open while thrown `on`. */
const floorOf = (record: MechanismRecord, lever?: { mode?: "any" }): FloorGrid => {
  const grid = gridWithMechanism(SEQUENCE, record.positions)
  const home = grid.cells[1][1] as RoomCell
  const leverRoom: GridCell = {
    ...home,
    pathIndex: 2,
    mechanism: {
      states: ["off", "on"],
      initial: "off",
      returnsToInitial: true,
      positions: [{ state: "on", gateKeyId: GATE, ...(lever?.mode ? { mode: lever.mode } : {}) }],
    },
  }
  const [top, [left, , right], bottom] = grid.cells
  return {
    ...grid,
    cells: [top, [left, { ...home, mechanism: record }, lever ? leverRoom : right], bottom],
  }
}

const opens = (grid: FloorGrid, states: [string, string][], reads: [string, SequenceRead][] = []) =>
  openDoorsFor(grid, 0, new Map(states), new Set(), new Map(reads)).has(GATE)

describe("a door whose sequence hides its order", () => {
  const hiding = floorOf(sequenceRecord(true))

  it("stays shut at done until the order is read, and opens at done once it is", () => {
    const walked: SequenceRead = { walked: [0, 1, 2] }
    expect(opens(hiding, [[SEQUENCE, DONE]], [[SEQUENCE, walked]])).toBe(false)
    expect(opens(hiding, [[SEQUENCE, DONE]], [[SEQUENCE, { ...walked, read: true }]])).toBe(true)
    expect(opens(hiding, [[SEQUENCE, progressState(2)]], [[SEQUENCE, { ...walked, read: true }]])).toBe(false)
  })

  it("reads as read for a save at done with nothing walked on record, so a door already opened stays open", () => {
    expect(opens(hiding, [[SEQUENCE, DONE]])).toBe(true)
    expect(opens(hiding, [[SEQUENCE, progressState(1)]])).toBe(false)
  })

  it("folds with a second owner: unread says no under every-owner, and stands aside under any-owner", () => {
    const unread: [string, SequenceRead][] = [[SEQUENCE, { walked: [0, 1, 2] }]]
    const read: [string, SequenceRead][] = [[SEQUENCE, { walked: [0, 1, 2], read: true }]]
    const all = floorOf(sequenceRecord(true), {})
    expect(
      opens(
        all,
        [
          [SEQUENCE, DONE],
          [LEVER, "on"],
        ],
        unread
      )
    ).toBe(false)
    expect(
      opens(
        all,
        [
          [SEQUENCE, DONE],
          [LEVER, "on"],
        ],
        read
      )
    ).toBe(true)
    const any = floorOf(sequenceRecord(true, "any"), { mode: "any" })
    expect(
      opens(
        any,
        [
          [SEQUENCE, DONE],
          [LEVER, "off"],
        ],
        unread
      )
    ).toBe(false)
    expect(
      opens(
        any,
        [
          [SEQUENCE, DONE],
          [LEVER, "off"],
        ],
        read
      )
    ).toBe(true)
    expect(
      opens(
        any,
        [
          [SEQUENCE, progressState(0)],
          [LEVER, "on"],
        ],
        unread
      )
    ).toBe(true)
  })

  it("leaves a sequence that shows its order as it was: open at done, whatever is recorded", () => {
    const plate = floorOf(sequenceRecord(false))
    expect(opens(plate, [[SEQUENCE, DONE]], [[SEQUENCE, { walked: [0] }]])).toBe(true)
  })
})

describe("what play keeps beside a hiding sequence", () => {
  it("adds walked steps once, sorted, and hands back the same entry when nothing is new", () => {
    const entry = withWalked(undefined, [2, 0, 2])
    expect(entry).toEqual({ walked: [0, 2] })
    expect(withWalked(entry, [0])).toBe(entry)
    expect(withWalked({ walked: [1], read: true }, [0])).toEqual({ walked: [0, 1], read: true })
  })

  it("counts as read only when read, or at done with no record at all", () => {
    const record = sequenceRecord(true)
    expect(orderRead(record, spoiledState(0, 2), { walked: [2], read: true })).toBe(true)
    expect(orderRead(record, DONE, { walked: [] })).toBe(false)
    expect(orderRead(record, DONE, undefined)).toBe(true)
  })
})

describe("the steps a walk crosses", () => {
  /** A row of three tiles of a hiding sequence, its record on the first; `fogged` in fog. */
  const tileRow = (hides: boolean): FloorGrid => {
    const record = sequenceRecord(hides)
    const grid = gridWithMechanism(SEQUENCE, record.positions)
    const home = grid.cells[1][1] as RoomCell
    const tile = (step: number, at: number): GridCell => ({
      ...home,
      pathIndex: step + 1,
      state: "fogged",
      sequenceTile: { id: "P", step, glyph: 0x13000 + step, entrance: "start" },
      ...(step === 0 ? { mechanism: record, mechanismId: "P" } : { mechanism: undefined }),
      worksMechanism: { mechanismId: "P", transition: at },
    })
    return { ...grid, cells: [[tile(0, 0), tile(1, 1), tile(2, 2)], ...grid.cells.slice(1)] }
  }

  it("adds every step crossed, in fog, out of order and again, by the sequence's address", () => {
    const grid = tileRow(true)
    const crossed = walkedSteps(
      grid,
      0,
      [
        [1, 1],
        [0, 2],
        [0, 1],
        [0, 2],
        [0, 0],
      ],
      new Map()
    )
    expect(crossed).toEqual([{ address: expect.any(String), steps: [0, 1, 2], atDone: false }])
  })

  it("keeps a door open at done with nothing on record open after a walk crosses one tile", () => {
    const grid = tileRow(true)
    const [{ address }] = walkedSteps(
      grid,
      0,
      [
        [1, 1],
        [0, 0],
      ],
      new Map()
    )
    const states = new Map([[address, DONE]])
    const [crossed] = walkedSteps(
      grid,
      0,
      [
        [1, 1],
        [0, 1],
      ],
      states
    )
    expect(crossed.atDone).toBe(true)
    expect(
      opens(
        floorOf(sequenceRecord(true)),
        [[SEQUENCE, DONE]],
        [[SEQUENCE, withWalked(undefined, crossed.steps, crossed.atDone)]]
      )
    ).toBe(true)
  })

  it("records a first walk short of done unread", () => {
    const grid = tileRow(true)
    const [crossed] = walkedSteps(
      grid,
      0,
      [
        [1, 1],
        [0, 0],
      ],
      new Map()
    )
    const entry = withWalked(undefined, crossed.steps, crossed.atDone)
    expect(entry).toEqual({ walked: [0] })
    expect(orderRead(sequenceRecord(true), progressState(1), entry)).toBe(false)
  })

  it("does not count the cell the walk starts on, nor a sequence that shows its order", () => {
    expect(
      walkedSteps(
        tileRow(true),
        0,
        [
          [0, 2],
          [1, 1],
        ],
        new Map()
      )
    ).toEqual([])
    expect(
      walkedSteps(
        tileRow(false),
        0,
        [
          [1, 1],
          [0, 1],
        ],
        new Map()
      )
    ).toEqual([])
  })
})
