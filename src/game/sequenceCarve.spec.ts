import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { Direction, FloorConfig, FloorGrid } from "./siteTypes"
import { floorLock, regionsOf } from "./floorLock"
import { reachableStates, walkLock } from "./lockWalk"
import { mechanismAddress, mechanismWorkedAt } from "./mechanismDoors"
import { MARK_GLYPHS } from "./mark"
import { progressState, sequenceStates, spoiledState } from "./sequence"
import {
  contractExampleFloor,
  hallAnnexSequenceFloor,
  hiddenAnnexSequenceFloor,
  offRouteSequenceFloor,
  oneRegionSequenceFloor,
  tooManyTilesSequenceFloor,
} from "./testSupport/sequenceFixtures"

const SEEDS = Array.from({ length: 12 }, (_, n) => (n + 1) * 7919)
const DOOR_KEY = "obstacle:test#0#0:vaultDoor"
const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

const carved = (make: () => FloorConfig): FloorGrid[] =>
  SEEDS.flatMap(seed => {
    const result = assembleFloor("test", make(), seed)
    return result.success ? [result.grid] : []
  })

const rooms = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) => row.flatMap((cell, c) => (cell.type === "room" ? [{ r, c, cell }] : [])))

const tilesOf = (grid: FloorGrid) =>
  rooms(grid)
    .filter(({ cell }) => cell.sequenceTile)
    .sort((a, b) => a.cell.sequenceTile!.step - b.cell.sequenceTile!.step)

const doorOf = (grid: FloorGrid) => rooms(grid).filter(({ cell }) => cell.requiredKeyId === DOOR_KEY)

const FLOORS: { name: string; make: () => FloorConfig; regions: string[] }[] = [
  {
    name: "tiles in the hall, an annex and the hall again",
    make: hallAnnexSequenceFloor,
    regions: ["hall", "annex", "hall"],
  },
  { name: "all tiles in one region", make: oneRegionSequenceFloor, regions: ["hall", "hall", "hall"] },
  {
    name: "tiles spread across off-route regions",
    make: offRouteSequenceFloor,
    regions: ["east", "west", "hall", "east"],
  },
]

