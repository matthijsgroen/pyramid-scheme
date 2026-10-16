import { describe, expect, it } from "vitest"
import { assembleFloor, defaultResolveEncounter, type ResolveEncounter } from "./siteAssembler"
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
  twoAnnexSequenceFloor,
  tooManyTilesSequenceFloor,
} from "./testSupport/sequenceFixtures"

const SEEDS = Array.from({ length: 12 }, (_, n) => (n + 1) * 7919)
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

// The door the sequence opens and resets at: the one room that works it and is no tile.
const doorOf = (grid: FloorGrid) =>
  rooms(grid).filter(({ cell }) => cell.requiredKeyId !== undefined && cell.worksMechanism && !cell.sequenceTile)

const FLOORS: { name: string; make: () => FloorConfig; regions: string[]; id: string }[] = [
  {
    name: "steps in an annex and at the mouth",
    make: hallAnnexSequenceFloor,
    regions: ["annex", "mouth"],
    id: "plates",
  },
  {
    name: "a step in a hub and one in each of its annexes, laid from a lock",
    make: offRouteSequenceFloor,
    regions: ["plates.hall", "plates.east", "plates.west"],
    id: "plates.plates",
  },
]

const isNodeOf = (grid: FloorGrid, key: string, region: string) => {
  const [r, c] = key.split(",").map(Number)
  const cell = grid.cells[r]?.[c]
  return (cell?.type === "room" || cell?.type === "corridor") && cell.region === region && !cell.hidden
}

// Every room of `region` the ground outside it reaches without stepping on a tile of `step`, the entrance counted
// as outside.
const roomsReachedRound = (grid: FloorGrid, region: string, step: number): string[] => {
  const entrance = `${grid.entrancePos[0]},${grid.entrancePos[1]}`
  const blocked = new Set(
    tilesOf(grid)
      .filter(({ cell }) => cell.sequenceTile!.step === step)
      .map(({ r, c }) => `${r},${c}`)
  )
  const inside = (key: string) => key !== entrance && isNodeOf(grid, key, region)
  const queue = grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      (cell.type === "room" || cell.type === "corridor") && !cell.hidden && !inside(`${r},${c}`) ? [`${r},${c}`] : []
    )
  )
  const seen = new Set([...queue, ...blocked])
  const reached: string[] = []
  for (let at = 0; at < queue.length; at++) {
    const [r, c] = queue[at].split(",").map(Number)
    const cell = grid.cells[r][c]
    if (cell.type !== "room" && cell.type !== "corridor") continue
    for (const dir of cell.dirs as ReadonlySet<Direction>) {
      const next = `${r + MOVES[dir][0]},${c + MOVES[dir][1]}`
      const there = grid.cells[r + MOVES[dir][0]]?.[c + MOVES[dir][1]]
      if (seen.has(next) || !there || (there.type !== "room" && there.type !== "corridor") || there.hidden) continue
      seen.add(next)
      queue.push(next)
      if (inside(next) && there.type === "room") reached.push(next)
    }
  }
  return reached
}

