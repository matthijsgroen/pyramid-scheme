import { describe, expect, it } from "vitest"
import { walkFloorLock } from "./floorLockWalk"
import { parseLock } from "./lockNotation"
import { assembleFloor } from "./siteAssembler"
import type { AssembleFloorKeyRequirements } from "./siteAssembler"
import type { Direction, FloorConfig, FloorGrid, GridCell } from "./siteTypes"
import { BINDING } from "./testSupport/lockFixtures"
import { TOPOLOGY_OFF, dirsOf } from "./testSupport/modOff"
import { resolveEncounterMeta } from "@/mods/allFamilyMeta"
import { lineRooms, webDoorLeaks } from "./webDoors"
import type { PlacedLockWeb, WebDoorPlacement } from "./webDoors"
import { potKey, webKey } from "./webLine"

const floorOf = (extra: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 3,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [{ pathPuzzles: 1, difficulty: "expert", end: "treasure" }],
  ...extra,
})

const SEEDS = Array.from({ length: 12 }, (_, n) => (n + 1) * 7919)

/** The first seed both configs carve at, and the two grids. */
const carvePair = (
  a: FloorConfig,
  b: FloorConfig,
  more: AssembleFloorKeyRequirements = {}
): { a: FloorGrid; b: FloorGrid } => {
  for (const seed of SEEDS) {
    const one = assembleFloor("web", a, seed, resolveEncounterMeta, {
      floorRef: { journeyId: "web", floorIndex: 0 },
      ...more,
    })
    const two = assembleFloor("web", b, seed, resolveEncounterMeta, {
      floorRef: { journeyId: "web", floorIndex: 0 },
      ...more,
    })
    if (one.success && two.success) return { a: one.grid, b: two.grid }
  }
  throw new Error("no seed carves both")
}

const cellsAsking = (grid: FloorGrid, key: string) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type === "room" && (cell.requiredKeyId === key || cell.requiredKeyIds?.includes(key))
        ? [{ cell, at: [r, c] as const }]
        : []
    )
  )

const anyWebKey = (grid: FloorGrid) =>
  grid.cells.some(row =>
    row.some(
      cell =>
        cell.type === "room" && [cell.requiredKeyId, ...(cell.requiredKeyIds ?? [])].some(id => id?.startsWith("web:"))
    )
  )

const lockFloor = (lines: string[], web?: PlacedLockWeb) =>
  floorOf({
    pathPuzzles: 1,
    locks: [{ lock: parseLock(lines.join("\n"), "L").lock, ...(web ? { web } : {}) }],
    realisations: BINDING,
  })

const MOON = webKey("moon")

describe("web doors on ground no lock owns", () => {
  it("lays a stop's door before the main path's next room, asking for the pot's key, and moves no wall", () => {
    const door: WebDoorPlacement = { key: potKey("w1p1", 2), at: { seam: 1 } }
    const { a: plain, b: laid } = carvePair(floorOf(), floorOf({ webDoors: [door] }))
    expect(dirsOf(laid)).toBe(dirsOf(plain))
    const asking = cellsAsking(laid, potKey("w1p1", 2))
    expect(asking).toHaveLength(1)
    const [r, c] = asking[0].at
    const next = lineRooms(laid, "main")[2]
    const beside = (["n", "s", "e", "w"] as Direction[]).some(
      dir => r + { n: -1, s: 1, e: 0, w: 0 }[dir] === next[0] && c + { n: 0, s: 0, e: 1, w: -1 }[dir] === next[1]
    )
    expect(beside).toBe(true)
    expect(webDoorLeaks(laid)).toEqual([])
  })

  it("lays a door at a side section's mouth", () => {
    const { b: laid } = carvePair(floorOf(), floorOf({ webDoors: [{ key: webKey("ankh"), at: { mouth: "s0" } }] }))
    const asking = cellsAsking(laid, webKey("ankh"))
    expect(asking.map(({ cell }) => cell.sectionAddress)).toEqual(["s0"])
    expect(webDoorLeaks(laid)).toEqual([])
  })
})

