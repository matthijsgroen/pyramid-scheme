import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { FloorGrid } from "./siteTypes"
import { cellAddress } from "./cellAddress"
import { cellSlot } from "./cellSlot"
import { isSpent, legalTargets, mechanismAddress, pressAt } from "./mechanismDoors"
import { compileSequence, sequenceStates, tileStatus } from "./sequence"
import { hallAnnexSequenceFloor } from "./testSupport/sequenceFixtures"

const record = compileSequence({
  tiles: [
    [0, 0],
    [0, 2],
    [0, 4],
  ],
  door: [2, 2],
  gates: [{ gateKeyId: "door" }],
})

describe("a sequence's states", () => {
  it("are progress along the order and every way to spoil it, and no others", () => {
    expect(sequenceStates(3)).toEqual(["0", "1", "2", "3", "x0.1", "x0.2", "x1.2"])
  })

  it("offer from each state only the moves a player has", () => {
    const targets = Object.fromEntries(record.states.map(state => [state, legalTargets(record, state)]))
    expect(targets).toEqual({
      "0": ["1", "x0.1", "x0.2"],
      "1": ["0", "2", "x1.2"],
      "2": ["0", "3"],
      "3": [],
      "x0.1": ["0"],
      "x0.2": ["0"],
      "x1.2": ["0"],
    })
  })

  it("count a finished order as spent, with nothing left to do", () => {
    expect(isSpent(record, "3")).toBe(true)
    expect(isSpent(record, "2")).toBe(false)
  })

  it("open the sequence's gates only once the order is done", () => {
    expect(record.positions).toEqual([{ state: "3", gateKeyId: "door" }])
  })
})

describe("a tile's state", () => {
  it.each([
    ["0", [0, 1, 2], ["unwalked", "unwalked", "unwalked"]],
    ["2", [0, 1, 2], ["inOrder", "inOrder", "unwalked"]],
    ["3", [0, 1, 2], ["inOrder", "inOrder", "inOrder"]],
    ["x1.2", [0, 1, 2], ["inOrder", "unwalked", "outOfOrder"]],
    ["x0.1", [0, 1, 2], ["unwalked", "outOfOrder", "unwalked"]],
    ["from-an-older-build", [0, 1, 2], ["unwalked", "unwalked", "unwalked"]],
  ])("reads each tile from the one state %s, so a spoiled run keeps what was walked", (state, steps, expected) => {
    expect(steps.map(step => tileStatus(state, step))).toEqual(expected)
  })
})

describe("working a carved sequence, tile by tile", () => {
  const result = assembleFloor("test", hallAnnexSequenceFloor(), 7919)
  if (!result.success) throw new Error("the fixture no longer carves at this seed")
  const grid: FloorGrid = result.grid

  const tiles = grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type === "room" && cell.sequenceTile ? [{ r, c, step: cell.sequenceTile.step }] : []
    )
  )
  const tile = (step: number) => tiles.find(t => t.step === step)!
  const door = grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" && cell.requiredKeyId?.endsWith(":vaultDoor") ? [{ r, c }] : []))
  )[0]
  const address = mechanismAddress(grid, 0, tile(0).r, tile(0).c)!

  // The state the save would hold after each press, starting from nothing stored.
  const press = (at: { r: number; c: number }[], from?: string) => {
    const states = new Map<string, string>(from === undefined ? [] : [[address, from]])
    let state = from ?? "0"
    for (const place of at) {
      const pressed = pressAt(grid, 0, place.r, place.c, states)!
      expect(pressed.address).toBe(address)
      state = pressed.state
      states.set(address, state)
    }
    return state
  }

  it("advances one step at a time as the tiles are walked in order", () => {
    expect([press([tile(0)]), press([tile(0), tile(1)]), press([tile(0), tile(1), tile(2)])]).toEqual(["1", "2", "3"])
  })

  it("spoils the run on a tile walked out of order, keeping how far it had got and which tile was wrong", () => {
    expect(press([tile(2)])).toBe("x0.2")
    expect(press([tile(0), tile(2)])).toBe("x1.2")
  })

  it("leaves a spoiled run alone when more tiles are walked, until the door resets it", () => {
    expect(press([tile(0), tile(1)], "x0.2")).toBe("x0.2")
    expect(press([door], "x0.2")).toBe("0")
  })

  it("does nothing when a tile already walked in order is walked again", () => {
    expect(press([tile(0)], "1")).toBe("1")
  })

  it("starts again at the door from any unfinished state", () => {
    expect(["1", "2", "x0.1", "x1.2"].map(state => press([door], state))).toEqual(["0", "0", "0", "0"])
  })

  it("stays done once done: no tile and no door undoes it", () => {
    expect(press([tile(0), door, tile(2)], "3")).toBe("3")
  })

  it("files every tile's state under the first tile's address, and names each tile by its step", () => {
    expect(address).toBe(cellAddress(grid, 0, tile(0).r, tile(0).c))
    expect([0, 1, 2].map(step => cellSlot(grid, tile(step).r, tile(step).c))).toEqual([
      "xsequence:plates#0",
      "xsequence:plates#1",
      "xsequence:plates#2",
    ])
  })
})