describe.each(FLOORS)("a sequence over $name", ({ make, regions, id: sequenceId }) => {
  const grids = carved(make)

  it("carves on at least one seed", () => {
    expect(grids.length).toBeGreaterThan(0)
  })

  it("stands every step's tiles in the region its step names, on every way into it", () => {
    for (const grid of grids) {
      const tiles = tilesOf(grid)
      expect([...new Set(tiles.map(({ cell }) => cell.sequenceTile!.step))]).toEqual(regions.map((_, step) => step))
      for (const { cell } of tiles) expect(cell.region).toBe(regions[cell.sequenceTile!.step])
      for (const [step, region] of regions.entries()) expect(roomsReachedRound(grid, region, step)).toEqual([])
    }
  })

  it("gives every step a glyph of its own, worn by each of its tiles, distinct from every mark on the floor", () => {
    for (const grid of grids) {
      const glyphOf = new Map<number, Set<number>>()
      for (const { cell } of tilesOf(grid))
        glyphOf.set(
          cell.sequenceTile!.step,
          (glyphOf.get(cell.sequenceTile!.step) ?? new Set()).add(cell.sequenceTile!.glyph)
        )
      for (const worn of glyphOf.values()) expect(worn.size).toBe(1)
      const glyphs = [...glyphOf.values()].flatMap(worn => [...worn])
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
      expect(records.map(({ cell }) => cell.mechanismId)).toEqual([sequenceId])
      const [home] = records
      const addresses = tilesOf(grid).map(({ r, c }) => mechanismAddress(grid, 0, r, c))
      expect(new Set(addresses).size).toBe(1)
      for (const { r, c, cell } of tilesOf(grid)) {
        expect(cell.worksMechanism?.mechanismId).toBe(sequenceId)
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
      const tileRegions = regions.map(
        (_, step) =>
          new Set(
            tilesOf(grid)
              .filter(({ cell }) => cell.sequenceTile!.step === step)
              .map(({ r, c }) => of.get(`${r},${c}`)!)
          )
      )
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
          const advance = after === progressState(walked + 1) && tileRegions[walked].has(entered)
          const spoil =
            /^\d+$/.test(before) &&
            Array.from({ length: n - walked - 1 }, (_, j) => walked + 1 + j).some(
              wrong => after === spoiledState(walked, wrong) && tileRegions[wrong].has(entered)
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
        {
          type: "sequenceTileNotPlaced",
          id: "plates",
          step: 0,
          reason: "no free node of annex stands on its way in from hall",
        },
        { type: "regionsNotJoined", between: ["hall", "annex"] },
        { type: "layoutNotFound" },
      ],
    })
  })

  it("refuses a floor needing more distinct glyphs than exist, naming the tile left without one", () => {
    expect(assembleFloor("test", tooManyTilesSequenceFloor(), SEEDS[0])).toEqual({
      success: false,
      reasons: [{ type: "marksExhausted", ids: [`plates#${MARK_GLYPHS.length - 1}`] }],
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

// A switch fills a junction the floor reserves with `forks`, so standing one there may not move the carve: the
// tiles go where they go whether or not a switch has shut that junction's ways out.
describe("a sequence over off-route regions, on a floor that reserves a fork", () => {
  const make = twoAnnexSequenceFloor
  const reEnterable: ResolveEncounter = (encounter, tag) => ({
    ...defaultResolveEncounter(encounter, tag),
    reEnterable: true,
  })
  const walls = (grid: FloorGrid) =>
    grid.cells.flat().map(cell => (cell.type === "empty" ? "" : [...cell.dirs].sort().join("")))
  const tileCells = (grid: FloorGrid) => tilesOf(grid).map(({ r, c }) => `${r},${c}`)

  const pairs = SEEDS.flatMap(seed => {
    const withForks = { ...make(), forks: [{ exits: 2, count: 1 }] }
    const without = assembleFloor("test", withForks, seed, reEnterable)
    const switched = assembleFloor(
      "test",
      { ...withForks, switches: { encounter: "lightbeamSwitch", min: 1, max: 1 } },
      seed,
      reEnterable
    )
    return without.success ? [{ seed, without, switched }] : []
  })

  it("carves on at least one seed", () => {
    expect(pairs.length).toBeGreaterThan(0)
  })

  it("carves the same walls and stands the same tiles with a switch in the fork", () => {
    for (const { seed, without, switched } of pairs) {
      if (!without.success) continue
      expect(switched.success ? [] : switched.reasons, `seed ${seed}`).toEqual([])
      if (!switched.success) continue
      expect(walls(switched.grid), `seed ${seed}`).toEqual(walls(without.grid))
      expect(tileCells(switched.grid), `seed ${seed}`).toEqual(tileCells(without.grid))
    }
  })
})