describe("web doors a lock's inputs own", () => {
  it("lays a door from -[A]- bound to moon asking for web:moon, on the walls of the lock without the input", () => {
    const { a: open, b: laid } = carvePair(
      lockFloor(["in -- hall", "hall -- out", "in ?", "hall ?", "out ?"]),
      lockFloor(["A outside", "in -[A]- hall", "hall -- out", "in ?", "hall ?", "out ?"], { inputs: { A: MOON } })
    )
    expect(dirsOf(laid)).toBe(dirsOf(open))
    expect(cellsAsking(laid, MOON).length).toBeGreaterThan(0)
    expect(webDoorLeaks(laid)).toEqual([])
    expect(walkFloorLock(laid)).toMatchObject({ sound: true })
  })

  it("adds web:moon to the door of a gate the input shares with a lever", () => {
    const { b: laid } = carvePair(
      lockFloor(["in -[K]- hall", "hall -- out", "K toggle @in", "in ?", "hall ?", "out ?"]),
      lockFloor(["A outside", "in -[K+A]- hall", "hall -- out", "K toggle @in", "in ?", "hall ?", "out ?"], {
        inputs: { A: MOON },
      })
    )
    const asking = cellsAsking(laid, MOON)
    expect(asking).toHaveLength(1)
    expect(asking[0].cell.requiredKeyId).toMatch(/^obstacle:/)
  })

  it("bars every way into a region an input buries", () => {
    const { b: laid } = carvePair(
      lockFloor(["in -- hall", "hall -- out", "in ?", "hall ?", "out ?"]),
      lockFloor(["A outside", "in -- hall", "hall -- out", "hall -[A]", "in ?", "hall ?", "out ?"], {
        inputs: { A: MOON },
      })
    )
    const asking = cellsAsking(laid, MOON)
    expect(asking.length).toBeGreaterThan(0)
    expect(asking.every(({ cell }) => cell.regionBarrier?.region === "L.hall")).toBe(true)
    expect(webDoorLeaks(laid)).toEqual([])
    expect(walkFloorLock(laid)).toMatchObject({ sound: true })
  })

  it("lays the owner a stop added on a lock corridor, from the lock as authored", () => {
    const { b: laid } = carvePair(
      lockFloor(["in -- hall", "hall -- out", "in ?", "hall ?", "out ?"]),
      lockFloor(["in -- hall", "hall -- out", "in ?", "hall ?", "out ?"], {
        inputs: { W1: potKey("w3", 1) },
        fronts: [{ input: "W1", corridor: ["in", "hall"] }],
      })
    )
    expect(cellsAsking(laid, potKey("w3", 1)).length).toBeGreaterThan(0)
  })
})

describe("with the topology mod off", () => {
  it("leaves every web door an open corridor, on the same walls", () => {
    const configs = [
      floorOf({ webDoors: [{ key: potKey("w1p1", 1), at: { seam: 0 } }] }),
      lockFloor(["A outside", "in -[A]- hall", "hall -- out", "hall -[A]", "in ?", "hall ?", "out ?"], {
        inputs: { A: MOON },
      }),
    ]
    for (const config of configs) {
      const { a: on, b: off } = carvePair(config, config, {})
      const offGrid = assembleFloorOff(config, on)
      expect(anyWebKey(on)).toBe(true)
      expect(anyWebKey(offGrid)).toBe(false)
      expect(dirsOf(offGrid)).toBe(dirsOf(off))
    }
  })
})

/** The same floor assembled as the build stands with the topology mod removed, at the seed `on` carved at. */
const assembleFloorOff = (config: FloorConfig, on: FloorGrid): FloorGrid => {
  for (const seed of SEEDS) {
    const onAgain = assembleFloor("web", config, seed, resolveEncounterMeta, {
      floorRef: { journeyId: "web", floorIndex: 0 },
    })
    if (!onAgain.success || dirsOf(onAgain.grid) !== dirsOf(on)) continue
    const off = assembleFloor("web", config, seed, TOPOLOGY_OFF.resolveEncounter, {
      floorRef: { journeyId: "web", floorIndex: 0 },
      resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
      resolveRegionBarrier: TOPOLOGY_OFF.resolveRegionBarrier,
      resolvePassage: TOPOLOGY_OFF.resolvePassage,
    })
    if (off.success) return off.grid
  }
  throw new Error("the floor does not carve with the mod off")
}

describe("a web door the floor walks round", () => {
  it("is named", () => {
    // A ring: the entrance, two ways round to the exit, a web door on one of them.
    const dirs = (...d: Direction[]) => new Set(d)
    const ground = (d: ReadonlySet<Direction>): GridCell => ({ type: "corridor", dirs: d, state: "fogged" })
    const cells: GridCell[][] = [
      [ground(dirs("e", "s")), ground(dirs("e", "w")), ground(dirs("w", "s"))],
      [
        ground(dirs("n", "s")),
        { type: "empty" },
        { type: "room", roomType: "encounter", dirs: dirs("n", "s"), state: "fogged", requiredKeyId: MOON },
      ],
      [ground(dirs("n", "e")), ground(dirs("e", "w")), ground(dirs("w", "n"))],
    ]
    const grid: FloorGrid = {
      cells,
      rows: 3,
      cols: 3,
      entrancePos: [0, 0],
      exitPos: [2, 2],
      siteId: "ring",
      staircases: {},
    }
    expect(webDoorLeaks(grid)).toEqual([`${MOON} at 1,2: the floor walks round it`])
  })
})