describe.each(FLOORS)("a sequence over $name", ({ make, regions }) => {
  const grids = carved(make)

  it("carves on at least one seed", () => {
    expect(grids.length).toBeGreaterThan(0)
  })

  it("stands exactly one tile per step, each in the region its step names", () => {
    for (const grid of grids) {
      const tiles = tilesOf(grid)
      expect(tiles.map(({ cell }) => cell.sequenceTile!.step)).toEqual(regions.map((_, step) => step))
      expect(tiles.map(({ cell }) => cell.region)).toEqual(regions)
    }
  })

  it("puts two steps in one region on two distinct cells", () => {
    for (const grid of grids) {
      const places = tilesOf(grid).map(({ r, c }) => `${r},${c}`)
      expect(new Set(places).size).toBe(regions.length)
    }
  })

  it("gives every tile a glyph of its own, distinct from every mark on the floor", () => {
    for (const grid of grids) {
      const glyphs = tilesOf(grid).map(({ cell }) => cell.sequenceTile!.glyph)
      const marks = rooms(grid).flatMap(({ cell }) => (cell.mark ? [cell.mark.glyph] : []))
      expect(new Set(glyphs).size).toBe(regions.length)
      for (const glyph of glyphs) expect(MARK_GLYPHS).toContain(glyph)
      expect(marks.length).toBeGreaterThan(0)
      for (const glyph of glyphs) expect(marks).not.toContain(glyph)
    }
  })

  it("is one mechanism: one record on the floor, and every tile works that record's one state", () => {
    for (const grid of grids) {
      const records = rooms(grid).filter(({ cell }) => cell.mechanism)
      expect(records.map(({ cell }) => cell.mechanismId)).toEqual(["plates"])
      const [home] = records
      const addresses = tilesOf(grid).map(({ r, c }) => mechanismAddress(grid, 0, r, c))
      expect(new Set(addresses).size).toBe(1)
      for (const { r, c, cell } of tilesOf(grid)) {
        expect(cell.worksMechanism?.mechanismId).toBe("plates")
        expect(mechanismWorkedAt(grid, r, c)?.home).toEqual([home.r, home.c])
      }
    }
  })

  it("gives the door it opens one owner, the sequence, however many tiles it has", () => {
    for (const grid of grids) {
      const lock = floorLock(grid)!
      const [home] = rooms(grid).filter(({ cell }) => cell.mechanism)
      const owners = Object.values(lock.gates).map(gate => gate.owners)
      expect(owners.length).toBeGreaterThan(0)
      for (const gateOwners of owners) expect(gateOwners).toEqual([`obstacle ${home.r},${home.c}`])
      expect(Object.keys(lock.mechanisms)).toEqual([`obstacle ${home.r},${home.c}`])
    }
  })

  it("places the reset at the door the sequence opens and at no tile", () => {
    for (const grid of grids) {
      const [home] = rooms(grid).filter(({ cell }) => cell.mechanism)
      const [door] = doorOf(grid)
      expect(doorOf(grid)).toHaveLength(1)
      const record = home.cell.mechanism!
      const resets = record.transitions!.filter(t => t.to === progressState(0))
      expect(resets.length).toBeGreaterThan(0)
      for (const reset of resets) expect(reset.at).toEqual([door.r, door.c])
      const tilePlaces = tilesOf(grid).map(({ r, c }) => `${r},${c}`)
      for (const t of record.transitions!.filter(t => t.at[0] !== door.r || t.at[1] !== door.c))
        expect(tilePlaces).toContain(`${t.at[0]},${t.at[1]}`)
      expect(record.transitions![door.cell.worksMechanism!.transition].to).toBe(progressState(0))
      for (const { cell } of tilesOf(grid))
        expect(record.transitions![cell.worksMechanism!.transition].to).not.toBe("0")
    }
  })

  it("walks sound on at least one seed, and every change of the sequence is an entry onto its tile or the reset at the door", () => {
    expect(grids.some(grid => walkLock(floorLock(grid)!).sound)).toBe(true)
    for (const grid of grids) {
      const lock = floorLock(grid)!
      const [home] = rooms(grid).filter(({ cell }) => cell.mechanism)
      const id = `obstacle ${home.r},${home.c}`
      const { of } = regionsOf(grid)
      const tileRegion = tilesOf(grid).map(({ r, c }) => of.get(`${r},${c}`)!)
      const [door] = doorOf(grid)
      const doorSides = new Set(
        [...(door.cell.dirs as ReadonlySet<Direction>)]
          .map(dir => of.get(`${door.r + MOVES[dir][0]},${door.c + MOVES[dir][1]}`))
          .filter((region): region is string => region !== undefined && region !== of.get(`${door.r},${door.c}`))
      )
      const n = regions.length
      const walk = reachableStates(lock)
      if (walk === "tooLarge") throw new Error("too large")
      const { order, edges } = walk

      // Every move that changes the sequence is one of the three the record places, in the region it names.
      let changes = 0
      edges.forEach((tos, from) =>
        tos.forEach(to => {
          const before = order[from].config[id]
          const after = order[to].config[id]
          if (before === after) return
          changes++
          const region = order[from].region
          const entered = order[to].region
          const walked = Number(before)
          const advance = after === progressState(walked + 1) && entered === tileRegion[walked]
          const spoil =
            /^\d+$/.test(before) &&
            Array.from({ length: n - walked - 1 }, (_, j) => walked + 1 + j).some(
              wrong => after === spoiledState(walked, wrong) && entered === tileRegion[wrong]
            )
          const reset = after === progressState(0) && before !== progressState(n) && doorSides.has(region)
          expect(advance || spoil || reset, `${before} -> ${after} in ${region}`).toBe(true)
        })
      )
      expect(changes).toBeGreaterThan(0)
      for (const state of order) expect(sequenceStates(n)).toContain(state.config[id])
    }
  })
})

describe("a sequence the carve cannot stand as written", () => {
  it("refuses a tile whose region holds no node a player could find, naming the sequence and the step", () => {
    const result = assembleFloor("test", hiddenAnnexSequenceFloor(), SEEDS[0])
    expect(result).toEqual({
      success: false,
      reasons: [
        { type: "sequenceTileNotPlaced", id: "plates", step: 0 },
        { type: "regionsNotJoined", between: ["hall", "annex"] },
        { type: "layoutNotFound" },
      ],
    })
  })

  it("refuses a floor needing more distinct glyphs than exist, naming the tile left without one", () => {
    expect(assembleFloor("test", tooManyTilesSequenceFloor(), SEEDS[0])).toEqual({
      success: false,
      reasons: [{ type: "marksExhausted", ids: ["plates#5"] }],
    })
  })

  it("refuses the contract's own example, whose second tile stands behind the door the sequence opens", () => {
    for (const seed of SEEDS)
      expect(assembleFloor("test", contractExampleFloor(), seed)).toEqual({
        success: false,
        reasons: [{ type: "sequenceStepBehindOwnDoor", id: "plates", step: 1 }],
      })
  })
})
